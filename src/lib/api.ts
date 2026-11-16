import type {
  AuditLogItem,
  CekStatusResult,
  DashboardStats,
  EventConfig,
  HasilTO,
  JuknisPdfFile,
  KegiatanType,
  MaskedPesertaPublic,
  MatchML,
  PesertaTO,
  PublicConfig,
  PublicContent,
  TimML,
  UserAccountPublic,
  UserRole,
} from '../types/spendapul';

const TOKEN_KEY = 'spendapul_auth_token';
const USER_KEY = 'spendapul_auth_user';

export interface AuthUser {
  username: string;
  role: UserRole;
  nama: string;
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, cache: 'no-store', headers });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    if (res.status === 401) {
      clearAuthSession();
    }
    throw new Error(json?.error?.message || `Permintaan gagal (${res.status})`);
  }
  return json.data as T;
}

export const api = {
  getConfigPublic: () => request<PublicConfig>('/api/config-public'),
  getContent: () => request<PublicContent>('/api/content'),
  getPesertaPublic: () => request<MaskedPesertaPublic>('/api/peserta-public'),
  getBracket: () => request<MatchML[]>('/api/bracket'),
  getHasil: () =>
    request<{ published: boolean; hasil_to: HasilTO[]; juara_ml: Array<{ peringkat: string; nama_tim: string }> }>(
      '/api/hasil',
    ),
  registerTo: (payload: Record<string, unknown>) =>
    request<PesertaTO>('/api/register-to', { method: 'POST', body: JSON.stringify(payload) }),
  registerMl: (payload: Record<string, unknown>) =>
    request<TimML>('/api/register-ml', { method: 'POST', body: JSON.stringify(payload) }),
  cekStatus: (reg_code: string, wa: string) =>
    request<CekStatusResult>('/api/cek-status', { method: 'POST', body: JSON.stringify({ reg_code, wa }) }),

  // Auth
  login: async (username: string, password: string) => {
    const data = await request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAuthSession(data.token, data.user);
    return data.user;
  },
  logout: async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      clearAuthSession();
    }
  },
  me: () => request<AuthUser>('/api/auth/me'),

  // Dashboard
  getStats: () => request<DashboardStats>('/api/internal/stats'),
  listTo: () => request<PesertaTO[]>('/api/internal/to'),
  listMl: () => request<TimML[]>('/api/internal/ml'),
  listHasilTo: () => request<HasilTO[]>('/api/internal/hasil-to'),
  verifyRegistration: (payload: {
    reg_code: string;
    catatan?: string;
    no_peserta?: string;
    ruang?: string;
    seed?: string;
  }) => request<PesertaTO | TimML>('/api/internal/verify', { method: 'POST', body: JSON.stringify(payload) }),
  rejectRegistration: (reg_code: string, catatan: string) =>
    request<PesertaTO | TimML>('/api/internal/reject', { method: 'POST', body: JSON.stringify({ reg_code, catatan }) }),
  checkin: (reg_code: string) =>
    request<{ jenis: 'try-out' | 'mobile-legends'; already: boolean; peserta?: PesertaTO; tim?: TimML }>(
      '/api/internal/checkin',
      { method: 'POST', body: JSON.stringify({ reg_code }) },
    ),
  upsertSkor: (payload: {
    reg_code: string;
    skor_bhs_indonesia: number;
    skor_matematika: number;
    skor_lainnya: number;
    sertifikat_url?: string;
  }) => request<HasilTO[]>('/api/internal/skor', { method: 'POST', body: JSON.stringify(payload) }),
  upsertMatch: (payload: Partial<MatchML>) =>
    request<MatchML[]>('/api/internal/match', { method: 'POST', body: JSON.stringify(payload) }),

  // Admin
  updateConfig: (patch: Partial<EventConfig>) =>
    request<EventConfig>('/api/admin/config', { method: 'POST', body: JSON.stringify(patch) }),
  uploadJuknisPdf: async (params: { id?: string; label?: string; kegiatan?: KegiatanType; file: File }) => {
    const token = getAuthToken();
    const qs = new URLSearchParams();
    if (params.id) qs.set('id', params.id);
    if (params.label) qs.set('label', params.label);
    if (params.kegiatan) qs.set('kegiatan', params.kegiatan);
    qs.set('filename', params.file.name);
    const res = await fetch(`/api/admin/juknis-pdf/upload?${qs.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: params.file,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      if (res.status === 401) clearAuthSession();
      throw new Error(json?.error?.message || `Gagal mengunggah PDF (${res.status})`);
    }
    return json.data as JuknisPdfFile[];
  },
  upsertJuknisSlot: (payload: { id?: string; label: string; kegiatan: KegiatanType }) =>
    request<JuknisPdfFile[]>('/api/admin/juknis-pdf/upsert', { method: 'POST', body: JSON.stringify(payload) }),
  deleteJuknisPdf: (id: string, mode: 'file' | 'slot' = 'file') =>
    request<JuknisPdfFile[]>('/api/admin/juknis-pdf/delete', { method: 'POST', body: JSON.stringify({ id, mode }) }),
  upsertContent: (section: string, item: Record<string, unknown>) =>
    request<unknown[]>('/api/admin/content/upsert', { method: 'POST', body: JSON.stringify({ section, item }) }),
  deleteContent: (section: string, id: string) =>
    request<unknown[]>('/api/admin/content/delete', { method: 'POST', body: JSON.stringify({ section, id }) }),
  listUsers: () => request<UserAccountPublic[]>('/api/admin/users'),
  createUser: (payload: { username: string; password: string; nama: string; role: UserRole }) =>
    request<UserAccountPublic[]>('/api/admin/users/create', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (payload: { username: string; role?: UserRole; aktif?: boolean; new_password?: string }) =>
    request<UserAccountPublic[]>('/api/admin/users/update', { method: 'POST', body: JSON.stringify(payload) }),
  deleteRegistrasi: (type: 'try-out' | 'mobile-legends', reg_code: string) =>
    request<{ deleted: string }>(`/api/admin/registrasi/${type}/${encodeURIComponent(reg_code)}`, { method: 'DELETE' }),
  listLogs: () => request<AuditLogItem[]>('/api/admin/logs'),
  downloadExport: async (endpoint: string, filename: string) => {
    const token = getAuthToken();
    const res = await fetch(endpoint, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Gagal mengunduh berkas ekspor.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export async function compressImageFile(file: File, maxWidth = 960, quality = 0.78): Promise<string> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Ukuran file maksimal 5 MB sebelum kompresi.');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas tidak tersedia.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
