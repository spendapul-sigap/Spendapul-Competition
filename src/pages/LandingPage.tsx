import { useState } from 'react';
import { ArrowRight, Calendar, ChevronDown, ChevronRight, FileText, MapPin, Trophy, Users } from 'lucide-react';
import { formatTanggalIndo, useCountdown } from '../lib/format';
import { APP_IMAGES } from '../lib/images';
import type { PublicConfig, PublicContent } from '../types/spendapul';

interface LandingPageProps {
  config: PublicConfig | null;
  content: PublicContent | null;
  onNavigate: (path: string) => void;
}

export function LandingPage({ config, content, onNavigate }: LandingPageProps) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const countdown = useCountdown(config?.reg_to_deadline || '2026-12-12T23:59');

  const toPct = config ? Math.min(100, Math.round((config.count_to_active / Math.max(1, config.quota_to)) * 100)) : 0;
  const mlPct = config ? Math.min(100, Math.round((config.count_ml_active / Math.max(1, config.quota_ml)) * 100)) : 0;

  const pdfList = config?.juknis_pdfs || [];
  const tryoutPdf =
    pdfList.find((x) => x.kegiatan === 'try-out' && x.file_url) ||
    pdfList.find((x) => x.kegiatan === 'umum' && x.file_url);
  const mlPdf =
    pdfList.find((x) => x.kegiatan === 'mobile-legends' && x.file_url) ||
    pdfList.find((x) => x.kegiatan === 'umum' && x.file_url);

  const scrollToActivities = () => {
    const el = document.getElementById('kegiatan');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-white">
      {/* 1. HERO SECTION — Directly inspired by reference image layout & color energy */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-10 pb-14 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-6">
            <p className="text-sm font-semibold text-[#F26440] tracking-tight">
              {config?.event_name || 'Spendapul Competition 2026'} · {config?.school_name || 'SMP Negeri 2 Pulung'}
            </p>

            <h1 className="font-display font-extrabold text-[#1A2438] text-[clamp(2.2rem,4vw,3.35rem)] leading-[1.12] tracking-tight [text-wrap:balance]">
              {config?.hero_title || 'Ajang Prestasi Pelajar & Kompetisi Gratis di SMPN 2 Pulung'}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              {config?.hero_subtitle ||
                'Ikuti Try Out TKA SD untuk siswa kelas 6 SD/MI dan Turnamen Mobile Legends antar pelajar tanpa biaya pendaftaran. Daftar online, unduh kartu QR, dan pantau hasil secara transparan.'}
            </p>

            {/* Unboxed Countdown & Key Meta */}
            <div className="pt-1 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F26440] shrink-0" />
                <span>{config?.hero_date_label || '19–20 Desember 2026'}</span>
              </div>
              <span aria-hidden="true" className="text-slate-300 hidden sm:inline">
                |
              </span>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#F26440] shrink-0" />
                <span>{config?.event_location || 'Kampus SMP Negeri 2 Pulung'}</span>
              </div>
            </div>

            {!countdown.expired && (
              <div className="inline-flex items-center gap-4 py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs font-medium text-slate-500">Tutup pendaftaran dalam</span>
                <div className="flex items-center gap-2 font-mono text-sm font-semibold text-[#1A2438] tabular-nums">
                  <span>{String(countdown.days).padStart(2, '0')}h</span>
                  <span className="text-slate-300">:</span>
                  <span>{String(countdown.hours).padStart(2, '0')}j</span>
                  <span className="text-slate-300">:</span>
                  <span>{String(countdown.minutes).padStart(2, '0')}m</span>
                  <span className="text-slate-300">:</span>
                  <span className="text-[#F26440]">{String(countdown.seconds).padStart(2, '0')}d</span>
                </div>
              </div>
            )}

            {/* Primary & Secondary CTAs matching reference image */}
            <div className="pt-2 flex flex-wrap items-center gap-6">
              <button
                type="button"
                onClick={scrollToActivities}
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full bg-[#F26440] hover:bg-[#DC4E2B] text-white font-semibold text-sm sm:text-base transition-colors duration-150 shadow-sm shadow-[#F26440]/25 cursor-pointer"
              >
                <span>Daftar Gratis</span>
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/cek-status')}
                className="inline-flex items-center gap-1.5 text-sm sm:text-base font-semibold text-[#1A2438] hover:text-[#F26440] transition-colors cursor-pointer"
              >
                <span>Cek Status Peserta</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column — Organic Coral Blob Stage framing student cutout directly like reference */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <div className="relative w-full max-w-[520px] h-[340px] sm:h-[420px] flex items-end justify-center">
              {/* Signature organic coral shape inspired by reference image */}
              <svg
                viewBox="0 0 500 420"
                aria-hidden="true"
                className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[92%] h-[86%] text-[#F26440]"
                fill="currentColor"
              >
                <path d="M98.5,64.2C151.4,24.8,233.7,12.5,307.2,33.9C380.7,55.3,445.4,110.4,462.6,181.2C479.8,252,449.5,338.5,387.4,376.4C325.3,414.3,231.4,403.6,155.3,372.4C79.2,341.2,20.9,289.5,14.8,224.2C8.7,158.9,45.6,103.6,98.5,64.2Z" />
              </svg>

              {/* Main student cutout photo */}
              <div className="relative z-10 w-full h-full flex items-end justify-center overflow-hidden">
                <img
                  src={APP_IMAGES.hero}
                  alt="Pelajar SMP Negeri 2 Pulung mengikuti Spendapul Competition"
                  referrerPolicy="no-referrer"
                  className="h-[132%] w-auto max-w-none object-contain object-bottom drop-shadow-md select-none"
                />
              </div>

              {/* Clean Domain Floating Card (bottom right like reference badge) */}
              <div className="hidden sm:flex absolute bottom-2 right-2 z-20 items-center gap-3 px-4 py-3 rounded-xl bg-[#1E3A8A] text-white shadow-lg">
                <Trophy className="w-5 h-5 text-[#FDBA74] shrink-0" />
                <div>
                  <p className="text-xs font-bold leading-tight">
                    {config?.hero_badge_title || '100% Gratis · Terbuka'}
                  </p>
                  <p className="text-[11px] text-blue-100 leading-tight mt-0.5">
                    {config?.hero_badge_subtitle || 'Sertifikat & Tropi Pembinaan'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Proof / Quota Strip */}
        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-2xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/50">
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium text-slate-500">Sisa Kuota Try Out SD</p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-[#1A2438] tabular-nums">
              {config ? `${config.remaining_to} / ${config.quota_to}` : '200'}
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium text-slate-500">Sisa Slot Tim ML</p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-[#1A2438] tabular-nums">
              {config ? `${config.remaining_ml} / ${config.quota_ml}` : '32'}
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium text-slate-500">Biaya Pendaftaran</p>
            <p className="mt-1.5 font-display text-2xl font-bold text-[#0D9488]">Rp0 (Gratis)</p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium text-slate-500">Peserta Terverifikasi</p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-[#1A2438] tabular-nums">
              {config ? config.count_to_verified + config.count_ml_verified : 0}
            </p>
          </div>
        </div>
      </section>

      {/* 2. DUA KARTU KEGIATAN */}
      <section id="kegiatan" className="bg-slate-50 border-y border-slate-200/70 py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-sm font-semibold text-[#F26440]">Pilihan Cabang Lomba</p>
              <h2 className="mt-1 font-display font-bold text-2xl sm:text-3xl text-[#1A2438] tracking-tight">
                Dua Kegiatan Utama Spendapul Competition
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/peserta')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E3A8A] hover:underline self-start md:self-auto cursor-pointer"
            >
              <span>Lihat Daftar Peserta Terverifikasi</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card 1: Try Out TKA SD */}
            <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="aspect-[2/1] bg-white overflow-hidden">
                <img
                  src={APP_IMAGES.tryout}
                  alt="Try Out TKA SD di SMP Negeri 2 Pulung"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-[#0D9488]">Try Out Akademik</span>
                    <span aria-hidden="true">·</span>
                    <span>Individu Kelas 6 SD/MI</span>
                    <span aria-hidden="true">·</span>
                    <span>Gratis</span>
                  </div>
                  <h3 className="font-display font-bold text-xl sm:text-2xl text-[#1A2438]">
                    {config?.to_title || 'Try Out TKA SD Tingkat Kecamatan'}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {config?.to_description ||
                      'Uji kesiapan menghadapi Tes Kemampuan Akademik dengan soal terstandar (Bahasa Indonesia, Matematika, dan IPA/Pengetahuan Umum) secara tatap muka di ruang ujian SMP Negeri 2 Pulung.'}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Quota progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Keterisian Kuota</span>
                      <span className="font-mono font-semibold text-slate-800 tabular-nums">
                        {config?.count_to_active ?? 0} / {config?.quota_to ?? 200} peserta
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-[#0D9488] rounded-full transition-all" style={{ width: `${toPct}%` }} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigate('/daftar/try-out')}
                      disabled={!config?.reg_to_open || config.remaining_to <= 0}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-slate-300 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <span>{config?.reg_to_open ? 'Daftar Try Out' : 'Pendaftaran Tutup'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('/try-out')}
                      className="px-4 py-2.5 rounded-full border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium transition-colors cursor-pointer"
                    >
                      Detail &amp; Syarat
                    </button>
                    {tryoutPdf?.file_url ? (
                      <a
                        href={tryoutPdf.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium transition-colors"
                      >
                        <FileText className="w-4 h-4 text-[#0D9488]" />
                        <span>Juknis PDF</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigate('/juknis')}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-[#0D9488]" />
                        <span>Juknis PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>

            {/* Card 2: Mobile Legends */}
            <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="aspect-[2/1] bg-white overflow-hidden">
                <img
                  src={APP_IMAGES.esports}
                  alt="Kompetisi Mobile Legends Pelajar Spendapul"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-[#F26440]">Kompetisi Esport</span>
                    <span aria-hidden="true">·</span>
                    <span>Tim 5 Utama + 1 Cadangan</span>
                    <span aria-hidden="true">·</span>
                    <span>Gratis</span>
                  </div>
                  <h3 className="font-display font-bold text-xl sm:text-2xl text-[#1A2438]">
                    {config?.ml_title || 'Turnamen Mobile Legends Pelajar'}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {config?.ml_description ||
                      `Tunjukkan strategi dan sportivitas tim sekolahmu pada mode 5v5 Custom Draft Pick. Terbuka untuk ${config?.ml_scope || 'pelajar SMP/MTs sederajat'} dengan sistem gugur dan grand final BO3.`}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Keterisian Slot Tim</span>
                      <span className="font-mono font-semibold text-slate-800 tabular-nums">
                        {config?.count_ml_active ?? 0} / {config?.quota_ml ?? 32} tim
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-[#F26440] rounded-full transition-all" style={{ width: `${mlPct}%` }} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigate('/daftar/mobile-legends')}
                      disabled={!config?.reg_ml_open || config.remaining_ml <= 0}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#F26440] hover:bg-[#DC4E2B] disabled:bg-slate-300 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <span>{config?.reg_ml_open ? 'Daftar Tim ML' : 'Pendaftaran Tutup'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('/mobile-legends')}
                      className="px-4 py-2.5 rounded-full border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium transition-colors cursor-pointer"
                    >
                      Aturan &amp; Bracket
                    </button>
                    {mlPdf?.file_url ? (
                      <a
                        href={mlPdf.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium transition-colors"
                      >
                        <FileText className="w-4 h-4 text-[#F26440]" />
                        <span>Juknis PDF</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigate('/juknis')}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-[#F26440]" />
                        <span>Juknis PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 3. ALUR PENDAFTARAN (4 langkah bersih tanpa card bersarang) */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16 lg:py-20">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold text-[#F26440]">Alur Mudah Tanpa Login</p>
          <h2 className="mt-1 font-display font-bold text-2xl sm:text-3xl text-[#1A2438] tracking-tight">
            Empat Langkah Mengikuti Acara
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 border-t border-slate-200 pt-8">
          {(config?.alur_steps?.length
            ? config.alur_steps
            : [
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
              ]
          ).map((step) => (
            <div key={step.no} className="space-y-2.5">
              <p className="font-mono text-sm font-bold text-[#F26440]">{step.no}</p>
              <h3 className="font-display font-bold text-lg text-[#1A2438]">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. JADWAL & HADIAH (Split Clean Layout) */}
      <section className="bg-slate-50 border-y border-slate-200/70 py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Jadwal Penting */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#F26440]">Agenda Resmi</p>
                <h2 className="mt-1 font-display font-bold text-2xl text-[#1A2438]">Jadwal Penting</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/jadwal')}
                className="text-sm font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
              >
                Lihat Semua
              </button>
            </div>

            <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white rounded-2xl px-6">
              {(content?.jadwal || []).slice(0, 4).map((j) => (
                <div key={j.id} className="py-5 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                    <span>
                      {formatTanggalIndo(j.tanggal_mulai)}
                      {j.tanggal_selesai !== j.tanggal_mulai ? ` – ${formatTanggalIndo(j.tanggal_selesai)}` : ''}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-sans font-medium text-[#0D9488]">{j.lokasi}</span>
                  </div>
                  <h3 className="font-display font-bold text-base text-[#1A2438]">{j.judul}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{j.deskripsi}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hadiah & Fasilitas */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <p className="text-sm font-semibold text-[#F26440]">Penghargaan</p>
              <h2 className="mt-1 font-display font-bold text-2xl text-[#1A2438]">Hadiah &amp; Fasilitas Peserta</h2>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="font-display font-bold text-sm text-[#0D9488] pb-2 border-b border-slate-100">
                  Try Out TKA SD
                </h3>
                <ul className="mt-3 space-y-2.5 text-sm">
                  {(content?.hadiah || [])
                    .filter((h) => h.kegiatan === 'try-out')
                    .map((h) => (
                      <li key={h.id} className="flex items-start justify-between gap-4">
                        <span className="font-semibold text-[#1A2438] shrink-0">{h.peringkat}</span>
                        <span className="text-slate-600 text-right">{h.hadiah}</span>
                      </li>
                    ))}
                </ul>
              </div>

              <div>
                <h3 className="font-display font-bold text-sm text-[#F26440] pb-2 border-b border-slate-100">
                  Kompetisi Mobile Legends
                </h3>
                <ul className="mt-3 space-y-2.5 text-sm">
                  {(content?.hadiah || [])
                    .filter((h) => h.kegiatan === 'mobile-legends')
                    .map((h) => (
                      <li key={h.id} className="flex items-start justify-between gap-4">
                        <span className="font-semibold text-[#1A2438] shrink-0">{h.peringkat}</span>
                        <span className="text-slate-600 text-right">{h.hadiah}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PENGUMUMAN TERBARU */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16 lg:py-20">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-[#F26440]">Informasi Terkini</p>
            <h2 className="mt-1 font-display font-bold text-2xl sm:text-3xl text-[#1A2438]">Pengumuman Terbaru</h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/pengumuman')}
            className="text-sm font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
          >
            Semua Pengumuman
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(content?.pengumuman || []).slice(0, 3).map((item) => (
            <article key={item.id} className="border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4 bg-white">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-[#1E3A8A]">{item.kategori}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{formatTanggalIndo(item.tanggal)}</span>
                  {item.pinned && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[#F26440]">Penting</span>
                    </>
                  )}
                </div>
                <h3 className="font-display font-bold text-lg text-[#1A2438] leading-snug">{item.judul}</h3>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{item.isi}</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/pengumuman')}
                className="text-sm font-semibold text-[#F26440] hover:underline self-start cursor-pointer"
              >
                Baca selengkapnya
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* 6. FAQ RINGKAS */}
      <section className="bg-slate-50 border-t border-slate-200/70 py-16 lg:py-20">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-sm font-semibold text-[#F26440]">Pertanyaan Umum</p>
              <h2 className="mt-1 font-display font-bold text-2xl sm:text-3xl text-[#1A2438]">FAQ Pendaftaran</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/faq')}
              className="text-sm font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
            >
              Semua FAQ
            </button>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl bg-white">
            {(content?.faq || []).slice(0, 5).map((f) => {
              const isOpen = openFaqId === f.id;
              return (
                <div key={f.id}>
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? null : f.id)}
                    aria-expanded={isOpen}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <span className="font-display font-semibold text-sm sm:text-base text-[#1A2438]">
                      {f.pertanyaan}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-150 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">{f.jawaban}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. SPONSOR & DUKUNGAN */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Users className="w-4 h-4 text-slate-400" />
            <span>Didukung oleh</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {(content?.sponsor || []).map((s) => (
              <div key={s.id} className="text-sm font-display font-bold text-slate-700">
                {s.nama}
                <span className="ml-1.5 text-xs font-normal text-slate-400">({s.tier})</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
