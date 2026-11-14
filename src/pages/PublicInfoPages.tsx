import { useEffect, useState } from 'react';
import { ChevronDown, Download, ExternalLink, FileText, MapPin, MessageCircle, Search, Trophy } from 'lucide-react';
import { api } from '../lib/api';
import { buildWaLink, formatTanggalIndo, normalizeWaDisplay } from '../lib/format';
import { getGalleryImage } from '../lib/images';
import type { HasilTO, JuknisPdfFile, MaskedPesertaPublic, MatchML, PublicConfig, PublicContent } from '../types/spendapul';

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function JuknisPage({ config }: { config: PublicConfig | null }) {
  const defaultSlots: JuknisPdfFile[] = [
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
  ];

  const items = config?.juknis_pdfs?.length ? config.juknis_pdfs : defaultSlots;

  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <p className="text-sm font-semibold text-[#F26440]">Dokumen Resmi Acara (PDF)</p>
        <h1 className="mt-1 font-display font-extrabold text-3xl text-[#1A2438]">Petunjuk Teknis (Juknis)</h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600">
          Klik tombol di bawah untuk membuka atau mengunduh dokumen Petunjuk Teknis resmi dalam format PDF.
        </p>
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const hasFile = Boolean(item.file_url);
          const categoryLabel =
            item.kegiatan === 'try-out'
              ? 'Try Out TKA SD'
              : item.kegiatan === 'mobile-legends'
                ? 'Mobile Legends'
                : 'Ketentuan Umum';

          return (
            <div
              key={item.id}
              className="border border-slate-200 rounded-2xl bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    hasFile ? 'bg-[#F26440]/10 text-[#F26440]' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-[#F26440] uppercase tracking-wide">{categoryLabel}</span>
                  <h2 className="font-display font-bold text-base sm:text-lg text-[#1A2438] leading-snug">
                    {item.label}
                  </h2>
                  {hasFile ? (
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {item.file_name}
                      {item.file_size ? ` · ${formatFileSize(item.file_size)}` : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">
                      File PDF sedang disiapkan panitia dan akan segera tersedia.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {hasFile ? (
                  <>
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F26440] hover:bg-[#DC4E2B] text-white text-sm font-semibold transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Buka Juknis PDF</span>
                    </a>
                    <a
                      href={`${item.file_url}?download=1`}
                      download={item.file_name || 'juknis.pdf'}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh</span>
                    </a>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-100 text-slate-400 text-sm font-semibold cursor-not-allowed"
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF Segera Tersedia</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function JadwalPage({ content }: { content: PublicContent | null }) {
  const [filter, setFilter] = useState<'all' | 'umum' | 'try-out' | 'mobile-legends'>('all');
  const items = (content?.jadwal || []).filter((j) => filter === 'all' || j.kegiatan === filter);

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <p className="text-sm font-semibold text-[#F26440]">Timeline Pelaksanaan</p>
        <h1 className="mt-1 font-display font-extrabold text-3xl text-[#1A2438]">Jadwal Spendapul Competition</h1>
      </div>

      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { id: 'all', label: 'Semua Agenda' },
          { id: 'umum', label: 'Umum' },
          { id: 'try-out', label: 'Try Out' },
          { id: 'mobile-legends', label: 'Mobile Legends' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as typeof filter)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              filter === tab.id ? 'bg-white text-[#1A2438] shadow-sm' : 'text-slate-600 hover:text-[#1A2438]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl bg-white px-6">
        {items.map((j) => (
          <div key={j.id} className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 space-y-1">
              <p className="font-mono text-xs font-semibold text-[#F26440]">
                {formatTanggalIndo(j.tanggal_mulai)}
                {j.tanggal_selesai !== j.tanggal_mulai ? ` – ${formatTanggalIndo(j.tanggal_selesai)}` : ''}
              </p>
              <p className="text-xs text-slate-500">{j.lokasi}</p>
            </div>
            <div className="md:col-span-8 space-y-1.5">
              <h2 className="font-display font-bold text-lg text-[#1A2438]">{j.judul}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{j.deskripsi}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PengumumanPage({ content }: { content: PublicContent | null }) {
  const [query, setQuery] = useState('');
  const items = (content?.pengumuman || []).filter(
    (p) =>
      p.judul.toLowerCase().includes(query.toLowerCase()) ||
      p.isi.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#F26440]">Papan Informasi</p>
          <h1 className="mt-1 font-display font-extrabold text-3xl text-[#1A2438]">Pengumuman Resmi</h1>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pengumuman..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <article key={item.id} className="border border-slate-200 rounded-2xl p-6 bg-white space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#1E3A8A]">{item.kategori}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{formatTanggalIndo(item.tanggal)}</span>
              {item.pinned && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[#F26440]">Disematkan</span>
                </>
              )}
            </div>
            <h2 className="font-display font-bold text-xl text-[#1A2438]">{item.judul}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{item.isi}</p>
          </article>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-slate-500 py-8 text-center">Belum ada pengumuman yang sesuai pencarian.</p>
        )}
      </div>
    </div>
  );
}

export function PesertaPublicPage() {
  const [tab, setTab] = useState<'to' | 'ml'>('to');
  const [data, setData] = useState<MaskedPesertaPublic | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.getPesertaPublic().then(setData).catch(() => {});
  }, []);

  const filteredTo = (data?.to || []).filter(
    (p) =>
      p.nama_samaran.toLowerCase().includes(query.toLowerCase()) ||
      p.asal_sd.toLowerCase().includes(query.toLowerCase()) ||
      p.reg_code.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredMl = (data?.ml || []).filter(
    (t) =>
      t.nama_tim.toLowerCase().includes(query.toLowerCase()) ||
      t.asal_sekolah.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#F26440]">Transparansi Kuota</p>
          <h1 className="mt-1 font-display font-extrabold text-3xl text-[#1A2438]">Peserta Terverifikasi</h1>
          <p className="text-xs text-slate-500 mt-1">
            Demi privasi anak, nama peserta Try Out disamarkan sebagian dan tanpa data kontak.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari sekolah atau kode..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setTab('to')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            tab === 'to' ? 'bg-white text-[#1A2438] shadow-sm' : 'text-slate-600'
          }`}
        >
          Try Out TKA SD ({data?.to.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setTab('ml')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            tab === 'ml' ? 'bg-white text-[#1A2438] shadow-sm' : 'text-slate-600'
          }`}
        >
          Tim Mobile Legends ({data?.ml.length ?? 0})
        </button>
      </div>

      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
        {tab === 'to' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">No. Peserta</th>
                  <th className="py-3 px-4">Nama (Disamarkan)</th>
                  <th className="py-3 px-4">Asal SD/MI</th>
                  <th className="py-3 px-4">Ruang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTo.map((p) => (
                  <tr key={p.reg_code} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#1A2438]">{p.reg_code}</td>
                    <td className="py-3 px-4 font-mono text-xs text-[#0D9488] font-semibold">{p.no_peserta}</td>
                    <td className="py-3 px-4 font-medium text-[#1A2438]">{p.nama_samaran}</td>
                    <td className="py-3 px-4 text-slate-600">{p.asal_sd}</td>
                    <td className="py-3 px-4 text-slate-600">{p.ruang}</td>
                  </tr>
                ))}
                {filteredTo.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 px-4 text-center text-sm text-slate-500">
                      Belum ada peserta Try Out TKA SD yang terverifikasi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-3 px-4">Kode Tim</th>
                  <th className="py-3 px-4">Nama Tim</th>
                  <th className="py-3 px-4">Asal Sekolah</th>
                  <th className="py-3 px-4">Seed</th>
                  <th className="py-3 px-4 text-right">Pemain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMl.map((t) => (
                  <tr key={t.reg_code} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#1A2438]">{t.reg_code}</td>
                    <td className="py-3 px-4 font-semibold text-[#1A2438]">{t.nama_tim}</td>
                    <td className="py-3 px-4 text-slate-600">{t.asal_sekolah}</td>
                    <td className="py-3 px-4 font-mono text-xs text-[#F26440]">{t.seed}</td>
                    <td className="py-3 px-4 font-mono text-right">{t.jumlah_pemain}</td>
                  </tr>
                ))}
                {filteredMl.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 px-4 text-center text-sm text-slate-500">
                      Belum ada tim Mobile Legends yang terverifikasi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function BracketPage() {
  const [matches, setMatches] = useState<MatchML[]>([]);

  useEffect(() => {
    api.getBracket().then(setMatches).catch(() => {});
  }, []);

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <p className="text-sm font-semibold text-[#F26440]">Turnamen Mobile Legends</p>
        <h1 className="mt-1 font-display font-extrabold text-3xl text-[#1A2438]">Bagan Pertandingan &amp; Skor</h1>
      </div>

      {matches.length === 0 ? (
        <div className="border border-slate-200 rounded-2xl p-8 bg-slate-50 text-center space-y-2">
          <Trophy className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="font-display font-bold text-xl text-[#1A2438]">Bagan Pertandingan Belum Tersedia</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Bagan &amp; jadwal pertandingan Mobile Legends akan diumumkan panitia setelah proses verifikasi dan Technical Meeting selesai.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map((m) => (
            <div key={m.match_id} className="border border-slate-200 rounded-2xl p-6 bg-white space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1E3A8A]">{m.babak}</span>
                <span
                  className={`font-semibold ${
                    m.status === 'Live'
                      ? 'text-[#DC2626]'
                      : m.status === 'Selesai'
                        ? 'text-[#16A34A]'
                        : 'text-slate-500'
                  }`}
                >
                  Status: {m.status}
                </span>
              </div>

              <div className="space-y-2">
                <div
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    m.pemenang && m.pemenang === m.tim_a
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  <span className="font-display font-bold text-sm text-[#1A2438]">{m.tim_a}</span>
                  <span className="font-mono text-lg font-bold text-[#1A2438]">{m.skor_a}</span>
                </div>
                <div
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    m.pemenang && m.pemenang === m.tim_b
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  <span className="font-display font-bold text-sm text-[#1A2438]">{m.tim_b}</span>
                  <span className="font-mono text-lg font-bold text-[#1A2438]">{m.skor_b}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>{m.jadwal}</span>
                {m.link_live && (
                  <a
                    href={m.link_live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#F26440] font-semibold hover:underline"
                  >
                    <span>Tonton Live</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HasilPage() {
  const [data, setData] = useState<{
    published: boolean;
    hasil_to: HasilTO[];
    juara_ml: Array<{ peringkat: string; nama_tim: string }>;
  } | null>(null);

  useEffect(() => {
    api.getHasil().then(setData).catch(() => {});
  }, []);

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <p className="text-sm font-semibold text-[#F26440]">Rekapitulasi Resmi</p>
        <h1 className="mt-1 font-display font-extrabold text-3xl text-[#1A2438]">Hasil Try Out &amp; Juara Lomba</h1>
      </div>

      {!data?.published ? (
        <div className="border border-slate-200 rounded-2xl p-8 bg-slate-50 text-center space-y-2">
          <Trophy className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="font-display font-bold text-xl text-[#1A2438]">Hasil Belum Dipublikasikan</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Rekapitulasi skor Try Out TKA SD dan daftar juara Mobile Legends akan dibuka oleh panitia setelah seluruh
            rangkaian acara selesai dilaksanakan.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {data.juara_ml.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.juara_ml.map((j) => (
                <div key={j.peringkat} className="border border-slate-200 rounded-2xl p-6 bg-white">
                  <p className="text-xs font-semibold text-[#F26440]">{j.peringkat} Mobile Legends</p>
                  <p className="mt-1 font-display font-bold text-xl text-[#1A2438]">{j.nama_tim}</p>
                </div>
              ))}
            </div>
          )}

          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-display font-bold text-lg text-[#1A2438]">Peringkat Try Out TKA SD</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">No. Peserta</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Asal SD</th>
                    <th className="py-3 px-4 text-right">B. Indo</th>
                    <th className="py-3 px-4 text-right">Matematika</th>
                    <th className="py-3 px-4 text-right">Lainnya</th>
                    <th className="py-3 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.hasil_to.map((h) => (
                    <tr key={h.reg_code}>
                      <td className="py-3 px-4 font-mono font-bold text-[#0D9488]">#{h.ranking}</td>
                      <td className="py-3 px-4 font-mono text-xs">{h.no_peserta}</td>
                      <td className="py-3 px-4 font-semibold text-[#1A2438]">{h.nama}</td>
                      <td className="py-3 px-4 text-slate-600">{h.asal_sd}</td>
                      <td className="py-3 px-4 font-mono text-right">{h.skor_bhs_indonesia}</td>
                      <td className="py-3 px-4 font-mono text-right">{h.skor_matematika}</td>
                      <td className="py-3 px-4 font-mono text-right">{h.skor_lainnya}</td>
                      <td className="py-3 px-4 font-mono font-bold text-right text-[#1A2438]">{h.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FaqPage({ content }: { content: PublicContent | null }) {
  const [cat, setCat] = useState<'Semua' | 'Umum' | 'Try Out' | 'Mobile Legends'>('Semua');
  const [openId, setOpenId] = useState<string | null>(null);
  const items = (content?.faq || []).filter((f) => cat === 'Semua' || f.kategori === cat);

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <p className="text-sm font-semibold text-[#F26440]">Pusat Bantuan</p>
        <h1 className="mt-1 font-display font-extrabold text-3xl text-[#1A2438]">Pertanyaan yang Sering Diajukan</h1>
      </div>

      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {(['Semua', 'Umum', 'Try Out', 'Mobile Legends'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              cat === c ? 'bg-white text-[#1A2438] shadow-sm' : 'text-slate-600'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl bg-white">
        {items.map((f) => {
          const isOpen = openId === f.id;
          return (
            <div key={f.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : f.id)}
                className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/70 cursor-pointer"
              >
                <span className="font-display font-semibold text-base text-[#1A2438]">{f.pertanyaan}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">{f.jawaban}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GaleriPage({ content }: { content: PublicContent | null }) {
  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <p className="text-sm font-semibold text-[#F26440]">Dokumentasi</p>
        <h1 className="mt-1 font-display font-extrabold text-3xl text-[#1A2438]">Galeri SMP Negeri 2 Pulung</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(content?.galeri || []).map((g) => (
          <article key={g.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <div className="aspect-[2/1] bg-white overflow-hidden">
              <img
                src={getGalleryImage(g.image_key)}
                alt={g.judul}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-5 space-y-1.5">
              <p className="text-xs font-mono text-slate-500">{formatTanggalIndo(g.tanggal)}</p>
              <h2 className="font-display font-bold text-base text-[#1A2438]">{g.judul}</h2>
              <p className="text-sm text-slate-600">{g.deskripsi}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function KontakPage({ config }: { config: PublicConfig | null }) {
  const waHref = buildWaLink(
    config?.wa_panitia || '6281234567890',
    'Halo Panitia Spendapul Competition SMP Negeri 2 Pulung, saya ingin bertanya mengenai informasi lomba.',
  );

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <p className="text-sm font-semibold text-[#F26440]">Sekretariat Panitia</p>
        <h1 className="mt-1 font-display font-extrabold text-3xl text-[#1A2438]">Kontak &amp; Lokasi Sekolah</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white space-y-5">
          <div className="space-y-1">
            <h2 className="font-display font-bold text-xl text-[#1A2438]">
              {config?.school_name || 'SMP Negeri 2 Pulung'}
            </h2>
            <p className="text-sm text-slate-600">
              {config?.school_address || 'Jl. Raya Pulung–Sooko, Kec. Pulung, Kab. Ponorogo, Jawa Timur 63481'}
            </p>
          </div>

          <div className="space-y-2 text-sm text-slate-700 border-t border-slate-100 pt-4">
            <p>
              <span className="text-slate-500">WhatsApp Panitia:</span>{' '}
              <span className="font-mono font-semibold">{normalizeWaDisplay(config?.wa_panitia || '6281234567890')}</span>
            </p>
            <p>
              <span className="text-slate-500">Jam Layanan:</span> {config?.service_hours || 'Senin – Sabtu, 07.30 – 15.00 WIB'}
            </p>
            <p>
              <span className="text-slate-500">Lokasi Acara:</span>{' '}
              {config?.event_location || 'Kampus SMP Negeri 2 Pulung'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat Panitia via WhatsApp</span>
            </a>
            <a
              href={config?.maps_url || 'https://maps.google.com/?q=SMP+Negeri+2+Pulung+Ponorogo'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <MapPin className="w-4 h-4" />
              <span>Buka Google Maps</span>
            </a>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[280px]">
          <img
            src={getGalleryImage('campus')}
            alt="SMP Negeri 2 Pulung"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
