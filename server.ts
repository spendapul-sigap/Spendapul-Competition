import crypto from 'crypto';
import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import gasProxyHandler from './api/proxy';
import {
  addAuditLog,
  hashPassword,
  hashToken,
  JUKNIS_UPLOAD_DIR,
  loadDb,
  normalizeWa,
  sanitizeCell,
  withDbLock,
  type StoredSession,
} from './server/db';
import type {
  AnggotaML,
  DashboardStats,
  EventConfig,
  JuknisPdfFile,
  KegiatanType,
  MatchML,
  PesertaTO,
  PublicConfig,
  TimML,
  UserRole,
} from './src/types/spendapul';

const PORT = 3000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours per DESIGN.md

// Simple in-memory rate limit per IP for registration & login
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

function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ ok: true, data, error: null, ts: Date.now() });
}

function fail(res: Response, code: string, message: string, status = 400) {
  return res.status(status).json({ ok: false, data: null, error: { code, message }, ts: Date.now() });
}

function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts
    .map((p) => {
      if (p.length <= 2) return `${p[0] ?? ''}*`;
      return `${p.slice(0, 2)}${'*'.repeat(Math.min(4, p.length - 2))}`;
    })
    .join(' ');
}

interface AuthedRequest extends Request {
  userSession?: StoredSession;
}

function requireAuth(allowedRoles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return fail(res, 'UNAUTHORIZED', 'Silakan login terlebih dahulu.', 401);
    }
    const db = loadDb();
    const tokenHash = hashToken(token);
    const now = Date.now();
    const session = db.sessions.find((s) => s.token_hash === tokenHash && s.expires_at > now);
    if (!session) {
      return fail(res, 'SESSION_EXPIRED', 'Sesi login telah berakhir. Silakan login kembali.', 401);
    }
    const account = db.users.find((u) => u.username === session.username && u.aktif);
    if (!account) {
      return fail(res, 'ACCOUNT_DISABLED', 'Akun telah dinonaktifkan.', 403);
    }
    if (!allowedRoles.includes(account.role)) {
      return fail(res, 'FORBIDDEN', 'Anda tidak memiliki izin untuk mengakses fitur Admin ini.', 403);
    }
    req.userSession = session;
    next();
  };
}

function assignRoomAndSeat(db: ReturnType<typeof loadDb>): { no_peserta: string; ruang: string } {
  const verifiedCount = db.peserta_to.filter((p) => p.status === 'VERIFIED' && p.no_peserta).length;
  const capacity = Math.max(10, db.config.to_room_capacity || 25);
  const nextIndex = verifiedCount + 1;
  const roomNum = Math.ceil(nextIndex / capacity);
  const seatInRoom = ((nextIndex - 1) % capacity) + 1;
  return {
    no_peserta: `${String(roomNum).padStart(2, '0')}-${String(seatInRoom).padStart(3, '0')}`,
    ruang: `Ruang ${roomNum}`,
  };
}

function toCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

async function startServer() {
  const app = express();

  if (process.env.GAS_URL) {
    app.all('/api/*', (req, res) => {
      gasProxyHandler(req, res);
    });
  }

  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  app.use(express.json({ limit: '6mb' }));

  // Ensure DB initialized
  loadDb();

  // ==================== PUBLIC ENDPOINTS ====================

  app.get('/api/config-public', (_req, res) => {
    const db = loadDb();
    const activeTo = db.peserta_to.filter((p) => p.status !== 'REJECTED').length;
    const verifiedTo = db.peserta_to.filter((p) => p.status === 'VERIFIED').length;
    const activeMl = db.tim_ml.filter((t) => t.status !== 'REJECTED').length;
    const verifiedMl = db.tim_ml.filter((t) => t.status === 'VERIFIED').length;

    const payload: PublicConfig = {
      ...db.config,
      count_to_active: activeTo,
      count_to_verified: verifiedTo,
      count_ml_active: activeMl,
      count_ml_verified: verifiedMl,
      remaining_to: Math.max(0, db.config.quota_to - activeTo),
      remaining_ml: Math.max(0, db.config.quota_ml - activeMl),
    };
    return ok(res, payload);
  });

  app.get('/api/content', (_req, res) => {
    const db = loadDb();
    return ok(res, {
      pengumuman: [...db.pengumuman]
        .filter((p) => p.published)
        .sort((a, b) => (a.pinned === b.pinned ? b.tanggal.localeCompare(a.tanggal) : a.pinned ? -1 : 1)),
      jadwal: db.jadwal,
      juknis: [...db.juknis].sort((a, b) => a.urutan - b.urutan),
      faq: [...db.faq].sort((a, b) => a.urutan - b.urutan),
      hadiah: db.hadiah,
      sponsor: db.sponsor,
      galeri: db.galeri,
    });
  });

  app.get('/api/juknis-pdf/:storedName', (req, res) => {
    const rawName = String(req.params.storedName || '');
    const safeName = path.basename(rawName);
    if (!/^[a-zA-Z0-9._-]+\.pdf$/i.test(safeName)) {
      return fail(res, 'INVALID_FILE', 'Nama file PDF tidak valid.', 400);
    }
    const filePath = path.join(JUKNIS_UPLOAD_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      return fail(res, 'NOT_FOUND', 'File Juknis PDF tidak ditemukan.', 404);
    }
    const db = loadDb();
    const matched = (db.config.juknis_pdfs || []).find((j) => j.file_url.endsWith(`/${safeName}`));
    const displayFileName = (matched?.file_name || safeName).replace(/["\r\n]/g, '');
    const isDownload = req.query.download === '1' || req.query.download === 'true';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${displayFileName}"`);
    return res.sendFile(filePath);
  });

  app.get('/api/peserta-public', (_req, res) => {
    const db = loadDb();
    const to = db.peserta_to
      .filter((p) => p.status === 'VERIFIED')
      .map((p) => ({
        reg_code: p.reg_code,
        nama_samaran: maskName(p.nama_lengkap),
        asal_sd: p.asal_sd,
        no_peserta: p.no_peserta,
        ruang: p.ruang,
      }));
    const ml = db.tim_ml
      .filter((t) => t.status === 'VERIFIED')
      .map((t) => ({
        reg_code: t.reg_code,
        nama_tim: t.nama_tim,
        asal_sekolah: t.asal_sekolah,
        seed: t.seed || 'Terdaftar',
        jumlah_pemain: db.anggota_ml.filter((a) => a.reg_code === t.reg_code).length,
      }));
    return ok(res, { to, ml });
  });

  app.get('/api/bracket', (_req, res) => {
    const db = loadDb();
    return ok(res, db.match_ml);
  });

  app.get('/api/hasil', (_req, res) => {
    const db = loadDb();
    if (!db.config.show_hasil) {
      return ok(res, {
        published: false,
        hasil_to: [],
        juara_ml: [],
      });
    }
    const sortedTo = [...db.hasil_to].sort((a, b) => a.ranking - b.ranking);
    const finalMatch = db.match_ml.find((m) => m.babak.toLowerCase().includes('final') && m.status === 'Selesai');
    return ok(res, {
      published: true,
      hasil_to: sortedTo,
      juara_ml: finalMatch
        ? [
            { peringkat: 'Juara 1', nama_tim: finalMatch.pemenang },
            {
              peringkat: 'Juara 2',
              nama_tim: finalMatch.pemenang === finalMatch.tim_a ? finalMatch.tim_b : finalMatch.tim_a,
            },
          ]
        : [],
    });
  });

  app.post('/api/register-to', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`reg_to:${ip}`, 10, 60_000)) {
      return fail(res, 'RATE_LIMIT', 'Terlalu banyak percobaan pendaftaran. Tunggu 1 menit.', 429);
    }

    const body = req.body ?? {};
    if (body.website_hp) {
      return fail(res, 'BOT_DETECTED', 'Permintaan ditolak oleh sistem anti-spam.', 400);
    }

    const nama_lengkap = sanitizeCell(body.nama_lengkap);
    const asal_sd = sanitizeCell(body.asal_sd);
    const kelas = sanitizeCell(body.kelas || '6');
    const nisn = sanitizeCell(body.nisn).replace(/\D/g, '');
    const nama_ortu = sanitizeCell(body.nama_ortu);
    const wa_ortu = normalizeWa(body.wa_ortu);
    const jenis_kelamin = body.jenis_kelamin === 'P' ? 'P' : 'L';
    const tempat_lahir = sanitizeCell(body.tempat_lahir);
    const tgl_lahir = sanitizeCell(body.tgl_lahir);
    const email = sanitizeCell(body.email);
    const alamat = sanitizeCell(body.alamat);
    const persetujuan = Boolean(body.persetujuan);
    const idempotency_key = String(body.idempotency_key || '').trim();

    if (!nama_lengkap || !asal_sd || !nisn || !nama_ortu || wa_ortu.length < 10 || !persetujuan) {
      return fail(res, 'VALIDATION_ERROR', 'Mohon lengkapi seluruh kolom wajib dan centang persetujuan orang tua/wali.', 400);
    }

    try {
      const created = await withDbLock((db) => {
        if (idempotency_key && db.idempotency[idempotency_key]) {
          const existing = db.peserta_to.find((p) => p.reg_code === db.idempotency[idempotency_key].reg_code);
          if (existing) return existing;
        }
        if (!db.config.reg_to_open) {
          throw new Error('CLOSED:Pendaftaran Try Out TKA SD saat ini sedang ditutup.');
        }
        if (new Date() > new Date(db.config.reg_to_deadline)) {
          throw new Error('DEADLINE:Batas waktu pendaftaran Try Out telah berakhir.');
        }
        const activeCount = db.peserta_to.filter((p) => p.status !== 'REJECTED').length;
        if (activeCount >= db.config.quota_to) {
          throw new Error('QUOTA_FULL:Kuota peserta Try Out TKA SD sudah penuh.');
        }
        const dupNisn = db.peserta_to.find((p) => p.nisn === nisn && p.status !== 'REJECTED');
        if (dupNisn) {
          throw new Error(`DUPLICATE_NISN:NISN ${nisn} sudah terdaftar dengan kode ${dupNisn.reg_code}.`);
        }

        db.counters.to += 1;
        const reg_code = `TO-${String(db.counters.to).padStart(4, '0')}`;
        const entry: PesertaTO = {
          reg_code,
          timestamp: new Date().toISOString(),
          nama_lengkap,
          jenis_kelamin,
          asal_sd,
          kelas,
          nisn,
          tempat_lahir,
          tgl_lahir,
          nama_ortu,
          wa_ortu,
          email,
          alamat,
          persetujuan,
          status: 'PENDING',
          catatan: '',
          no_peserta: '',
          ruang: '',
          checkin_at: null,
          verified_by: null,
          verified_at: null,
        };
        db.peserta_to.unshift(entry);
        if (idempotency_key) {
          db.idempotency[idempotency_key] = { reg_code, ts: Date.now() };
        }
        addAuditLog(db, 'publik', 'REGISTER_TO', reg_code, `${nama_lengkap} (${asal_sd})`);
        return entry;
      });
      return ok(res, created, 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mendaftar.';
      const [code, detail] = msg.includes(':') ? msg.split(':', 2) : ['REGISTER_FAILED', msg];
      return fail(res, code, detail, 400);
    }
  });

  app.post('/api/register-ml', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`reg_ml:${ip}`, 10, 60_000)) {
      return fail(res, 'RATE_LIMIT', 'Terlalu banyak percobaan pendaftaran. Tunggu 1 menit.', 429);
    }

    const body = req.body ?? {};
    if (body.website_hp) {
      return fail(res, 'BOT_DETECTED', 'Permintaan ditolak oleh sistem anti-spam.', 400);
    }

    const nama_tim = sanitizeCell(body.nama_tim);
    const asal_sekolah = sanitizeCell(body.asal_sekolah);
    const nama_kapten = sanitizeCell(body.nama_kapten);
    const wa_kapten = normalizeWa(body.wa_kapten);
    const email = sanitizeCell(body.email);
    const logo_url = typeof body.logo_url === 'string' && body.logo_url.length < 2_500_000 ? body.logo_url : '';
    const persetujuan = Boolean(body.persetujuan);
    const idempotency_key = String(body.idempotency_key || '').trim();
    const rawMembers = Array.isArray(body.anggota) ? body.anggota : [];

    if (!nama_tim || !asal_sekolah || !nama_kapten || wa_kapten.length < 10 || !persetujuan) {
      return fail(res, 'VALIDATION_ERROR', 'Lengkapi identitas tim, kontak WhatsApp kapten, dan persetujuan.', 400);
    }

    const utama = rawMembers.filter((m: AnggotaML) => m.peran === 'Utama');
    if (utama.length < 5) {
      return fail(res, 'VALIDATION_ERROR', 'Wajib mengisi 5 pemain utama beserta ID ML & Server ID.', 400);
    }

    const cleanedMembers = rawMembers
      .filter((m: AnggotaML) => m.nama_lengkap && m.id_ml && m.server_id)
      .slice(0, 6)
      .map((m: AnggotaML, idx: number) => ({
        member_id: `M-${Date.now()}-${idx}`,
        reg_code: '',
        peran: m.peran === 'Cadangan' ? ('Cadangan' as const) : ('Utama' as const),
        nama_lengkap: sanitizeCell(m.nama_lengkap),
        nickname_ingame: sanitizeCell(m.nickname_ingame || m.nama_lengkap),
        id_ml: sanitizeCell(m.id_ml).replace(/\D/g, ''),
        server_id: sanitizeCell(m.server_id).replace(/\D/g, ''),
        kelas: sanitizeCell(m.kelas || '-'),
        kartu_pelajar_url:
          typeof m.kartu_pelajar_url === 'string' && m.kartu_pelajar_url.length < 2_500_000
            ? m.kartu_pelajar_url
            : '',
      }));

    if (cleanedMembers.filter((m: AnggotaML) => m.peran === 'Utama').length < 5) {
      return fail(res, 'VALIDATION_ERROR', 'Data 5 pemain utama (nama, ID ML, Server ID) belum lengkap.', 400);
    }

    const localIds = cleanedMembers.map((m: AnggotaML) => m.id_ml);
    if (new Set(localIds).size !== localIds.length) {
      return fail(res, 'DUPLICATE_ID_LOCAL', 'Terdapat ID Mobile Legends yang sama dalam satu tim.', 400);
    }

    try {
      const created = await withDbLock((db) => {
        if (idempotency_key && db.idempotency[idempotency_key]) {
          const existing = db.tim_ml.find((t) => t.reg_code === db.idempotency[idempotency_key].reg_code);
          if (existing) {
            return {
              ...existing,
              anggota: db.anggota_ml.filter((a) => a.reg_code === existing.reg_code),
            };
          }
        }
        if (!db.config.reg_ml_open) {
          throw new Error('CLOSED:Pendaftaran Mobile Legends saat ini sedang ditutup.');
        }
        if (new Date() > new Date(db.config.reg_ml_deadline)) {
          throw new Error('DEADLINE:Batas waktu pendaftaran Mobile Legends telah berakhir.');
        }
        const activeTeams = db.tim_ml.filter((t) => t.status !== 'REJECTED').length;
        if (activeTeams >= db.config.quota_ml) {
          throw new Error('QUOTA_FULL:Kuota tim Mobile Legends sudah penuh.');
        }
        const dupTeam = db.tim_ml.find(
          (t) => t.nama_tim.toLowerCase() === nama_tim.toLowerCase() && t.status !== 'REJECTED',
        );
        if (dupTeam) {
          throw new Error(`DUPLICATE_TEAM:Nama tim "${nama_tim}" sudah terdaftar.`);
        }

        const activeTeamCodes = new Set(db.tim_ml.filter((t) => t.status !== 'REJECTED').map((t) => t.reg_code));
        for (const m of cleanedMembers) {
          const conflict = db.anggota_ml.find((existing) => activeTeamCodes.has(existing.reg_code) && existing.id_ml === m.id_ml);
          if (conflict) {
            throw new Error(`DUPLICATE_ID_ML:ID ML ${m.id_ml} sudah terdaftar di tim ${conflict.reg_code}.`);
          }
        }

        db.counters.ml += 1;
        const reg_code = `ML-${String(db.counters.ml).padStart(3, '0')}`;
        const teamEntry: Omit<TimML, 'anggota'> = {
          reg_code,
          timestamp: new Date().toISOString(),
          nama_tim,
          asal_sekolah,
          nama_kapten,
          wa_kapten,
          email,
          logo_url,
          persetujuan,
          status: 'PENDING',
          catatan: '',
          seed: '',
          checkin_at: null,
          verified_by: null,
          verified_at: null,
        };
        const membersWithCode = cleanedMembers.map((m: AnggotaML) => ({ ...m, reg_code }));
        db.tim_ml.unshift(teamEntry);
        db.anggota_ml.push(...membersWithCode);
        if (idempotency_key) {
          db.idempotency[idempotency_key] = { reg_code, ts: Date.now() };
        }
        addAuditLog(db, 'publik', 'REGISTER_ML', reg_code, `${nama_tim} (${asal_sekolah})`);
        return { ...teamEntry, anggota: membersWithCode };
      });
      return ok(res, created, 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mendaftar tim.';
      const [code, detail] = msg.includes(':') ? msg.split(':', 2) : ['REGISTER_FAILED', msg];
      return fail(res, code, detail, 400);
    }
  });

  app.post('/api/cek-status', (req, res) => {
    const reg_code = String(req.body?.reg_code || '').trim().toUpperCase();
    const wa = normalizeWa(req.body?.wa || '');
    if (!reg_code || wa.length < 8) {
      return fail(res, 'VALIDATION_ERROR', 'Masukkan Kode Registrasi dan Nomor WhatsApp yang digunakan saat mendaftar.', 400);
    }
    const db = loadDb();
    if (reg_code.startsWith('TO-')) {
      const peserta = db.peserta_to.find((p) => p.reg_code === reg_code && p.wa_ortu === wa);
      if (!peserta) {
        return fail(res, 'NOT_FOUND', 'Data tidak ditemukan. Periksa kembali Kode Registrasi dan nomor WhatsApp.', 404);
      }
      return ok(res, { jenis: 'try-out', peserta });
    }
    if (reg_code.startsWith('ML-')) {
      const tim = db.tim_ml.find((t) => t.reg_code === reg_code && t.wa_kapten === wa);
      if (!tim) {
        return fail(res, 'NOT_FOUND', 'Data tim tidak ditemukan. Periksa kembali Kode Registrasi dan nomor WhatsApp kapten.', 404);
      }
      const anggota = db.anggota_ml.filter((a) => a.reg_code === tim.reg_code);
      return ok(res, { jenis: 'mobile-legends', tim: { ...tim, anggota } });
    }
    return fail(res, 'INVALID_CODE', 'Format Kode Registrasi harus diawali TO- atau ML-.', 400);
  });

  // ==================== AUTH ENDPOINTS ====================

  app.post('/api/auth/login', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`login:${ip}`, 20, 60_000)) {
      return fail(res, 'RATE_LIMIT', 'Terlalu banyak percobaan login.', 429);
    }
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    if (!username || !password) {
      return fail(res, 'VALIDATION_ERROR', 'Username dan password wajib diisi.', 400);
    }

    try {
      const result = await withDbLock((db) => {
        const user = db.users.find((u) => u.username === username);
        if (!user || !user.aktif) {
          throw new Error('INVALID_CREDENTIALS:Username atau password salah.');
        }
        if (user.locked_until && user.locked_until > Date.now()) {
          const secs = Math.ceil((user.locked_until - Date.now()) / 1000);
          throw new Error(`LOCKED:Akun terkunci sementara setelah 5x gagal. Coba lagi dalam ${secs} detik.`);
        }
        const computed = hashPassword(password, user.salt);
        if (computed !== user.password_hash) {
          user.failed_attempts += 1;
          if (user.failed_attempts >= 5) {
            user.locked_until = Date.now() + 60_000;
            user.failed_attempts = 0;
          }
          throw new Error('INVALID_CREDENTIALS:Username atau password salah.');
        }

        user.failed_attempts = 0;
        user.locked_until = null;
        user.last_login = new Date().toISOString();

        const rawToken = crypto.randomBytes(32).toString('hex');
        const session: StoredSession = {
          token_hash: hashToken(rawToken),
          username: user.username,
          role: user.role,
          nama: user.nama,
          expires_at: Date.now() + SESSION_TTL_MS,
        };
        // Clean expired sessions
        db.sessions = db.sessions.filter((s) => s.expires_at > Date.now());
        db.sessions.push(session);
        addAuditLog(db, user.username, 'LOGIN', user.role, 'Masuk ke panel internal');

        return {
          token: rawToken,
          user: {
            username: user.username,
            role: user.role,
            nama: user.nama,
          },
        };
      });
      return ok(res, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login gagal.';
      const [code, detail] = msg.includes(':') ? msg.split(':', 2) : ['LOGIN_FAILED', msg];
      return fail(res, code, detail, 401);
    }
  });

  app.post('/api/auth/logout', requireAuth(['DASHBOARD', 'ADMIN']), async (req: AuthedRequest, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.slice(7).trim();
    const tokenHash = hashToken(token);
    await withDbLock((db) => {
      db.sessions = db.sessions.filter((s) => s.token_hash !== tokenHash);
      if (req.userSession) {
        addAuditLog(db, req.userSession.username, 'LOGOUT', 'SESSION', 'Keluar dari panel internal');
      }
    });
    return ok(res, { logged_out: true });
  });

  app.get('/api/auth/me', requireAuth(['DASHBOARD', 'ADMIN']), (req: AuthedRequest, res) => {
    return ok(res, {
      username: req.userSession!.username,
      role: req.userSession!.role,
      nama: req.userSession!.nama,
    });
  });

  // ==================== INTERNAL DASHBOARD (DASHBOARD + ADMIN) ====================

  app.get('/api/internal/stats', requireAuth(['DASHBOARD', 'ADMIN']), (_req, res) => {
    const db = loadDb();
    const dailyMap = new Map<string, { to: number; ml: number }>();

    for (const p of db.peserta_to) {
      const date = p.timestamp.slice(0, 10);
      const cur = dailyMap.get(date) || { to: 0, ml: 0 };
      cur.to += 1;
      dailyMap.set(date, cur);
    }
    for (const t of db.tim_ml) {
      const date = t.timestamp.slice(0, 10);
      const cur = dailyMap.get(date) || { to: 0, ml: 0 };
      cur.ml += 1;
      dailyMap.set(date, cur);
    }

    const daily_series = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([date, val]) => ({ date, ...val }));

    const stats: DashboardStats = {
      total_to: db.peserta_to.length,
      pending_to: db.peserta_to.filter((p) => p.status === 'PENDING').length,
      verified_to: db.peserta_to.filter((p) => p.status === 'VERIFIED').length,
      rejected_to: db.peserta_to.filter((p) => p.status === 'REJECTED').length,
      checkin_to: db.peserta_to.filter((p) => Boolean(p.checkin_at)).length,
      quota_to: db.config.quota_to,
      total_ml: db.tim_ml.length,
      pending_ml: db.tim_ml.filter((t) => t.status === 'PENDING').length,
      verified_ml: db.tim_ml.filter((t) => t.status === 'VERIFIED').length,
      rejected_ml: db.tim_ml.filter((t) => t.status === 'REJECTED').length,
      checkin_ml: db.tim_ml.filter((t) => Boolean(t.checkin_at)).length,
      quota_ml: db.config.quota_ml,
      daily_series,
    };
    return ok(res, stats);
  });

  app.get('/api/internal/to', requireAuth(['DASHBOARD', 'ADMIN']), (_req, res) => {
    const db = loadDb();
    return ok(res, db.peserta_to);
  });

  app.get('/api/internal/ml', requireAuth(['DASHBOARD', 'ADMIN']), (_req, res) => {
    const db = loadDb();
    const teams: TimML[] = db.tim_ml.map((t) => ({
      ...t,
      anggota: db.anggota_ml.filter((a) => a.reg_code === t.reg_code),
    }));
    return ok(res, teams);
  });

  app.get('/api/internal/hasil-to', requireAuth(['DASHBOARD', 'ADMIN']), (_req, res) => {
    const db = loadDb();
    return ok(res, db.hasil_to);
  });

  app.post('/api/internal/verify', requireAuth(['DASHBOARD', 'ADMIN']), async (req: AuthedRequest, res) => {
    const reg_code = String(req.body?.reg_code || '').trim().toUpperCase();
    const catatan = sanitizeCell(req.body?.catatan || 'Data telah diverifikasi panitia.');
    const customNoPeserta = sanitizeCell(req.body?.no_peserta || '');
    const customRuang = sanitizeCell(req.body?.ruang || '');
    const customSeed = sanitizeCell(req.body?.seed || '');
    const actor = req.userSession!.username;

    try {
      const updated = await withDbLock((db) => {
        if (reg_code.startsWith('TO-')) {
          const p = db.peserta_to.find((item) => item.reg_code === reg_code);
          if (!p) throw new Error('NOT_FOUND:Peserta tidak ditemukan.');
          p.status = 'VERIFIED';
          p.catatan = catatan;
          p.verified_by = actor;
          p.verified_at = new Date().toISOString();
          if (!p.no_peserta) {
            const assigned = assignRoomAndSeat(db);
            p.no_peserta = customNoPeserta || assigned.no_peserta;
            p.ruang = customRuang || assigned.ruang;
          } else {
            if (customNoPeserta) p.no_peserta = customNoPeserta;
            if (customRuang) p.ruang = customRuang;
          }
          addAuditLog(db, actor, 'VERIFY_TO', reg_code, `${p.nama_lengkap} -> ${p.no_peserta} (${p.ruang})`);
          return p;
        }
        if (reg_code.startsWith('ML-')) {
          const t = db.tim_ml.find((item) => item.reg_code === reg_code);
          if (!t) throw new Error('NOT_FOUND:Tim tidak ditemukan.');
          t.status = 'VERIFIED';
          t.catatan = catatan;
          t.verified_by = actor;
          t.verified_at = new Date().toISOString();
          if (customSeed) t.seed = customSeed;
          else if (!t.seed) {
            const count = db.tim_ml.filter((item) => item.status === 'VERIFIED').length;
            t.seed = `Seed ${count}`;
          }
          addAuditLog(db, actor, 'VERIFY_ML', reg_code, `${t.nama_tim} (${t.seed})`);
          return { ...t, anggota: db.anggota_ml.filter((a) => a.reg_code === reg_code) };
        }
        throw new Error('INVALID_CODE:Kode registrasi tidak valid.');
      });
      return ok(res, updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal verifikasi.';
      const [code, detail] = msg.includes(':') ? msg.split(':', 2) : ['VERIFY_FAILED', msg];
      return fail(res, code, detail, 400);
    }
  });

  app.post('/api/internal/reject', requireAuth(['DASHBOARD', 'ADMIN']), async (req: AuthedRequest, res) => {
    const reg_code = String(req.body?.reg_code || '').trim().toUpperCase();
    const catatan = sanitizeCell(req.body?.catatan || '');
    const actor = req.userSession!.username;

    if (!catatan) {
      return fail(res, 'VALIDATION_ERROR', 'Catatan alasan penolakan wajib diisi.', 400);
    }

    try {
      const updated = await withDbLock((db) => {
        if (reg_code.startsWith('TO-')) {
          const p = db.peserta_to.find((item) => item.reg_code === reg_code);
          if (!p) throw new Error('NOT_FOUND:Peserta tidak ditemukan.');
          p.status = 'REJECTED';
          p.catatan = catatan;
          p.verified_by = actor;
          p.verified_at = new Date().toISOString();
          addAuditLog(db, actor, 'REJECT_TO', reg_code, catatan);
          return p;
        }
        if (reg_code.startsWith('ML-')) {
          const t = db.tim_ml.find((item) => item.reg_code === reg_code);
          if (!t) throw new Error('NOT_FOUND:Tim tidak ditemukan.');
          t.status = 'REJECTED';
          t.catatan = catatan;
          t.verified_by = actor;
          t.verified_at = new Date().toISOString();
          addAuditLog(db, actor, 'REJECT_ML', reg_code, catatan);
          return t;
        }
        throw new Error('INVALID_CODE:Kode registrasi tidak valid.');
      });
      return ok(res, updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menolak data.';
      const [code, detail] = msg.includes(':') ? msg.split(':', 2) : ['REJECT_FAILED', msg];
      return fail(res, code, detail, 400);
    }
  });

  app.post('/api/internal/checkin', requireAuth(['DASHBOARD', 'ADMIN']), async (req: AuthedRequest, res) => {
    const reg_code = String(req.body?.reg_code || '').trim().toUpperCase();
    const actor = req.userSession!.username;

    try {
      const result = await withDbLock((db) => {
        if (reg_code.startsWith('TO-')) {
          const p = db.peserta_to.find((item) => item.reg_code === reg_code);
          if (!p) throw new Error('NOT_FOUND:Kode peserta Try Out tidak ditemukan.');
          if (p.status !== 'VERIFIED') {
            throw new Error(`NOT_VERIFIED:Peserta ${reg_code} berstatus ${p.status}. Verifikasi dahulu sebelum check-in.`);
          }
          const already = Boolean(p.checkin_at);
          if (!p.checkin_at) {
            p.checkin_at = new Date().toISOString();
            addAuditLog(db, actor, 'CHECKIN_TO', reg_code, `${p.nama_lengkap} (${p.ruang})`);
          }
          return { jenis: 'try-out', already, peserta: p };
        }
        if (reg_code.startsWith('ML-')) {
          const t = db.tim_ml.find((item) => item.reg_code === reg_code);
          if (!t) throw new Error('NOT_FOUND:Kode tim ML tidak ditemukan.');
          if (t.status !== 'VERIFIED') {
            throw new Error(`NOT_VERIFIED:Tim ${reg_code} berstatus ${t.status}. Verifikasi dahulu sebelum check-in.`);
          }
          const already = Boolean(t.checkin_at);
          if (!t.checkin_at) {
            t.checkin_at = new Date().toISOString();
            addAuditLog(db, actor, 'CHECKIN_ML', reg_code, t.nama_tim);
          }
          return { jenis: 'mobile-legends', already, tim: t };
        }
        throw new Error('INVALID_CODE:Format kode harus TO-xxxx atau ML-xxx.');
      });
      return ok(res, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Check-in gagal.';
      const [code, detail] = msg.includes(':') ? msg.split(':', 2) : ['CHECKIN_FAILED', msg];
      return fail(res, code, detail, 400);
    }
  });

  app.post('/api/internal/skor', requireAuth(['DASHBOARD', 'ADMIN']), async (req: AuthedRequest, res) => {
    const reg_code = String(req.body?.reg_code || '').trim().toUpperCase();
    const skor_bhs_indonesia = Number(req.body?.skor_bhs_indonesia ?? 0);
    const skor_matematika = Number(req.body?.skor_matematika ?? 0);
    const skor_lainnya = Number(req.body?.skor_lainnya ?? 0);
    const sertifikat_url = sanitizeCell(req.body?.sertifikat_url || '');
    const actor = req.userSession!.username;

    try {
      const result = await withDbLock((db) => {
        const peserta = db.peserta_to.find((p) => p.reg_code === reg_code);
        if (!peserta) throw new Error('NOT_FOUND:Peserta Try Out tidak ditemukan.');

        const total = skor_bhs_indonesia + skor_matematika + skor_lainnya;
        const existingIdx = db.hasil_to.findIndex((h) => h.reg_code === reg_code);
        const record = {
          reg_code,
          no_peserta: peserta.no_peserta || '-',
          nama: peserta.nama_lengkap,
          asal_sd: peserta.asal_sd,
          skor_bhs_indonesia,
          skor_matematika,
          skor_lainnya,
          total,
          ranking: 1,
          sertifikat_url,
        };
        if (existingIdx >= 0) db.hasil_to[existingIdx] = record;
        else db.hasil_to.push(record);

        // Recompute automatic ranking
        db.hasil_to.sort((a, b) => b.total - a.total);
        db.hasil_to.forEach((h, idx) => {
          h.ranking = idx + 1;
        });
        addAuditLog(db, actor, 'INPUT_SKOR_TO', reg_code, `Total skor: ${total}`);
        return db.hasil_to;
      });
      return ok(res, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan skor.';
      const [code, detail] = msg.includes(':') ? msg.split(':', 2) : ['SKOR_FAILED', msg];
      return fail(res, code, detail, 400);
    }
  });

  app.post('/api/internal/match', requireAuth(['DASHBOARD', 'ADMIN']), async (req: AuthedRequest, res) => {
    const actor = req.userSession!.username;
    const body = req.body as Partial<MatchML>;
    if (!body.babak || !body.tim_a || !body.tim_b) {
      return fail(res, 'VALIDATION_ERROR', 'Babak, Tim A, dan Tim B wajib diisi.', 400);
    }

    const updated = await withDbLock((db) => {
      const match_id = body.match_id || `M-${Date.now().toString(36).toUpperCase()}`;
      const matchObj: MatchML = {
        match_id,
        babak: sanitizeCell(body.babak!),
        tim_a: sanitizeCell(body.tim_a!),
        tim_b: sanitizeCell(body.tim_b!),
        skor_a: Number(body.skor_a ?? 0),
        skor_b: Number(body.skor_b ?? 0),
        pemenang: sanitizeCell(body.pemenang || ''),
        jadwal: sanitizeCell(body.jadwal || ''),
        status: body.status === 'Live' || body.status === 'Selesai' ? body.status : 'Belum',
        link_live: sanitizeCell(body.link_live || ''),
      };
      const idx = db.match_ml.findIndex((m) => m.match_id === match_id);
      if (idx >= 0) db.match_ml[idx] = matchObj;
      else db.match_ml.push(matchObj);

      addAuditLog(db, actor, 'UPDATE_MATCH_ML', match_id, `${matchObj.tim_a} vs ${matchObj.tim_b} (${matchObj.skor_a}-${matchObj.skor_b})`);
      return db.match_ml;
    });

    return ok(res, updated);
  });

  // ==================== ADMIN-ONLY ENDPOINTS ====================

  app.post('/api/admin/config', requireAuth(['ADMIN']), async (req: AuthedRequest, res) => {
    const actor = req.userSession!.username;
    const rawPatch = { ...(req.body as Record<string, unknown>) };
    delete rawPatch.count_to_active;
    delete rawPatch.count_to_verified;
    delete rawPatch.count_ml_active;
    delete rawPatch.count_ml_verified;
    delete rawPatch.remaining_to;
    delete rawPatch.remaining_ml;
    const patch = rawPatch as Partial<EventConfig>;

    const updated = await withDbLock((db) => {
      db.config = {
        ...db.config,
        ...patch,
        quota_to: Number(patch.quota_to ?? db.config.quota_to),
        quota_ml: Number(patch.quota_ml ?? db.config.quota_ml),
        to_room_capacity: Number(patch.to_room_capacity ?? db.config.to_room_capacity),
        wa_panitia: normalizeWa(patch.wa_panitia ?? db.config.wa_panitia),
        to_subjects: Array.isArray(patch.to_subjects)
          ? patch.to_subjects.map((s) => String(s).trim()).filter(Boolean)
          : db.config.to_subjects,
        to_requirements: Array.isArray(patch.to_requirements)
          ? patch.to_requirements.map((s) => String(s).trim()).filter(Boolean)
          : db.config.to_requirements,
        ml_format: Array.isArray(patch.ml_format)
          ? patch.ml_format.map((s) => String(s).trim()).filter(Boolean)
          : db.config.ml_format,
        ml_rules_summary: Array.isArray(patch.ml_rules_summary)
          ? patch.ml_rules_summary.map((s) => String(s).trim()).filter(Boolean)
          : db.config.ml_rules_summary,
        alur_steps: Array.isArray(patch.alur_steps)
          ? patch.alur_steps.map((step, i) => ({
              no: String(step?.no || `0${i + 1}.`),
              title: String(step?.title || ''),
              desc: String(step?.desc || ''),
            }))
          : db.config.alur_steps,
        juknis_pdfs: Array.isArray(patch.juknis_pdfs) ? patch.juknis_pdfs : db.config.juknis_pdfs,
      };
      addAuditLog(db, actor, 'CONFIG_UPDATE', 'Config', 'Memperbarui pengaturan & konten tampilan acara');
      return db.config;
    });
    return ok(res, updated);
  });

  app.post(
    '/api/admin/juknis-pdf/upload',
    requireAuth(['ADMIN']),
    express.raw({ type: ['application/pdf', 'application/octet-stream'], limit: '20mb' }),
    async (req: AuthedRequest, res) => {
      const actor = req.userSession!.username;
      const bodyBuf = req.body;
      if (!Buffer.isBuffer(bodyBuf) || bodyBuf.length === 0) {
        return fail(res, 'EMPTY_FILE', 'File PDF kosong atau format pengiriman tidak valid.', 400);
      }
      if (!bodyBuf.subarray(0, 1024).includes('%PDF-')) {
        return fail(res, 'INVALID_PDF', 'File yang diunggah bukan dokumen PDF yang valid.', 400);
      }

      const targetId = String(req.query.id || '').trim() || `pdf-${Date.now().toString(36)}`;
      const labelInput = sanitizeCell(String(req.query.label || '')).trim();
      const kegiatanRaw = String(req.query.kegiatan || 'umum');
      const kegiatan: KegiatanType =
        kegiatanRaw === 'try-out' || kegiatanRaw === 'mobile-legends' ? kegiatanRaw : 'umum';
      const origNameRaw = String(req.query.filename || 'juknis.pdf').trim();
      const cleanOrigName = path.basename(origNameRaw).replace(/[^\w.\-\s()]/g, '_') || 'juknis.pdf';
      const safeExtName = cleanOrigName.toLowerCase().endsWith('.pdf') ? cleanOrigName : `${cleanOrigName}.pdf`;
      const slug = safeExtName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'juknis';
      const storedName = `${slug}-${Date.now()}.pdf`;

      if (!fs.existsSync(JUKNIS_UPLOAD_DIR)) {
        fs.mkdirSync(JUKNIS_UPLOAD_DIR, { recursive: true });
      }
      const destPath = path.join(JUKNIS_UPLOAD_DIR, storedName);
      fs.writeFileSync(destPath, bodyBuf);

      const list = await withDbLock((db) => {
        const current = Array.isArray(db.config.juknis_pdfs) ? [...db.config.juknis_pdfs] : [];
        const idx = current.findIndex((x) => x.id === targetId);
        const oldUrl = idx >= 0 ? current[idx].file_url : '';
        if (oldUrl && oldUrl.startsWith('/api/juknis-pdf/')) {
          const oldStored = path.basename(oldUrl);
          const oldPath = path.join(JUKNIS_UPLOAD_DIR, oldStored);
          if (fs.existsSync(oldPath) && oldPath !== destPath) {
            try {
              fs.unlinkSync(oldPath);
            } catch {
              // ignore cleanup failure
            }
          }
        }

        const nextItem: JuknisPdfFile = {
          id: targetId,
          label: labelInput || (idx >= 0 ? current[idx].label : safeExtName.replace(/\.pdf$/i, '')),
          kegiatan: idx >= 0 && !req.query.kegiatan ? current[idx].kegiatan : kegiatan,
          file_name: safeExtName,
          file_url: `/api/juknis-pdf/${storedName}`,
          file_size: bodyBuf.length,
          uploaded_at: new Date().toISOString(),
        };

        if (idx >= 0) current[idx] = nextItem;
        else current.push(nextItem);

        db.config.juknis_pdfs = current;
        addAuditLog(db, actor, 'UPLOAD_JUKNIS_PDF', targetId, `${safeExtName} (${Math.round(bodyBuf.length / 1024)} KB)`);
        return current;
      });

      return ok(res, list);
    },
  );

  app.post('/api/admin/juknis-pdf/upsert', requireAuth(['ADMIN']), async (req: AuthedRequest, res) => {
    const actor = req.userSession!.username;
    const { id, label, kegiatan } = req.body ?? {};
    const cleanLabel = sanitizeCell(String(label || '')).trim();
    if (!cleanLabel) {
      return fail(res, 'VALIDATION_ERROR', 'Judul tombol Juknis wajib diisi.', 400);
    }
    const validKegiatan: KegiatanType =
      kegiatan === 'try-out' || kegiatan === 'mobile-legends' ? kegiatan : 'umum';

    const list = await withDbLock((db) => {
      const current = Array.isArray(db.config.juknis_pdfs) ? [...db.config.juknis_pdfs] : [];
      const targetId = String(id || '').trim() || `pdf-${Date.now().toString(36)}`;
      const idx = current.findIndex((x) => x.id === targetId);
      if (idx >= 0) {
        current[idx] = {
          ...current[idx],
          label: cleanLabel,
          kegiatan: validKegiatan,
        };
      } else {
        current.push({
          id: targetId,
          label: cleanLabel,
          kegiatan: validKegiatan,
          file_name: '',
          file_url: '',
          file_size: 0,
          uploaded_at: '',
        });
      }
      db.config.juknis_pdfs = current;
      addAuditLog(db, actor, 'UPSERT_JUKNIS_SLOT', targetId, cleanLabel);
      return current;
    });

    return ok(res, list);
  });

  app.post('/api/admin/juknis-pdf/delete', requireAuth(['ADMIN']), async (req: AuthedRequest, res) => {
    const actor = req.userSession!.username;
    const id = String(req.body?.id || '').trim();
    const mode = req.body?.mode === 'slot' ? 'slot' : 'file';
    if (!id) {
      return fail(res, 'INVALID_INPUT', 'ID Juknis PDF wajib diisi.', 400);
    }

    const list = await withDbLock((db) => {
      const current = Array.isArray(db.config.juknis_pdfs) ? [...db.config.juknis_pdfs] : [];
      const idx = current.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const oldUrl = current[idx].file_url;
        if (oldUrl && oldUrl.startsWith('/api/juknis-pdf/')) {
          const oldPath = path.join(JUKNIS_UPLOAD_DIR, path.basename(oldUrl));
          if (fs.existsSync(oldPath)) {
            try {
              fs.unlinkSync(oldPath);
            } catch {
              // ignore cleanup failure
            }
          }
        }
        if (mode === 'slot') {
          current.splice(idx, 1);
        } else {
          current[idx] = {
            ...current[idx],
            file_name: '',
            file_url: '',
            file_size: 0,
            uploaded_at: '',
          };
        }
        db.config.juknis_pdfs = current;
        addAuditLog(db, actor, 'DELETE_JUKNIS_PDF', id, mode === 'slot' ? 'Hapus tombol & file Juknis' : 'Hapus file PDF Juknis');
      }
      return current;
    });

    return ok(res, list);
  });

  app.post('/api/admin/content/upsert', requireAuth(['ADMIN']), async (req: AuthedRequest, res) => {
    const actor = req.userSession!.username;
    const { section, item } = req.body ?? {};
    const validSections = ['pengumuman', 'jadwal', 'juknis', 'faq', 'hadiah', 'sponsor', 'galeri'] as const;
    if (!validSections.includes(section)) {
      return fail(res, 'INVALID_SECTION', 'Kategori konten tidak valid.', 400);
    }

    const result = await withDbLock((db) => {
      const id = item?.id || `${section.slice(0, 2)}-${Date.now().toString(36)}`;
      const entry = { ...item, id };
      const list = db[section as (typeof validSections)[number]] as Array<{ id: string }>;
      const idx = list.findIndex((x) => x.id === id);
      if (idx >= 0) list[idx] = entry;
      else list.unshift(entry);
      addAuditLog(db, actor, 'CONTENT_UPSERT', `${section}:${id}`, item?.judul || item?.pertanyaan || item?.nama || item?.peringkat || id);
      return list;
    });
    return ok(res, result);
  });

  app.post('/api/admin/content/delete', requireAuth(['ADMIN']), async (req: AuthedRequest, res) => {
    const actor = req.userSession!.username;
    const { section, id } = req.body ?? {};
    const validSections = ['pengumuman', 'jadwal', 'juknis', 'faq', 'hadiah', 'sponsor', 'galeri'] as const;
    if (!validSections.includes(section) || !id) {
      return fail(res, 'INVALID_INPUT', 'Section dan ID wajib diisi.', 400);
    }

    const result = await withDbLock((db) => {
      const key = section as (typeof validSections)[number];
      const list = db[key] as Array<{ id: string }>;
      (db as unknown as Record<string, unknown>)[key] = list.filter((x) => x.id !== id);
      addAuditLog(db, actor, 'CONTENT_DELETE', `${section}:${id}`, 'Menghapus item konten');
      return db[key];
    });
    return ok(res, result);
  });

  app.get('/api/admin/users', requireAuth(['ADMIN']), (_req, res) => {
    const db = loadDb();
    return ok(
      res,
      db.users.map((u) => ({
        username: u.username,
        role: u.role,
        nama: u.nama,
        aktif: u.aktif,
        last_login: u.last_login,
      })),
    );
  });

  app.post('/api/admin/users/create', requireAuth(['ADMIN']), async (req: AuthedRequest, res) => {
    const actor = req.userSession!.username;
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const nama = sanitizeCell(req.body?.nama || '');
    const role: UserRole = req.body?.role === 'ADMIN' ? 'ADMIN' : 'DASHBOARD';

    if (!username || password.length < 6 || !nama) {
      return fail(res, 'VALIDATION_ERROR', 'Username, nama, dan password minimal 6 karakter wajib diisi.', 400);
    }

    try {
      const users = await withDbLock((db) => {
        if (db.users.some((u) => u.username === username)) {
          throw new Error('DUPLICATE_USER:Username sudah digunakan.');
        }
        const salt = crypto.randomBytes(16).toString('hex');
        db.users.push({
          username,
          password_hash: hashPassword(password, salt),
          salt,
          role,
          nama,
          aktif: true,
          last_login: null,
          failed_attempts: 0,
          locked_until: null,
        });
        addAuditLog(db, actor, 'USER_CREATE', username, `Role: ${role}`);
        return db.users.map((u) => ({
          username: u.username,
          role: u.role,
          nama: u.nama,
          aktif: u.aktif,
          last_login: u.last_login,
        }));
      });
      return ok(res, users, 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat akun.';
      const [code, detail] = msg.includes(':') ? msg.split(':', 2) : ['USER_ERROR', msg];
      return fail(res, code, detail, 400);
    }
  });

  app.post('/api/admin/users/update', requireAuth(['ADMIN']), async (req: AuthedRequest, res) => {
    const actor = req.userSession!.username;
    const username = String(req.body?.username || '').trim();
    const role: UserRole | undefined = req.body?.role === 'ADMIN' ? 'ADMIN' : req.body?.role === 'DASHBOARD' ? 'DASHBOARD' : undefined;
    const aktif = typeof req.body?.aktif === 'boolean' ? req.body.aktif : undefined;
    const newPassword = String(req.body?.new_password || '');

    if (username === actor && aktif === false) {
      return fail(res, 'SELF_LOCKOUT', 'Tidak dapat menonaktifkan akun Anda sendiri.', 400);
    }

    try {
      const users = await withDbLock((db) => {
        const user = db.users.find((u) => u.username === username);
        if (!user) throw new Error('NOT_FOUND:Akun tidak ditemukan.');
        if (role) user.role = role;
        if (aktif !== undefined) user.aktif = aktif;
        if (newPassword.length >= 6) {
          const salt = crypto.randomBytes(16).toString('hex');
          user.salt = salt;
          user.password_hash = hashPassword(newPassword, salt);
        }
        addAuditLog(db, actor, 'USER_UPDATE', username, `role=${user.role}, aktif=${user.aktif}`);
        return db.users.map((u) => ({
          username: u.username,
          role: u.role,
          nama: u.nama,
          aktif: u.aktif,
          last_login: u.last_login,
        }));
      });
      return ok(res, users);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah akun.';
      const [code, detail] = msg.includes(':') ? msg.split(':', 2) : ['USER_ERROR', msg];
      return fail(res, code, detail, 400);
    }
  });

  app.delete('/api/admin/registrasi/:type/:reg_code', requireAuth(['ADMIN']), async (req: AuthedRequest, res) => {
    const actor = req.userSession!.username;
    const type = req.params.type;
    const reg_code = String(req.params.reg_code || '').toUpperCase();

    await withDbLock((db) => {
      if (type === 'try-out') {
        db.peserta_to = db.peserta_to.filter((p) => p.reg_code !== reg_code);
        db.hasil_to = db.hasil_to.filter((h) => h.reg_code !== reg_code);
      } else if (type === 'mobile-legends') {
        db.tim_ml = db.tim_ml.filter((t) => t.reg_code !== reg_code);
        db.anggota_ml = db.anggota_ml.filter((a) => a.reg_code !== reg_code);
      }
      addAuditLog(db, actor, 'DELETE_REGISTRASI', reg_code, `Menghapus pendaftaran ${type}`);
    });
    return ok(res, { deleted: reg_code });
  });

  app.get('/api/admin/export/:type', requireAuth(['ADMIN']), (req, res) => {
    const db = loadDb();
    const type = req.params.type;
    if (type === 'peserta-to') {
      const csv = toCsv(
        ['Kode', 'Waktu', 'Nama Lengkap', 'L/P', 'Asal SD', 'Kelas', 'NISN', 'Orang Tua', 'WA Ortu', 'Status', 'No Peserta', 'Ruang', 'Check-in'],
        db.peserta_to.map((p) => [
          p.reg_code,
          p.timestamp,
          p.nama_lengkap,
          p.jenis_kelamin,
          p.asal_sd,
          p.kelas,
          p.nisn,
          p.nama_ortu,
          p.wa_ortu,
          p.status,
          p.no_peserta,
          p.ruang,
          p.checkin_at || '',
        ]),
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="peserta-tryout-spendapul.csv"');
      return res.send(csv);
    }
    if (type === 'tim-ml') {
      const csv = toCsv(
        ['Kode', 'Waktu', 'Nama Tim', 'Asal Sekolah', 'Kapten', 'WA Kapten', 'Status', 'Seed', 'Check-in'],
        db.tim_ml.map((t) => [
          t.reg_code,
          t.timestamp,
          t.nama_tim,
          t.asal_sekolah,
          t.nama_kapten,
          t.wa_kapten,
          t.status,
          t.seed,
          t.checkin_at || '',
        ]),
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="tim-ml-spendapul.csv"');
      return res.send(csv);
    }
    if (type === 'hasil-to') {
      const csv = toCsv(
        ['Ranking', 'Kode', 'No Peserta', 'Nama', 'Asal SD', 'Bhs Indonesia', 'Matematika', 'Lainnya', 'Total'],
        db.hasil_to.map((h) => [
          h.ranking,
          h.reg_code,
          h.no_peserta,
          h.nama,
          h.asal_sd,
          h.skor_bhs_indonesia,
          h.skor_matematika,
          h.skor_lainnya,
          h.total,
        ]),
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="hasil-tryout-spendapul.csv"');
      return res.send(csv);
    }
    return fail(res, 'INVALID_EXPORT', 'Tipe ekspor tidak dikenal.', 400);
  });

  app.get('/api/admin/logs', requireAuth(['ADMIN']), (_req, res) => {
    const db = loadDb();
    return ok(res, db.logs);
  });

  app.get('/api/admin/backup', requireAuth(['ADMIN']), (_req, res) => {
    const db = loadDb();
    const safeBackup = {
      ...db,
      sessions: [],
      users: db.users.map((u) => ({ username: u.username, role: u.role, nama: u.nama, aktif: u.aktif })),
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="backup-spendapul-${new Date().toISOString().slice(0, 10)}.json"`);
    return res.send(JSON.stringify(safeBackup, null, 2));
  });

  // ==================== VITE / STATIC SERVING ====================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Spendapul Competition server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
