export type RegistrationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type UserRole = 'DASHBOARD' | 'ADMIN';
export type MatchStatus = 'Belum' | 'Live' | 'Selesai';
export type KegiatanType = 'umum' | 'try-out' | 'mobile-legends';

export interface AlurStep {
  no: string;
  title: string;
  desc: string;
}

export interface JuknisPdfFile {
  id: string;
  label: string;
  kegiatan: KegiatanType;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_at: string;
}

export interface EventConfig {
  event_name: string;
  tagline: string;
  school_name: string;
  school_address: string;
  reg_to_open: boolean;
  reg_ml_open: boolean;
  reg_to_deadline: string;
  reg_ml_deadline: string;
  quota_to: number;
  quota_ml: number;
  wa_panitia: string;
  event_date_to: string;
  event_date_ml: string;
  event_location: string;
  ml_scope: string;
  ml_require_student_card: boolean;
  show_hasil: boolean;
  to_room_capacity: number;
  // Editable display fields for user-facing pages & dashboard
  hero_title: string;
  hero_subtitle: string;
  hero_date_label: string;
  hero_badge_title: string;
  hero_badge_subtitle: string;
  to_title: string;
  to_description: string;
  to_format: string;
  to_subjects: string[];
  to_requirements: string[];
  ml_title: string;
  ml_description: string;
  ml_format: string[];
  ml_tm_date: string;
  ml_rules_summary: string[];
  alur_steps: AlurStep[];
  service_hours: string;
  maps_url: string;
  footer_description: string;
  dashboard_notice: string;
  juknis_pdfs: JuknisPdfFile[];
}

export interface PublicConfig extends EventConfig {
  count_to_active: number;
  count_to_verified: number;
  count_ml_active: number;
  count_ml_verified: number;
  remaining_to: number;
  remaining_ml: number;
}

export interface PesertaTO {
  reg_code: string;
  timestamp: string;
  nama_lengkap: string;
  jenis_kelamin: 'L' | 'P';
  asal_sd: string;
  kelas: string;
  nisn: string;
  tempat_lahir: string;
  tgl_lahir: string;
  nama_ortu: string;
  wa_ortu: string;
  email: string;
  alamat: string;
  persetujuan: boolean;
  status: RegistrationStatus;
  catatan: string;
  no_peserta: string;
  ruang: string;
  checkin_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
}

export interface AnggotaML {
  member_id: string;
  reg_code: string;
  peran: 'Utama' | 'Cadangan';
  nama_lengkap: string;
  nickname_ingame: string;
  id_ml: string;
  server_id: string;
  kelas: string;
  kartu_pelajar_url: string;
}

export interface TimML {
  reg_code: string;
  timestamp: string;
  nama_tim: string;
  asal_sekolah: string;
  nama_kapten: string;
  wa_kapten: string;
  email: string;
  logo_url: string;
  persetujuan: boolean;
  status: RegistrationStatus;
  catatan: string;
  seed: string;
  checkin_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  anggota?: AnggotaML[];
}

export interface HasilTO {
  reg_code: string;
  no_peserta: string;
  nama: string;
  asal_sd: string;
  skor_bhs_indonesia: number;
  skor_matematika: number;
  skor_lainnya: number;
  total: number;
  ranking: number;
  sertifikat_url: string;
}

export interface MatchML {
  match_id: string;
  babak: string;
  tim_a: string;
  tim_b: string;
  skor_a: number;
  skor_b: number;
  pemenang: string;
  jadwal: string;
  status: MatchStatus;
  link_live: string;
}

export interface PengumumanItem {
  id: string;
  tanggal: string;
  judul: string;
  isi: string;
  kategori: 'Umum' | 'Try Out' | 'Mobile Legends';
  pinned: boolean;
  published: boolean;
}

export interface JadwalItem {
  id: string;
  kegiatan: KegiatanType;
  tanggal_mulai: string;
  tanggal_selesai: string;
  judul: string;
  deskripsi: string;
  lokasi: string;
}

export interface JuknisSection {
  id: string;
  kegiatan: KegiatanType;
  urutan: number;
  judul_bagian: string;
  isi_markdown: string;
  pdf_url: string;
}

export interface FaqItem {
  id: string;
  kategori: 'Umum' | 'Try Out' | 'Mobile Legends';
  pertanyaan: string;
  jawaban: string;
  urutan: number;
}

export interface HadiahItem {
  id: string;
  kegiatan: 'try-out' | 'mobile-legends';
  peringkat: string;
  hadiah: string;
}

export interface SponsorItem {
  id: string;
  nama: string;
  logo_url: string;
  link: string;
  tier: 'Utama' | 'Pendukung' | 'Media Partner';
}

export interface GaleriItem {
  id: string;
  judul: string;
  kegiatan: KegiatanType;
  tanggal: string;
  image_key: string;
  deskripsi: string;
}

export interface PublicContent {
  pengumuman: PengumumanItem[];
  jadwal: JadwalItem[];
  juknis: JuknisSection[];
  faq: FaqItem[];
  hadiah: HadiahItem[];
  sponsor: SponsorItem[];
  galeri: GaleriItem[];
}

export interface UserAccountPublic {
  username: string;
  role: UserRole;
  nama: string;
  aktif: boolean;
  last_login: string | null;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  username: string;
  aksi: string;
  target: string;
  detail: string;
}

export interface DashboardStats {
  total_to: number;
  pending_to: number;
  verified_to: number;
  rejected_to: number;
  checkin_to: number;
  quota_to: number;
  total_ml: number;
  pending_ml: number;
  verified_ml: number;
  rejected_ml: number;
  checkin_ml: number;
  quota_ml: number;
  daily_series: Array<{ date: string; to: number; ml: number }>;
}

export interface CekStatusResult {
  jenis: 'try-out' | 'mobile-legends';
  peserta?: PesertaTO;
  tim?: TimML;
}

export interface MaskedPesertaPublic {
  to: Array<{
    reg_code: string;
    nama_samaran: string;
    asal_sd: string;
    no_peserta: string;
    ruang: string;
  }>;
  ml: Array<{
    reg_code: string;
    nama_tim: string;
    asal_sekolah: string;
    seed: string;
    jumlah_pemain: number;
  }>;
}
