import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Gamepad2,
  MapPin,
  ShieldAlert,
  Trophy,
} from 'lucide-react';
import { formatTanggalIndo } from '../lib/format';
import { APP_IMAGES } from '../lib/images';
import type { PublicConfig, PublicContent } from '../types/spendapul';

interface ActivityPageProps {
  config: PublicConfig | null;
  content: PublicContent | null;
  onNavigate: (path: string) => void;
}

export function TryOutDetailPage({ config, content, onNavigate }: ActivityPageProps) {
  const hadiahList = (content?.hadiah || []).filter((h) => h.kegiatan === 'try-out');
  const pdfList = config?.juknis_pdfs || [];
  const tryoutPdf =
    pdfList.find((x) => x.kegiatan === 'try-out' && x.file_url) ||
    pdfList.find((x) => x.kegiatan === 'umum' && x.file_url);

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-sm font-semibold text-[#0D9488]">Kegiatan Akademik · Gratis Rp0</p>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#1A2438] tracking-tight">
            {config?.to_title || 'Try Out TKA SD Tingkat Kecamatan 2026'}
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            {config?.to_description ||
              'Simulasi Tes Kemampuan Akademik khusus siswa kelas 6 SD/MI untuk mengukur kesiapan akademik sekaligus mengenal lingkungan belajar SMP Negeri 2 Pulung.'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
            <div>
              <p className="text-xs text-slate-500">Pelaksanaan</p>
              <p className="text-sm font-semibold text-[#1A2438] mt-0.5">
                {formatTanggalIndo(config?.event_date_to || '2026-12-19')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Kuota Tersisa</p>
              <p className="text-sm font-mono font-semibold text-[#0D9488] mt-0.5">
                {config ? `${config.remaining_to} dari ${config.quota_to}` : '200'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Format Ujian</p>
              <p className="text-sm font-semibold text-[#1A2438] mt-0.5">
                {config?.to_format || 'Tatap Muka (Offline)'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/daftar/try-out')}
              disabled={!config?.reg_to_open || config.remaining_to <= 0}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-slate-300 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <span>{config?.reg_to_open ? 'Daftar Try Out Gratis' : 'Pendaftaran Ditutup'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {tryoutPdf?.file_url ? (
              <a
                href={tryoutPdf.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-slate-200 hover:border-slate-300 text-sm font-semibold text-slate-700"
              >
                <FileText className="w-4 h-4 text-[#0D9488]" />
                <span>Unduh Juknis (PDF)</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('/juknis')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-slate-200 hover:border-slate-300 text-sm font-semibold text-slate-700 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#0D9488]" />
                <span>Juknis (PDF)</span>
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[2/1] bg-white">
            <img
              src={APP_IMAGES.tryout}
              alt="Peserta Try Out TKA SD"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Mata Pelajaran & Ketentuan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-slate-200 rounded-2xl p-6 space-y-2">
          <BookOpen className="w-5 h-5 text-[#0D9488]" />
          <h2 className="font-display font-bold text-lg text-[#1A2438]">Mata Uji</h2>
          <ul className="text-sm text-slate-600 space-y-1.5 pt-1">
            {(config?.to_subjects?.length
              ? config.to_subjects
              : [
                  'Bahasa Indonesia — 30 soal',
                  'Matematika — 25 soal',
                  'IPA / Pengetahuan Umum — 20 soal',
                  'Total durasi pengerjaan 150 menit',
                ]
            ).map((item, idx) => (
              <li key={idx}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className="border border-slate-200 rounded-2xl p-6 space-y-2">
          <CheckCircle2 className="w-5 h-5 text-[#0D9488]" />
          <h2 className="font-display font-bold text-lg text-[#1A2438]">Syarat &amp; Perlengkapan</h2>
          <ul className="text-sm text-slate-600 space-y-1.5 pt-1">
            {(config?.to_requirements?.length
              ? config.to_requirements
              : [
                  'Siswa aktif kelas 6 SD/MI sederajat',
                  'Mengisi data NISN & persetujuan orang tua',
                  'Membawa Kartu Peserta QR (cetak/HP)',
                  'Membawa pensil 2B, penghapus & papan alas',
                ]
            ).map((item, idx) => (
              <li key={idx}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className="border border-slate-200 rounded-2xl p-6 space-y-2">
          <Trophy className="w-5 h-5 text-[#0D9488]" />
          <h2 className="font-display font-bold text-lg text-[#1A2438]">Hadiah &amp; Fasilitas</h2>
          <ul className="text-sm text-slate-600 space-y-1.5 pt-1">
            {hadiahList.map((h) => (
              <li key={h.id}>
                <span className="font-semibold text-[#1A2438]">{h.peringkat}:</span> {h.hadiah}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tombol Juknis PDF */}
      <div className="border border-slate-200 rounded-2xl p-6 sm:p-7 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#0D9488] uppercase tracking-wide">Petunjuk Teknis Resmi (PDF)</p>
          <h2 className="font-display font-bold text-xl text-[#1A2438]">Dokumen Juknis Try Out TKA SD</h2>
          <p className="text-sm text-slate-600 inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{config?.event_location || 'SMP Negeri 2 Pulung'}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {tryoutPdf?.file_url ? (
            <>
              <a
                href={tryoutPdf.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka Juknis PDF</span>
              </a>
              <a
                href={`${tryoutPdf.file_url}?download=1`}
                download={tryoutPdf.file_name || 'juknis-tryout.pdf'}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:border-slate-300 text-slate-700 text-sm font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Unduh</span>
              </a>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('/juknis')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#0D9488]" />
              <span>Lihat Tombol Juknis PDF</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function MobileLegendsDetailPage({ config, content, onNavigate }: ActivityPageProps) {
  const hadiahList = (content?.hadiah || []).filter((h) => h.kegiatan === 'mobile-legends');
  const pdfList = config?.juknis_pdfs || [];
  const mlPdf =
    pdfList.find((x) => x.kegiatan === 'mobile-legends' && x.file_url) ||
    pdfList.find((x) => x.kegiatan === 'umum' && x.file_url);

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-sm font-semibold text-[#F26440]">Kompetisi Esport Pelajar · Gratis Rp0</p>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#1A2438] tracking-tight">
            {config?.ml_title || 'Turnamen Mobile Legends Spendapul 2026'}
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            {config?.ml_description ||
              'Kompetisi Mobile Legends 5v5 antar tim pelajar dengan aturan fair-play, verifikasi ID ML resmi, dan pertandingan langsung di Aula SMP Negeri 2 Pulung.'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
            <div>
              <p className="text-xs text-slate-500">Pelaksanaan</p>
              <p className="text-sm font-semibold text-[#1A2438] mt-0.5">
                {formatTanggalIndo(config?.event_date_ml || '2026-12-20')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Slot Tim Tersisa</p>
              <p className="text-sm font-mono font-semibold text-[#F26440] mt-0.5">
                {config ? `${config.remaining_ml} dari ${config.quota_ml} tim` : '32 tim'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Sasaran Peserta</p>
              <p className="text-sm font-semibold text-[#1A2438] mt-0.5">
                {config?.ml_scope || 'Pelajar SMP/Sederajat'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/daftar/mobile-legends')}
              disabled={!config?.reg_ml_open || config.remaining_ml <= 0}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F26440] hover:bg-[#DC4E2B] disabled:bg-slate-300 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <span>{config?.reg_ml_open ? 'Daftar Tim Gratis' : 'Pendaftaran Ditutup'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/bracket')}
              className="px-5 py-3 rounded-full border border-slate-200 hover:border-slate-300 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              Lihat Bracket &amp; Jadwal Tanding
            </button>
            {mlPdf?.file_url ? (
              <a
                href={mlPdf.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-slate-200 hover:border-slate-300 text-sm font-semibold text-slate-700"
              >
                <FileText className="w-4 h-4 text-[#F26440]" />
                <span>Juknis (PDF)</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('/juknis')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-slate-200 hover:border-slate-300 text-sm font-semibold text-slate-700 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#F26440]" />
                <span>Juknis (PDF)</span>
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[2/1] bg-white">
            <img
              src={APP_IMAGES.esports}
              alt="Kompetisi Mobile Legends Pelajar"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-slate-200 rounded-2xl p-6 space-y-2">
          <Gamepad2 className="w-5 h-5 text-[#F26440]" />
          <h2 className="font-display font-bold text-lg text-[#1A2438]">Format Pertandingan</h2>
          <ul className="text-sm text-slate-600 space-y-1.5 pt-1">
            {(config?.ml_format?.length
              ? config.ml_format
              : [
                  'Mode Custom Draft Pick 5v5',
                  'Penyisihan – Perempat Final: BO1',
                  'Semifinal & Grand Final: BO3',
                  'Konfirmasi ulang wajib H-1 via grup kapten',
                ]
            ).map((item, idx) => (
              <li key={idx}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className="border border-slate-200 rounded-2xl p-6 space-y-2">
          <ShieldAlert className="w-5 h-5 text-[#F26440]" />
          <h2 className="font-display font-bold text-lg text-[#1A2438]">Aturan Kelayakan</h2>
          <ul className="text-sm text-slate-600 space-y-1.5 pt-1">
            {(config?.ml_rules_summary?.length
              ? config.ml_rules_summary
              : [
                  '5 pemain inti + maksimal 1 cadangan',
                  '1 ID Mobile Legends hanya untuk 1 tim',
                  'Dilarang joki, akun ganda, atau cheat',
                  'Keterlambatan > 10 menit dikenakan WO',
                ]
            ).map((item, idx) => (
              <li key={idx}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className="border border-slate-200 rounded-2xl p-6 space-y-2">
          <Trophy className="w-5 h-5 text-[#F26440]" />
          <h2 className="font-display font-bold text-lg text-[#1A2438]">Hadiah Pemenang</h2>
          <ul className="text-sm text-slate-600 space-y-1.5 pt-1">
            {hadiahList.map((h) => (
              <li key={h.id}>
                <span className="font-semibold text-[#1A2438]">{h.peringkat}:</span> {h.hadiah}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl p-6 sm:p-7 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#F26440] uppercase tracking-wide">Petunjuk Teknis Resmi (PDF)</p>
          <h2 className="font-display font-bold text-xl text-[#1A2438]">Dokumen Juknis Mobile Legends</h2>
          <p className="text-sm text-slate-600 inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{config?.ml_tm_date || 'TM Online: 16 Des 2026'}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {mlPdf?.file_url ? (
            <>
              <a
                href={mlPdf.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F26440] hover:bg-[#DC4E2B] text-white text-sm font-semibold transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka Juknis PDF</span>
              </a>
              <a
                href={`${mlPdf.file_url}?download=1`}
                download={mlPdf.file_name || 'juknis-mlbb.pdf'}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:border-slate-300 text-slate-700 text-sm font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Unduh</span>
              </a>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('/juknis')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#F26440]" />
              <span>Lihat Tombol Juknis PDF</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
