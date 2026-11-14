import { useState, type ReactNode } from 'react';
import { Menu, MessageCircle, X } from 'lucide-react';
import { buildWaLink } from '../lib/format';
import type { PublicConfig } from '../types/spendapul';

interface LayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  config: PublicConfig | null;
  children: ReactNode;
  hideFooter?: boolean;
}

export function Layout({ currentPath, onNavigate, config, children, hideFooter = false }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setMobileOpen(false);
    onNavigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems = [
    { label: 'Try Out', path: '/try-out' },
    { label: 'Mobile Legends', path: '/mobile-legends' },
    { label: 'Juknis', path: '/juknis' },
    { label: 'Jadwal', path: '/jadwal' },
    { label: 'Cek Status', path: '/cek-status' },
  ];

  const waHref = buildWaLink(
    config?.wa_panitia || '6281234567890',
    'Halo Panitia Spendapul Competition SMPN 2 Pulung, saya ingin bertanya mengenai pendaftaran.',
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Top Bar strictly following 3-zone contract & reference image aesthetic */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 no-print">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => handleLink(e, '/')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26440] rounded-lg"
          >
            <span className="w-8 h-8 rounded-lg bg-[#F26440] text-white font-display font-extrabold text-sm flex items-center justify-center tracking-tight">
              SP
            </span>
            <span className="font-display font-extrabold text-lg tracking-tight text-[#1A2438]">
              Spendapul
            </span>
          </a>

          {/* Zone 2: 5 concise single-line text links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600" aria-label="Navigasi utama">
            {navItems.map((item) => {
              const active = currentPath === item.path;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => handleLink(e, item.path)}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 ${
                    active
                      ? 'text-[#1A2438] border-[#F26440] font-semibold'
                      : 'border-transparent hover:text-[#1A2438] hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary CTA button (coral-orange pill matching reference image) */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/daftar/try-out"
              onClick={(e) => handleLink(e, '/#kegiatan')}
              className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#F26440] hover:bg-[#DC4E2B] text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 shadow-sm shadow-[#F26440]/20"
            >
              Daftar Gratis
            </a>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              className="md:hidden w-11 h-11 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleLink(e, item.path)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                  currentPath === item.path ? 'bg-[#FFF3EF] text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </a>
            ))}
            <div className="pt-2 grid grid-cols-2 gap-2 border-t border-slate-100">
              <a
                href="/daftar/try-out"
                onClick={(e) => handleLink(e, '/daftar/try-out')}
                className="flex items-center justify-center py-2.5 px-3 rounded-lg bg-[#0D9488] text-white text-xs font-semibold"
              >
                Daftar Try Out
              </a>
              <a
                href="/daftar/mobile-legends"
                onClick={(e) => handleLink(e, '/daftar/mobile-legends')}
                className="flex items-center justify-center py-2.5 px-3 rounded-lg bg-[#F26440] text-white text-xs font-semibold"
              >
                Daftar Tim ML
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Quiet, Organized Footer */}
      {!hideFooter && (
        <footer className="bg-[#0F172A] text-slate-300 border-t border-slate-800 no-print">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-14">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
              <div className="md:col-span-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-[#F26440] text-white font-display font-extrabold text-sm flex items-center justify-center">
                    SP
                  </span>
                  <span className="font-display font-bold text-lg text-white">
                    {config?.event_name || 'Spendapul Competition 2026'}
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                  {config?.footer_description ||
                    `Pusat informasi resmi dan pendaftaran gratis Try Out TKA SD serta Kompetisi Mobile Legends pelajar yang diselenggarakan oleh ${config?.school_name || 'SMP Negeri 2 Pulung'}.`}
                </p>
                <p className="text-xs text-slate-400 pt-1">
                  {config?.school_address || 'Jl. Raya Pulung–Sooko, Kec. Pulung, Kab. Ponorogo, Jawa Timur'}
                </p>
              </div>

              <div className="md:col-span-2 space-y-2.5 text-sm">
                <h3 className="font-display font-semibold text-white">Kegiatan</h3>
                <ul className="space-y-2 text-slate-400">
                  <li>
                    <a href="/try-out" onClick={(e) => handleLink(e, '/try-out')} className="hover:text-white transition-colors">
                      Try Out TKA SD
                    </a>
                  </li>
                  <li>
                    <a
                      href="/mobile-legends"
                      onClick={(e) => handleLink(e, '/mobile-legends')}
                      className="hover:text-white transition-colors"
                    >
                      Mobile Legends
                    </a>
                  </li>
                  <li>
                    <a href="/juknis" onClick={(e) => handleLink(e, '/juknis')} className="hover:text-white transition-colors">
                      Juknis Lomba
                    </a>
                  </li>
                  <li>
                    <a href="/jadwal" onClick={(e) => handleLink(e, '/jadwal')} className="hover:text-white transition-colors">
                      Jadwal Acara
                    </a>
                  </li>
                </ul>
              </div>

              <div className="md:col-span-3 space-y-2.5 text-sm">
                <h3 className="font-display font-semibold text-white">Peserta & Informasi</h3>
                <ul className="space-y-2 text-slate-400">
                  <li>
                    <a href="/cek-status" onClick={(e) => handleLink(e, '/cek-status')} className="hover:text-white transition-colors">
                      Cek Status & Kartu Peserta
                    </a>
                  </li>
                  <li>
                    <a href="/peserta" onClick={(e) => handleLink(e, '/peserta')} className="hover:text-white transition-colors">
                      Daftar Peserta Terverifikasi
                    </a>
                  </li>
                  <li>
                    <a href="/bracket" onClick={(e) => handleLink(e, '/bracket')} className="hover:text-white transition-colors">
                      Bracket & Skor ML
                    </a>
                  </li>
                </ul>
              </div>

              <div className="md:col-span-2 space-y-2.5 text-sm">
                <h3 className="font-display font-semibold text-white">Bantuan</h3>
                <ul className="space-y-2 text-slate-400">
                  <li>
                    <a
                      href="/pengumuman"
                      onClick={(e) => handleLink(e, '/pengumuman')}
                      className="hover:text-white transition-colors"
                    >
                      Pengumuman
                    </a>
                  </li>
                  <li>
                    <a href="/faq" onClick={(e) => handleLink(e, '/faq')} className="hover:text-white transition-colors">
                      FAQ
                    </a>
                  </li>
                  <li>
                    <a href="/galeri" onClick={(e) => handleLink(e, '/galeri')} className="hover:text-white transition-colors">
                      Galeri
                    </a>
                  </li>
                  <li>
                    <a href="/kontak" onClick={(e) => handleLink(e, '/kontak')} className="hover:text-white transition-colors">
                      Kontak & Lokasi
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
              <p>© 2026 Panitia Spendapul Competition · SMP Negeri 2 Pulung · Seluruh kegiatan bebas biaya (Rp0).</p>
              <a
                href="/login"
                onClick={(e) => handleLink(e, '/login')}
                className="text-slate-400 hover:text-white transition-colors"
              >
                Masuk Panel Admin
              </a>
            </div>
          </div>
        </footer>
      )}

      {/* Subtle Floating WhatsApp Panitia button */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Hubungi Panitia via WhatsApp"
        className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-semibold shadow-md transition-transform duration-150 hover:scale-[1.02] no-print"
      >
        <MessageCircle className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">Tanya Panitia</span>
      </a>
    </div>
  );
}
