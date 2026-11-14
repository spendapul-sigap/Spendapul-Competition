import type { IncomingMessage, ServerResponse } from 'node:http';

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count += 1;
  return true;
}

function sendJson(res: ServerResponse, status: number, payload: unknown, cacheControl?: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (cacheControl) {
    res.setHeader('Cache-Control', cacheControl);
  }
  res.end(JSON.stringify(payload));
}

function fail(res: ServerResponse, code: string, message: string, status = 400) {
  return sendJson(res, status, { ok: false, data: null, error: { code, message }, ts: Date.now() });
}

function getClientIp(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function extractBearerToken(req: IncomingMessage): string {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

async function readRawBody(req: IncomingMessage, maxBytes = 4_500_000): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      throw new Error('PAYLOAD_TOO_LARGE');
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

const GET_ACTION_MAP: Record<string, { action: string; cache?: string }> = {
  'config-public': { action: 'config_public', cache: 's-maxage=60, stale-while-revalidate=120' },
  content: { action: 'content', cache: 's-maxage=180, stale-while-revalidate=300' },
  'peserta-public': { action: 'peserta_public', cache: 's-maxage=60, stale-while-revalidate=120' },
  bracket: { action: 'bracket', cache: 's-maxage=30, stale-while-revalidate=60' },
  hasil: { action: 'hasil', cache: 's-maxage=120, stale-while-revalidate=240' },
  'auth/me': { action: 'me' },
  'internal/stats': { action: 'stats' },
  'internal/to': { action: 'list_to' },
  'internal/ml': { action: 'list_ml' },
  'internal/hasil-to': { action: 'list_hasil_to' },
  'admin/users': { action: 'user_list' },
  'admin/logs': { action: 'log_list' },
  'admin/backup': { action: 'backup' },
};

const POST_ACTION_MAP: Record<string, string> = {
  'register-to': 'register_to',
  'register-ml': 'register_ml',
  'cek-status': 'cek_status',
  'auth/login': 'login',
  'auth/logout': 'logout',
  'internal/verify': 'verify',
  'internal/reject': 'reject',
  'internal/checkin': 'checkin',
  'internal/skor': 'input_skor',
  'internal/match': 'update_match',
  'admin/config': 'config_update',
  'admin/juknis-pdf/upsert': 'upsert_juknis_slot',
  'admin/juknis-pdf/delete': 'delete_juknis_pdf',
  'admin/content/upsert': 'content_upsert',
  'admin/content/delete': 'content_delete',
  'admin/users/create': 'user_create',
  'admin/users/update': 'user_update',
};

function mapGasErrorStatus(code?: string): number {
  if (!code) return 400;
  if (code === 'UNAUTHORIZED' || code === 'SESSION_EXPIRED' || code === 'INVALID_CREDENTIALS') return 401;
  if (code === 'FORBIDDEN' || code === 'FORBIDDEN_PROXY' || code === 'ACCOUNT_DISABLED') return 403;
  if (code === 'NOT_FOUND') return 404;
  if (code === 'RATE_LIMIT') return 429;
  return 400;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const gasUrl = process.env.GAS_URL;
  const proxyKey = process.env.PROXY_KEY || '';

  if (!gasUrl) {
    return fail(
      res,
      'MISSING_GAS_URL',
      'Environment variable GAS_URL belum diatur di Vercel.',
      500,
    );
  }

  const parsedUrl = new URL(req.url || '/', 'https://vercel.local');
  const routeParam = parsedUrl.searchParams.get('route');
  const route = (routeParam ?? parsedUrl.pathname.replace(/^\/api\/?/, '')).replace(/^\/+|\/+$/g, '');
  const method = (req.method || 'GET').toUpperCase();
  const token = extractBearerToken(req);
  const ip = getClientIp(req);

  try {
    // 1. Streaming file Juknis PDF dari Google Drive via GAS
    if (method === 'GET' && route.startsWith('juknis-pdf/')) {
      const fileSegment = route.slice('juknis-pdf/'.length);
      const isDownload =
        parsedUrl.searchParams.get('download') === '1' ||
        parsedUrl.searchParams.get('download') === 'true';

      const target = new URL(gasUrl);
      target.searchParams.set('action', 'juknis_pdf');
      target.searchParams.set('file', fileSegment);
      if (proxyKey) target.searchParams.set('proxy_key', proxyKey);

      const gasRes = await fetch(target.toString(), { method: 'GET', redirect: 'follow' });
      const gasJson = (await gasRes.json().catch(() => null)) as {
        ok: boolean;
        data?: { file_name?: string; base64?: string; redirect_url?: string };
        error?: { code?: string; message?: string };
      } | null;

      if (!gasJson?.ok || !gasJson.data) {
        return fail(
          res,
          gasJson?.error?.code || 'NOT_FOUND',
          gasJson?.error?.message || 'File Juknis PDF tidak ditemukan.',
          mapGasErrorStatus(gasJson?.error?.code),
        );
      }

      if (gasJson.data.redirect_url) {
        res.statusCode = 302;
        res.setHeader('Location', gasJson.data.redirect_url);
        res.end();
        return;
      }

      const fileName = (gasJson.data.file_name || 'juknis.pdf').replace(/["\r\n]/g, '');
      const pdfBuf = Buffer.from(gasJson.data.base64 || '', 'base64');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `${isDownload ? 'attachment' : 'inline'}; filename="${fileName}"`,
      );
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      res.end(pdfBuf);
      return;
    }

    // 2. Upload file Juknis PDF biner -> kirim base64 ke GAS Drive
    if (method === 'POST' && route === 'admin/juknis-pdf/upload') {
      let rawBuf: Buffer;
      try {
        rawBuf = await readRawBody(req, 4_200_000);
      } catch (e) {
        if (e instanceof Error && e.message === 'PAYLOAD_TOO_LARGE') {
          return fail(
            res,
            'FILE_TOO_LARGE',
            'Ukuran upload PDF melalui proxy Vercel maksimal 4 MB. Kompres PDF terlebih dahulu jika lebih besar.',
            413,
          );
        }
        throw e;
      }

      const payload = {
        action: 'upload_juknis_pdf',
        proxy_key: proxyKey,
        token,
        id: parsedUrl.searchParams.get('id') || '',
        label: parsedUrl.searchParams.get('label') || '',
        kegiatan: parsedUrl.searchParams.get('kegiatan') || 'umum',
        filename: parsedUrl.searchParams.get('filename') || 'juknis.pdf',
        base64: rawBuf.toString('base64'),
      };

      const gasRes = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });
      const gasJson = await gasRes.json().catch(() => null);
      if (!gasJson) return fail(res, 'GAS_BAD_RESPONSE', 'Respons GAS tidak valid.', 502);
      return sendJson(res, gasJson.ok ? 200 : mapGasErrorStatus(gasJson.error?.code), gasJson);
    }

    // 3. Ekspor CSV / Backup JSON
    if (method === 'GET' && (route.startsWith('admin/export/') || route === 'admin/backup')) {
      const target = new URL(gasUrl);
      if (route.startsWith('admin/export/')) {
        target.searchParams.set('action', 'export');
        target.searchParams.set('type', route.slice('admin/export/'.length));
      } else {
        target.searchParams.set('action', 'backup');
      }
      if (proxyKey) target.searchParams.set('proxy_key', proxyKey);
      if (token) target.searchParams.set('token', token);

      const gasRes = await fetch(target.toString(), { method: 'GET', redirect: 'follow' });
      const gasJson = (await gasRes.json().catch(() => null)) as {
        ok: boolean;
        data?: { filename: string; mime_type: string; content: string };
        error?: { code?: string; message?: string };
      } | null;

      if (!gasJson?.ok || !gasJson.data) {
        return fail(
          res,
          gasJson?.error?.code || 'EXPORT_FAILED',
          gasJson?.error?.message || 'Gagal mengunduh berkas ekspor.',
          mapGasErrorStatus(gasJson?.error?.code),
        );
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', gasJson.data.mime_type || 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${gasJson.data.filename}"`);
      res.end(gasJson.data.content || '');
      return;
    }

    // 4. DELETE registrasi (/api/admin/registrasi/:type/:reg_code)
    if (method === 'DELETE' && route.startsWith('admin/registrasi/')) {
      const parts = route.slice('admin/registrasi/'.length).split('/');
      const type = parts[0] || '';
      const reg_code = decodeURIComponent(parts[1] || '');
      const gasRes = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_registrasi',
          proxy_key: proxyKey,
          token,
          type,
          reg_code,
        }),
        redirect: 'follow',
      });
      const gasJson = await gasRes.json().catch(() => null);
      if (!gasJson) return fail(res, 'GAS_BAD_RESPONSE', 'Respons GAS tidak valid.', 502);
      return sendJson(res, gasJson.ok ? 200 : mapGasErrorStatus(gasJson.error?.code), gasJson);
    }

    // 5. Standard GET endpoints
    if (method === 'GET' && GET_ACTION_MAP[route]) {
      const mapping = GET_ACTION_MAP[route];
      const target = new URL(gasUrl);
      target.searchParams.set('action', mapping.action);
      if (proxyKey) target.searchParams.set('proxy_key', proxyKey);
      if (token) target.searchParams.set('token', token);

      const gasRes = await fetch(target.toString(), { method: 'GET', redirect: 'follow' });
      const gasJson = await gasRes.json().catch(() => null);
      if (!gasJson) return fail(res, 'GAS_BAD_RESPONSE', 'Respons GAS tidak valid.', 502);

      return sendJson(
        res,
        gasJson.ok ? 200 : mapGasErrorStatus(gasJson.error?.code),
        gasJson,
        gasJson.ok ? mapping.cache : undefined,
      );
    }

    // 6. Standard POST endpoints
    if (method === 'POST' && POST_ACTION_MAP[route]) {
      if ((route === 'register-to' || route === 'register-ml') && !checkRateLimit(`reg:${ip}`, 12, 60_000)) {
        return fail(res, 'RATE_LIMIT', 'Terlalu banyak percobaan pendaftaran. Tunggu 1 menit.', 429);
      }
      if (route === 'auth/login' && !checkRateLimit(`login:${ip}`, 20, 60_000)) {
        return fail(res, 'RATE_LIMIT', 'Terlalu banyak percobaan login.', 429);
      }

      const rawBuf = await readRawBody(req, 4_200_000);
      const bodyObj = rawBuf.length > 0 ? JSON.parse(rawBuf.toString('utf-8')) : {};
      const action = POST_ACTION_MAP[route];

      const gasPayload =
        action === 'config_update'
          ? { action, proxy_key: proxyKey, token, patch: bodyObj }
          : { ...bodyObj, action, proxy_key: proxyKey, token };

      const gasRes = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gasPayload),
        redirect: 'follow',
      });
      const gasJson = await gasRes.json().catch(() => null);
      if (!gasJson) return fail(res, 'GAS_BAD_RESPONSE', 'Respons GAS tidak valid.', 502);

      const okStatus = action === 'register_to' || action === 'register_ml' || action === 'user_create' ? 201 : 200;
      return sendJson(res, gasJson.ok ? okStatus : mapGasErrorStatus(gasJson.error?.code), gasJson);
    }

    return fail(res, 'NOT_FOUND', `Endpoint /api/${route} tidak ditemukan.`, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada proxy Vercel.';
    return fail(res, 'PROXY_ERROR', message, 502);
  }
}
