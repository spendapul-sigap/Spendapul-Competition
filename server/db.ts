import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  AnggotaML,
  AuditLogItem,
  EventConfig,
  FaqItem,
  GaleriItem,
  HadiahItem,
  HasilTO,
  JadwalItem,
  JuknisSection,
  MatchML,
  PengumumanItem,
  PesertaTO,
  SponsorItem,
  TimML,
  UserRole,
} from '../src/types/spendapul';

export interface StoredUser {
  username: string;
  password_hash: string;
  salt: string;
  role: UserRole;
  nama: string;
  aktif: boolean;
  last_login: string | null;
  failed_attempts: number;
  locked_until: number | null;
}

export interface StoredSession {
  token_hash: string;
  username: string;
  role: UserRole;
  nama: string;
  expires_at: number;
}

export interface DatabaseSchema {
  config: EventConfig;
  peserta_to: PesertaTO[];
  tim_ml: Omit<TimML, 'anggota'>[];
  anggota_ml: AnggotaML[];
  hasil_to: HasilTO[];
  match_ml: MatchML[];
  pengumuman: PengumumanItem[];
  jadwal: JadwalItem[];
  juknis: JuknisSection[];
  faq: FaqItem[];
  hadiah: HadiahItem[];
  sponsor: SponsorItem[];
  galeri: GaleriItem[];
  users: StoredUser[];
  sessions: StoredSession[];
  logs: AuditLogItem[];
  counters: {
    to: number;
    ml: number;
  };
  idempotency: Record<string, { reg_code: string; ts: number }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
export const JUKNIS_UPLOAD_DIR = path.join(DATA_DIR, 'uploads', 'juknis');

export function hashPassword(password: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function sanitizeCell(value: string): string {
  const trimmed = String(value ?? '').trim();
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

export function normalizeWa(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function createInitialData(): DatabaseSchema {
  const adminSalt = crypto.randomBytes(16).toString('hex');

  return {
    config: {
      event_name: 'Spendapul Competition 2026',
      tagline: 'Ajang Prestasi Akademik & Esport Pelajar Gratis di SMP Negeri 2 Pulung',
      school_name: 'SMP Negeri 2 Pulung',
      school_address: 'Jl. Raya Pulung–Sooko, Kec. Pulung, Kab. Ponorogo, Jawa Timur 63481',
      reg_to_open: true,
      reg_ml_open: true,
      reg_to_deadline: '2026-12-12T23:59',
      reg_ml_deadline: '2026-12-12T23:59',
      quota_to: 200,
      quota_ml: 32,
      wa_panitia: '6281234567890',
      event_date_to: '2026-12-19T07:30',
      event_date_ml: '2026-12-20T08:00',
      event_location: 'Kampus SMP Negeri 2 Pulung, Ponorogo',
      ml_scope: 'Pelajar SMP/MTs & SD/MI Kelas 6 Sederajat',
      ml_require_student_card: false,
      show_hasil: false,
      to_room_capacity: 25,
      hero_title: 'Ajang Prestasi Pelajar & Kompetisi Gratis di SMPN 2 Pulung',
      hero_subtitle:
        'Ikuti Try Out TKA SD untuk siswa kelas 6 SD/MI dan Turnamen Mobile Legends antar pelajar tanpa biaya pendaftaran. Daftar online, unduh kartu QR, dan pantau hasil secara transparan.',
      hero_date_label: '19–20 Desember 2026',
      hero_badge_title: '100% Gratis · Terbuka',
      hero_badge_subtitle: 'Sertifikat & Tropi Pembinaan',
      to_title: 'Try Out TKA SD Tingkat Kecamatan',
      to_description:
        'Uji kesiapan menghadapi Tes Kemampuan Akademik dengan soal terstandar (Bahasa Indonesia, Matematika, dan IPA/Pengetahuan Umum) secara tatap muka di ruang ujian SMP Negeri 2 Pulung.',
      to_format: 'Tatap Muka (Offline)',
      to_subjects: [
        'Bahasa Indonesia — 30 soal',
        'Matematika — 25 soal',
        'IPA / Pengetahuan Umum — 20 soal',
        'Total durasi pengerjaan 150 menit',
      ],
      to_requirements: [
        'Siswa aktif kelas 6 SD/MI sederajat',
        'Mengisi data NISN & persetujuan orang tua',
        'Membawa Kartu Peserta QR (cetak/HP)',
        'Membawa pensil 2B, penghapus & papan alas',
      ],
      ml_title: 'Turnamen Mobile Legends Pelajar',
      ml_description:
        'Tunjukkan strategi dan sportivitas tim sekolahmu pada mode 5v5 Custom Draft Pick dengan sistem gugur dan grand final BO3 di Aula SMP Negeri 2 Pulung.',
      ml_format: [
        'Mode Custom Draft Pick 5v5',
        'Penyisihan – Perempat Final: BO1',
        'Semifinal & Grand Final: BO3',
        'Konfirmasi ulang wajib H-1 via grup kapten',
      ],
      ml_tm_date: 'TM Online: 16 Des 2026',
      ml_rules_summary: [
        '5 pemain inti + maksimal 1 cadangan',
        '1 ID Mobile Legends hanya untuk 1 tim',
        'Dilarang joki, akun ganda, atau cheat',
        'Keterlambatan > 10 menit dikenakan WO',
      ],
      alur_steps: [
        {
          no: '01.',
          title: 'Isi Formulir Online',
          desc: 'Lengkapi data peserta atau tim dari HP dan simpan Kode Registrasi yang muncul otomatis.',
        },
        {
          no: '02.',
          title: 'Verifikasi Kelayakan',
          desc: 'Panitia memeriksa status siswa/pelajar dan keaslian ID maksimal 1×24 jam kerja.',
        },
        {
          no: '03.',
          title: 'Unduh Kartu QR',
          desc: 'Buka menu Cek Status dengan Kode Registrasi + nomor WhatsApp untuk mencetak kartu peserta.',
        },
        {
          no: '04.',
          title: 'Check-in di Lokasi',
          desc: 'Tunjukkan QR Code pada Kartu Peserta saat tiba di SMP Negeri 2 Pulung pada hari pelaksanaan.',
        },
      ],
      service_hours: 'Senin – Sabtu, 07.30 – 15.00 WIB',
      maps_url: 'https://maps.google.com/?q=SMP+Negeri+2+Pulung+Ponorogo',
      footer_description:
        'Pusat informasi resmi dan pendaftaran gratis Try Out TKA SD serta Kompetisi Mobile Legends pelajar yang diselenggarakan oleh SMP Negeri 2 Pulung.',
      dashboard_notice:
        'Pastikan seluruh pendaftar diverifikasi kelayakan datanya (NISN kelas 6 / ID ML tidak ganda) maksimal 1×24 jam.',
      juknis_pdfs: [
        {
          id: 'pdf-umum',
          label: 'Juknis Resmi Spendapul Competition 2026 (Semua Kegiatan)',
          kegiatan: 'umum',
          file_name: '',
          file_url: '',
          file_size: 0,
          uploaded_at: '',
        },
        {
          id: 'pdf-to',
          label: 'Juknis Try Out TKA SD',
          kegiatan: 'try-out',
          file_name: '',
          file_url: '',
          file_size: 0,
          uploaded_at: '',
        },
        {
          id: 'pdf-ml',
          label: 'Juknis Turnamen Mobile Legends',
          kegiatan: 'mobile-legends',
          file_name: '',
          file_url: '',
          file_size: 0,
          uploaded_at: '',
        },
      ],
    },
    peserta_to: [],
    tim_ml: [],
    anggota_ml: [],
    hasil_to: [],
    match_ml: [],
    pengumuman: [
      {
        id: 'p-1',
        tanggal: '2026-11-10',
        judul: 'Pendaftaran Resmi Dibuka — Seluruh Kegiatan 100% Gratis',
        isi: 'SMP Negeri 2 Pulung membuka pendaftaran Try Out TKA SD dan Kompetisi Mobile Legends 2026 tanpa biaya pendaftaran. Peserta cukup mendaftar online melalui portal ini hingga 12 Desember 2026 atau sampai kuota terpenuhi.',
        kategori: 'Umum',
        pinned: true,
        published: true,
      },
      {
        id: 'p-2',
        tanggal: '2026-11-11',
        judul: 'Ketentuan Ruang & Perlengkapan Try Out TKA SD',
        isi: 'Peserta Try Out TKA SD wajib membawa Kartu Peserta (unduh di halaman Cek Status setelah diverifikasi), pensil 2B, penghapus, dan papan jalan/alas tulis. Pembagian ruang dapat dilihat langsung pada Kartu Peserta.',
        kategori: 'Try Out',
        pinned: false,
        published: true,
      },
      {
        id: 'p-3',
        tanggal: '2026-11-12',
        judul: 'Technical Meeting Online Kapten Tim Mobile Legends',
        isi: 'Technical Meeting wajib diikuti seluruh kapten tim terverifikasi pada 16 Desember 2026 pukul 15.30 WIB via Google Meet. Tautan akan dibagikan melalui grup WhatsApp kapten setelah verifikasi berkas selesai.',
        kategori: 'Mobile Legends',
        pinned: false,
        published: true,
      },
    ],
    jadwal: [
      {
        id: 'j-1',
        kegiatan: 'umum',
        tanggal_mulai: '2026-11-10',
        tanggal_selesai: '2026-12-12',
        judul: 'Pendaftaran & Verifikasi Online',
        deskripsi: 'Pendaftaran Try Out TKA SD dan Kompetisi Mobile Legends dibuka secara online. Panitia memverifikasi kelengkapan data maksimal 1x24 jam.',
        lokasi: 'Portal Spendapul Competition',
      },
      {
        id: 'j-2',
        kegiatan: 'mobile-legends',
        tanggal_mulai: '2026-12-16',
        tanggal_selesai: '2026-12-16',
        judul: 'Technical Meeting & Undian Bracket ML',
        deskripsi: 'Pembacaan aturan pertandingan, konfirmasi ulang daftar pemain, dan pengundian bagan pertandingan resmi.',
        lokasi: 'Online (Grup WA Kapten)',
      },
      {
        id: 'j-3',
        kegiatan: 'try-out',
        tanggal_mulai: '2026-12-19',
        tanggal_selesai: '2026-12-19',
        judul: 'Hari-H Try Out TKA SD (Tatap Muka)',
        deskripsi: '07.00 Check-in QR Code · 07.30 Pembukaan · 08.00–10.30 Pengerjaan Soal TKA SD · 11.00 Pembagian Konsumsi & Pembahasan Singkat.',
        lokasi: 'Ruang Kelas SMP Negeri 2 Pulung',
      },
      {
        id: 'j-4',
        kegiatan: 'mobile-legends',
        tanggal_mulai: '2026-12-20',
        tanggal_selesai: '2026-12-20',
        judul: 'Hari-H Turnamen Mobile Legends & Penyerahan Hadiah',
        deskripsi: '07.30 Check-in Tim · 08.30 Babak Penyisihan (BO1) · 13.00 Semifinal & Grand Final (BO3) · 16.00 Penyerahan Tropi & Sertifikat.',
        lokasi: 'Aula Utama SMP Negeri 2 Pulung',
      },
    ],
    juknis: [],
    faq: [
      {
        id: 'f-1',
        kategori: 'Umum',
        pertanyaan: 'Apakah pendaftaran Spendapul Competition benar-benar gratis?',
        jawaban: 'Ya, seluruh kegiatan Try Out TKA SD maupun Kompetisi Mobile Legends 100% gratis tanpa biaya pendaftaran maupun biaya tambahan di lokasi.',
        urutan: 1,
      },
      {
        id: 'f-2',
        kategori: 'Umum',
        pertanyaan: 'Apakah peserta harus membuat akun login untuk mendaftar?',
        jawaban: 'Tidak perlu. Peserta cukup mengisi formulir pendaftaran dan menyimpan Kode Registrasi. Untuk mengecek status atau mengunduh Kartu Peserta, gunakan Kode Registrasi dan nomor WhatsApp pada halaman Cek Status.',
        urutan: 2,
      },
      {
        id: 'f-3',
        kategori: 'Try Out',
        pertanyaan: 'Apa saja yang perlu dibawa saat Try Out TKA SD?',
        jawaban: 'Kartu Peserta (dapat dicetak atau ditunjukkan di HP orang tua saat check-in QR), pensil 2B, penghapus, papan jalan, dan air minum pribadi.',
        urutan: 3,
      },
      {
        id: 'f-4',
        kategori: 'Try Out',
        pertanyaan: 'Apakah orang tua/pendamping boleh menunggu di sekolah?',
        jawaban: 'Boleh. Panitia menyediakan area tunggu yang nyaman di halaman SMP Negeri 2 Pulung selama pelaksanaan Try Out berlangsung.',
        urutan: 4,
      },
      {
        id: 'f-5',
        kategori: 'Mobile Legends',
        pertanyaan: 'Apakah satu pemain boleh bermain di dua tim berbeda?',
        jawaban: 'Tidak boleh. Sistem akan menolak otomatis ID ML yang sudah terdaftar di tim lain. Pelanggaran joki atau akun ganda berakibat diskualifikasi.',
        urutan: 5,
      },
      {
        id: 'f-6',
        kategori: 'Mobile Legends',
        pertanyaan: 'Bagaimana jika jaringan internet di sekolah kurang stabil?',
        jawaban: 'Panitia menyediakan Wi-Fi khusus area pertandingan, namun pemain tetap disarankan menyiapkan paket data pribadi sebagai cadangan.',
        urutan: 6,
      },
    ],
    hadiah: [
      { id: 'h-1', kegiatan: 'try-out', peringkat: 'Juara 1', hadiah: 'Tropi + Piagam Penghargaan + Uang Pembinaan Rp500.000 + Voucher Beasiswa SPMB' },
      { id: 'h-2', kegiatan: 'try-out', peringkat: 'Juara 2', hadiah: 'Tropi + Piagam Penghargaan + Uang Pembinaan Rp350.000' },
      { id: 'h-3', kegiatan: 'try-out', peringkat: 'Juara 3', hadiah: 'Tropi + Piagam Penghargaan + Uang Pembinaan Rp250.000' },
      { id: 'h-4', kegiatan: 'try-out', peringkat: 'Seluruh Peserta', hadiah: 'Sertifikat Peserta, Lembar Pembahasan Soal & Snack Ringan' },
      { id: 'h-5', kegiatan: 'mobile-legends', peringkat: 'Juara 1', hadiah: 'Tropi Bergilir + Piagam + Uang Pembinaan Rp750.000 + Diamond Bonus' },
      { id: 'h-6', kegiatan: 'mobile-legends', peringkat: 'Juara 2', hadiah: 'Tropi + Piagam + Uang Pembinaan Rp500.000' },
      { id: 'h-7', kegiatan: 'mobile-legends', peringkat: 'Juara 3 & MVP', hadiah: 'Tropi + Piagam + Uang Pembinaan Rp300.000 & Penghargaan MVP Final' },
    ],
    sponsor: [
      { id: 's-1', nama: 'SMP Negeri 2 Pulung', logo_url: '', link: '#kontak', tier: 'Utama' },
      { id: 's-2', nama: 'OSIS Spendapul', logo_url: '', link: '#kontak', tier: 'Pendukung' },
      { id: 's-3', nama: 'Komite Sekolah Pulung', logo_url: '', link: '#kontak', tier: 'Pendukung' },
      { id: 's-4', nama: 'Info Ponorogo Pelajar', logo_url: '', link: '#kontak', tier: 'Media Partner' },
    ],
    galeri: [
      {
        id: 'g-1',
        judul: 'Lingkungan Kampus SMP Negeri 2 Pulung',
        kegiatan: 'umum',
        tanggal: '2026-10-15',
        image_key: 'campus',
        deskripsi: 'Halaman utama dan ruang kelas SMP Negeri 2 Pulung yang siap menyambut peserta Try Out dan kompetisi.',
      },
      {
        id: 'g-2',
        judul: 'Pelaksanaan Try Out Akademik Kelas 6',
        kegiatan: 'try-out',
        tanggal: '2025-12-14',
        image_key: 'tryout',
        deskripsi: 'Suasana tertib dan fokus siswa kelas 6 SD/MI saat mengerjakan soal Try Out TKA di ruang ujian.',
      },
      {
        id: 'g-3',
        judul: 'Pertandingan Tim Esport Pelajar',
        kegiatan: 'mobile-legends',
        tanggal: '2025-12-15',
        image_key: 'esports',
        deskripsi: 'Kekompakan tim pelajar dalam babak penyisihan turnamen Mobile Legends di aula sekolah.',
      },
    ],
    users: [
      {
        username: 'admin',
        password_hash: hashPassword('admin123', adminSalt),
        salt: adminSalt,
        role: 'ADMIN',
        nama: 'Ketua Panitia (Admin)',
        aktif: true,
        last_login: null,
        failed_attempts: 0,
        locked_until: null,
      },
    ],
    sessions: [],
    logs: [],
    counters: {
      to: 0,
      ml: 0,
    },
    idempotency: {},
  };
}

let dbCache: DatabaseSchema | null = null;
let writeQueue: Promise<void> = Promise.resolve();

export function loadDb(): DatabaseSchema {
  if (dbCache) return dbCache;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    dbCache = initial;
    return dbCache;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as DatabaseSchema;
  const defaults = createInitialData();
  parsed.config = {
    ...defaults.config,
    ...(parsed.config || {}),
    juknis_pdfs: Array.isArray(parsed.config?.juknis_pdfs)
      ? parsed.config.juknis_pdfs
      : defaults.config.juknis_pdfs,
  };
  dbCache = parsed;
  return dbCache;
}

export async function withDbLock<T>(fn: (db: DatabaseSchema) => T | Promise<T>): Promise<T> {
  let result!: T;
  const next = writeQueue.then(async () => {
    const db = loadDb();
    result = await fn(db);
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  });
  writeQueue = next.catch(() => {});
  await next;
  return result;
}

export function addAuditLog(db: DatabaseSchema, username: string, aksi: string, target: string, detail: string) {
  db.logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    username,
    aksi,
    target,
    detail,
  });
  if (db.logs.length > 500) {
    db.logs = db.logs.slice(0, 500);
  }
}
