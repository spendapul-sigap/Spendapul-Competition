import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Copy, Loader2, MessageCircle, ShieldCheck, Upload } from 'lucide-react';
import { api, compressImageFile } from '../lib/api';
import { buildWaLink } from '../lib/format';
import type { PublicConfig, TimML } from '../types/spendapul';

const DRAFT_ML_KEY = 'spendapul_draft_ml_v1';

interface MemberDraft {
  peran: 'Utama' | 'Cadangan';
  nama_lengkap: string;
  nickname_ingame: string;
  id_ml: string;
  server_id: string;
  kelas: string;
  kartu_pelajar_url: string;
}

const emptyRoster = (): MemberDraft[] => [
  { peran: 'Utama', nama_lengkap: '', nickname_ingame: '', id_ml: '', server_id: '', kelas: '', kartu_pelajar_url: '' },
  { peran: 'Utama', nama_lengkap: '', nickname_ingame: '', id_ml: '', server_id: '', kelas: '', kartu_pelajar_url: '' },
  { peran: 'Utama', nama_lengkap: '', nickname_ingame: '', id_ml: '', server_id: '', kelas: '', kartu_pelajar_url: '' },
  { peran: 'Utama', nama_lengkap: '', nickname_ingame: '', id_ml: '', server_id: '', kelas: '', kartu_pelajar_url: '' },
  { peran: 'Utama', nama_lengkap: '', nickname_ingame: '', id_ml: '', server_id: '', kelas: '', kartu_pelajar_url: '' },
  { peran: 'Cadangan', nama_lengkap: '', nickname_ingame: '', id_ml: '', server_id: '', kelas: '', kartu_pelajar_url: '' },
];

interface RegisterMlPageProps {
  config: PublicConfig | null;
  onNavigate: (path: string) => void;
  onRegistered: () => void;
}

export function RegisterMlPage({ config, onNavigate, onRegistered }: RegisterMlPageProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<TimML | null>(null);
  const [copied, setCopied] = useState(false);
  const [idempotencyKey] = useState(() => `ml-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const [team, setTeam] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_ML_KEY);
      if (saved) return JSON.parse(saved).team;
    } catch {
      // ignore
    }
    return {
      nama_tim: '',
      asal_sekolah: '',
      nama_kapten: '',
      wa_kapten: '',
      email: '',
      logo_url: '',
      persetujuan: false,
      captcha_answer: '',
      website_hp: '',
    };
  });

  const [anggota, setAnggota] = useState<MemberDraft[]>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_ML_KEY);
      if (saved && Array.isArray(JSON.parse(saved).anggota)) return JSON.parse(saved).anggota;
    } catch {
      // ignore
    }
    return emptyRoster();
  });

  useEffect(() => {
    if (!successData) {
      try {
        localStorage.setItem(DRAFT_ML_KEY, JSON.stringify({ team, anggota }));
      } catch {
        // ignore quota exceeded if images uploaded
      }
    }
  }, [team, anggota, successData]);

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 512, 0.8);
      setTeam((prev: typeof team) => ({ ...prev, logo_url: compressed }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengompres logo.');
    }
  };

  const handleCardUpload = async (idx: number, file: File | undefined) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 800, 0.72);
      setAnggota((prev) => prev.map((m, i) => (i === idx ? { ...m, kartu_pelajar_url: compressed } : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengompres kartu pelajar.');
    }
  };

  const validateStep1 = () => {
    if (!team.nama_tim.trim() || !team.asal_sekolah.trim() || !team.nama_kapten.trim()) {
      setError('Nama Tim, Asal Sekolah, dan Nama Kapten wajib diisi.');
      return false;
    }
    if (team.wa_kapten.replace(/\D/g, '').length < 10) {
      setError('Nomor WhatsApp Kapten minimal 10 digit.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const utama = anggota.slice(0, 5);
    for (let i = 0; i < utama.length; i += 1) {
      const p = utama[i];
      if (!p.nama_lengkap.trim() || !p.id_ml.trim() || !p.server_id.trim()) {
        setError(`Lengkapi Nama, ID ML, dan Server ID untuk Pemain Utama ${i + 1}.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team.persetujuan) {
      setError('Kapten wajib menyetujui aturan turnamen dan keaslian data pemain.');
      return;
    }
    if (String(team.captcha_answer).trim() !== '9') {
      setError('Verifikasi anti-spam salah. Berapakah hasil 4 + 5?');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const validMembers = anggota.filter((m, i) => i < 5 || (m.nama_lengkap.trim() && m.id_ml.trim()));
      const created = await api.registerMl({
        ...team,
        anggota: validMembers,
        idempotency_key: idempotencyKey,
      });
      localStorage.removeItem(DRAFT_ML_KEY);
      setSuccessData(created);
      onRegistered();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mendaftarkan tim.');
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    const waConfirmLink = buildWaLink(
      config?.wa_panitia || '6281234567890',
      `Halo Panitia Spendapul, tim kami telah mendaftar Turnamen Mobile Legends (Gratis).\nKode Tim: ${successData.reg_code}\nNama Tim: ${successData.nama_tim}\nAsal Sekolah: ${successData.asal_sekolah}\nMohon informasi verifikasi & grup kapten. Terima kasih.`,
    );

    return (
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-12">
        <div className="border border-slate-200 rounded-2xl p-6 sm:p-10 bg-white space-y-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#16A34A] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#F26440]">Pendaftaran Tim ML Berhasil</p>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#1A2438]">
              Simpan Kode Registrasi Tim
            </h1>
            <p className="text-sm text-slate-600">
              Tim <strong>{successData.nama_tim}</strong> masuk antrean verifikasi. Gunakan kode berikut bersama nomor
              WA kapten untuk memantau status dan mengunduh Kartu Tim QR.
            </p>
          </div>

          <div className="py-5 px-6 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center gap-3">
            <span className="text-xs font-medium text-slate-500">Kode Registrasi Tim</span>
            <span className="font-mono text-3xl sm:text-4xl font-bold text-[#1A2438] tracking-wider">
              {successData.reg_code}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(successData.reg_code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kode Tersalin' : 'Salin Kode'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              href={waConfirmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Konfirmasi Kapten via WA</span>
            </a>
            <button
              type="button"
              onClick={() => onNavigate('/cek-status')}
              className="px-6 py-3 rounded-full border border-slate-200 hover:border-slate-300 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              Ke Halaman Cek Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  const closed = config && (!config.reg_ml_open || config.remaining_ml <= 0);

  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-12">
      <div className="space-y-2 mb-8">
        <p className="text-sm font-semibold text-[#F26440]">Formulir Turnamen Gratis (Rp0)</p>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1A2438]">
          Pendaftaran Tim Mobile Legends
        </h1>
        <p className="text-sm text-slate-600">
          Sasaran: {config?.ml_scope || 'Pelajar SMP/MTs sederajat'}. Slot tersisa:{' '}
          <span className="font-mono font-semibold text-[#1A2438]">{config?.remaining_ml ?? '-'}</span> tim.
        </p>
      </div>

      {closed ? (
        <div className="border border-amber-200 bg-amber-50 rounded-2xl p-6 text-amber-900 space-y-2">
          <h2 className="font-display font-bold text-lg">Pendaftaran Mobile Legends Ditutup</h2>
          <p className="text-sm">Slot tim sudah terpenuhi atau pendaftaran telah ditutup oleh panitia.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white space-y-6">
          <div className="grid grid-cols-3 gap-2 pb-4 border-b border-slate-100 text-xs font-semibold">
            {[
              { n: 1, label: '01. Identitas Tim' },
              { n: 2, label: '02. Roster (5+1)' },
              { n: 3, label: '03. Konfirmasi' },
            ].map((s) => (
              <div
                key={s.n}
                className={`py-2 px-3 rounded-lg text-center ${
                  step === s.n
                    ? 'bg-[#F26440] text-white'
                    : step > s.n
                      ? 'bg-orange-50 text-[#C2410C]'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {s.label}
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={team.website_hp}
            onChange={(e) => setTeam((p: typeof team) => ({ ...p, website_hp: e.target.value }))}
            className="hidden"
            aria-hidden="true"
          />

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Tim *</label>
                  <input
                    type="text"
                    required
                    value={team.nama_tim}
                    onChange={(e) => setTeam((p: typeof team) => ({ ...p, nama_tim: e.target.value }))}
                    placeholder="Contoh: Pulung Vanguard"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26440]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Asal Sekolah *</label>
                  <input
                    type="text"
                    required
                    value={team.asal_sekolah}
                    onChange={(e) => setTeam((p: typeof team) => ({ ...p, asal_sekolah: e.target.value }))}
                    placeholder="Contoh: SMPN 2 Pulung"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26440]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Kapten *</label>
                  <input
                    type="text"
                    required
                    value={team.nama_kapten}
                    onChange={(e) => setTeam((p: typeof team) => ({ ...p, nama_kapten: e.target.value }))}
                    placeholder="Nama lengkap kapten"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26440]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">No. WhatsApp Kapten *</label>
                  <input
                    type="tel"
                    required
                    value={team.wa_kapten}
                    onChange={(e) => setTeam((p: typeof team) => ({ ...p, wa_kapten: e.target.value }))}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#F26440]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Kapten (Opsional)</label>
                  <input
                    type="email"
                    value={team.email}
                    onChange={(e) => setTeam((p: typeof team) => ({ ...p, email: e.target.value }))}
                    placeholder="kapten@contoh.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26440]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Logo Tim (Opsional)</label>
                  <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                    <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{team.logo_url ? 'Logo terunggah (kompres otomatis)' : 'Pilih gambar logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) {
                      setError('');
                      setStep(2);
                    }
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#F26440] hover:bg-[#DC4E2B] text-white text-sm font-semibold cursor-pointer"
                >
                  Lanjut ke Daftar Pemain
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <p className="text-xs text-slate-500">
                Isi 5 pemain utama (wajib) dan 1 pemain cadangan (opsional). Satu ID ML hanya boleh terdaftar pada satu
                tim.
              </p>

              <div className="space-y-4">
                {anggota.map((m, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1A2438]">
                        {idx < 5 ? `Pemain Utama ${idx + 1} *` : 'Pemain Cadangan (Opsional)'}
                      </span>
                      <span className="text-[11px] text-slate-500">{m.peran}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <input
                        type="text"
                        placeholder="Nama Lengkap"
                        value={m.nama_lengkap}
                        onChange={(e) =>
                          setAnggota((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, nama_lengkap: e.target.value } : item)),
                          )
                        }
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Nickname In-Game"
                        value={m.nickname_ingame}
                        onChange={(e) =>
                          setAnggota((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, nickname_ingame: e.target.value } : item)),
                          )
                        }
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="ID ML (9 digit)"
                        value={m.id_ml}
                        onChange={(e) =>
                          setAnggota((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, id_ml: e.target.value } : item)),
                          )
                        }
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-mono"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Server ID"
                        value={m.server_id}
                        onChange={(e) =>
                          setAnggota((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, server_id: e.target.value } : item)),
                          )
                        }
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Kelas (mis. 8A)"
                        value={m.kelas}
                        onChange={(e) =>
                          setAnggota((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, kelas: e.target.value } : item)),
                          )
                        }
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#1A2438] cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {m.kartu_pelajar_url
                            ? 'Foto kartu pelajar terunggah'
                            : `Unggah foto kartu pelajar (${config?.ml_require_student_card ? 'wajib' : 'opsional'})`}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleCardUpload(idx, e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) {
                      setError('');
                      setStep(3);
                    }
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#F26440] hover:bg-[#DC4E2B] text-white text-sm font-semibold cursor-pointer"
                >
                  Lanjut ke Konfirmasi
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
                <p className="font-semibold text-[#1A2438]">
                  Tim {team.nama_tim} · {team.asal_sekolah}
                </p>
                <p className="text-slate-600">
                  Kapten: {team.nama_kapten} ({team.wa_kapten}) ·{' '}
                  {anggota.filter((m, i) => i < 5 || (m.nama_lengkap && m.id_ml)).length} pemain terdaftar
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Verifikasi Keamanan: Berapakah hasil 4 + 5? *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={team.captcha_answer}
                  onChange={(e) => setTeam((p: typeof team) => ({ ...p, captcha_answer: e.target.value }))}
                  placeholder="Tulis angka jawaban"
                  className="w-40 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#F26440]"
                />
              </div>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={team.persetujuan}
                  onChange={(e) => setTeam((p: typeof team) => ({ ...p, persetujuan: e.target.checked }))}
                  className="mt-1 w-4 h-4 accent-[#F26440]"
                />
                <span className="text-sm text-slate-700 leading-relaxed">
                  Saya selaku kapten tim menjamin seluruh pemain adalah pelajar aktif tanpa joki/akun ganda, bersedia
                  melakukan konfirmasi ulang H-1 sebelum hari pertandingan, serta menyetujui tata tertib turnamen gratis
                  SMP Negeri 2 Pulung.
                </span>
              </label>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F26440] hover:bg-[#DC4E2B] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{submitting ? 'Mengirim...' : 'Kirim Pendaftaran Tim'}</span>
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
