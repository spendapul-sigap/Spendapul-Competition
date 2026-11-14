import { useState } from 'react';
import { CheckCircle2, Clock, Loader2, MessageCircle, Printer, Search, XCircle } from 'lucide-react';
import { QrCodeSvg } from '../components/QrCodeSvg';
import { api } from '../lib/api';
import { buildWaLink, formatTanggalIndo } from '../lib/format';
import type { CekStatusResult, PublicConfig } from '../types/spendapul';

interface CekStatusPageProps {
  config: PublicConfig | null;
}

export function CekStatusPage({ config }: CekStatusPageProps) {
  const [regCode, setRegCode] = useState('');
  const [wa, setWa] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CekStatusResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.cekStatus(regCode, wa);
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Gagal mengecek status.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBanner = (status: 'PENDING' | 'VERIFIED' | 'REJECTED', catatan: string) => {
    if (status === 'VERIFIED') {
      return (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Status: Terverifikasi (VERIFIED)</p>
            <p className="text-xs text-emerald-800 mt-0.5">{catatan || 'Data telah lolos verifikasi panitia.'}</p>
          </div>
        </div>
      );
    }
    if (status === 'REJECTED') {
      return (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900">
          <XCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Status: Ditolak / Perlu Perbaikan (REJECTED)</p>
            <p className="text-xs text-red-800 mt-0.5">Alasan: {catatan || 'Silakan hubungi panitia.'}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
        <Clock className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Status: Menunggu Verifikasi (PENDING)</p>
          <p className="text-xs text-amber-800 mt-0.5">
            Panitia sedang memeriksa kelayakan data Anda (maksimal 1×24 jam).
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-2 no-print">
        <p className="text-sm font-semibold text-[#F26440]">Layanan Mandiri Peserta</p>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1A2438]">
          Cek Status &amp; Unduh Kartu Peserta
        </h1>
        <p className="text-sm text-slate-600">
          Masukkan Kode Registrasi (misal <span className="font-mono">TO-0001</span> atau{' '}
          <span className="font-mono">ML-001</span>) beserta nomor WhatsApp yang didaftarkan.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-white grid grid-cols-1 sm:grid-cols-12 gap-4 items-end no-print"
      >
        <div className="sm:col-span-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kode Registrasi</label>
          <input
            type="text"
            required
            value={regCode}
            onChange={(e) => setRegCode(e.target.value.toUpperCase())}
            placeholder="TO-0001 / ML-001"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#F26440]"
          />
        </div>
        <div className="sm:col-span-5">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nomor WhatsApp Terdaftar</label>
          <input
            type="tel"
            required
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            placeholder="0812xxxxxxxx"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#F26440]"
          />
        </div>
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#F26440] hover:bg-[#DC4E2B] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Cek Status</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium no-print">
          {error}
        </div>
      )}

      {/* Result Display */}
      {result?.jenis === 'try-out' && result.peserta && (
        <div className="space-y-6">
          <div className="no-print">{renderStatusBanner(result.peserta.status, result.peserta.catatan)}</div>

          {result.peserta.status === 'VERIFIED' ? (
            <div className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white print-only-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold text-[#0D9488]">
                    {config?.event_name || 'Spendapul Competition 2026'} · SMP Negeri 2 Pulung
                  </p>
                  <h2 className="font-display font-bold text-xl text-[#1A2438]">Kartu Peserta Try Out TKA SD</h2>
                </div>
                <span className="font-mono text-sm font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-[#1A2438]">
                  {result.peserta.reg_code}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm flex-1 w-full">
                  <div>
                    <dt className="text-xs text-slate-500">Nama Peserta</dt>
                    <dd className="font-semibold text-[#1A2438]">{result.peserta.nama_lengkap}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Asal SD / MI</dt>
                    <dd className="font-semibold text-[#1A2438]">{result.peserta.asal_sd}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Nomor Peserta</dt>
                    <dd className="font-mono font-bold text-[#0D9488] text-base">
                      {result.peserta.no_peserta || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Ruang Ujian</dt>
                    <dd className="font-semibold text-[#1A2438]">{result.peserta.ruang || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Jadwal Pelaksanaan</dt>
                    <dd className="font-medium text-slate-700">
                      {formatTanggalIndo(config?.event_date_to || '2026-12-19')} · 07.30 WIB
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Status Check-in</dt>
                    <dd className="font-medium text-slate-700">
                      {result.peserta.checkin_at ? 'Sudah Check-in' : 'Belum Check-in'}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-col items-center gap-2 shrink-0">
                  <QrCodeSvg value={result.peserta.reg_code} size={140} />
                  <span className="text-[11px] font-mono text-slate-500">Scan saat registrasi ulang</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 no-print">
                <p className="text-xs text-slate-500">
                  Tunjukkan kartu ini (cetak atau layar HP) kepada panitia di gerbang masuk.
                </p>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A2438] hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Simpan PDF Kartu</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
              <div className="text-sm">
                <p className="font-semibold text-[#1A2438]">
                  {result.peserta.nama_lengkap} · {result.peserta.asal_sd}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Kode: {result.peserta.reg_code}</p>
              </div>
              <a
                href={buildWaLink(
                  config?.wa_panitia || '6281234567890',
                  `Halo Panitia, mohon bantuan info verifikasi kode ${result.peserta.reg_code}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#16A34A] text-white text-xs font-semibold self-start"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Hubungi Panitia</span>
              </a>
            </div>
          )}
        </div>
      )}

      {result?.jenis === 'mobile-legends' && result.tim && (
        <div className="space-y-6">
          <div className="no-print">{renderStatusBanner(result.tim.status, result.tim.catatan)}</div>

          {result.tim.status === 'VERIFIED' ? (
            <div className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white print-only-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold text-[#F26440]">
                    {config?.event_name || 'Spendapul Competition 2026'} · Mobile Legends
                  </p>
                  <h2 className="font-display font-bold text-xl text-[#1A2438]">Kartu Peserta Tim Esport</h2>
                </div>
                <span className="font-mono text-sm font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-[#1A2438]">
                  {result.tim.reg_code}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                <div className="space-y-4 flex-1 w-full">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Nama Tim</p>
                      <p className="font-bold text-[#1A2438] text-base">{result.tim.nama_tim}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Asal Sekolah</p>
                      <p className="font-semibold text-[#1A2438]">{result.tim.asal_sekolah}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Kapten</p>
                      <p className="font-medium text-slate-700">{result.tim.nama_kapten}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Seed / Status</p>
                      <p className="font-mono font-semibold text-[#F26440]">{result.tim.seed || 'Terverifikasi'}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Daftar Pemain Terdaftar</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {(result.tim.anggota || []).map((a) => (
                        <div key={a.member_id} className="flex items-center justify-between py-1 px-2.5 rounded bg-slate-50">
                          <span className="font-medium text-[#1A2438]">
                            {a.nickname_ingame} <span className="text-slate-400">({a.peran})</span>
                          </span>
                          <span className="font-mono text-slate-500">
                            {a.id_ml} ({a.server_id})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 shrink-0">
                  <QrCodeSvg value={result.tim.reg_code} size={140} />
                  <span className="text-[11px] font-mono text-slate-500">Check-in Tim Hari-H</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 no-print">
                <p className="text-xs text-slate-500">
                  Kapten wajib hadir 15 menit sebelum jadwal pertandingan di Aula SMP Negeri 2 Pulung.
                </p>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A2438] hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Simpan PDF Kartu Tim</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
              <div className="text-sm">
                <p className="font-semibold text-[#1A2438]">
                  Tim {result.tim.nama_tim} · {result.tim.asal_sekolah}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Kode: {result.tim.reg_code}</p>
              </div>
              <a
                href={buildWaLink(
                  config?.wa_panitia || '6281234567890',
                  `Halo Panitia, mohon bantuan info verifikasi tim ${result.tim.reg_code} (${result.tim.nama_tim}).`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#16A34A] text-white text-xs font-semibold self-start"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Hubungi Panitia</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
