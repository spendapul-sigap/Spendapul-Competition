import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Copy, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { buildWaLink } from '../lib/format';
import type { PesertaTO, PublicConfig } from '../types/spendapul';

const DRAFT_KEY = 'spendapul_draft_to_v1';

interface RegisterToPageProps {
  config: PublicConfig | null;
  onNavigate: (path: string) => void;
  onRegistered: () => void;
}

export function RegisterToPage({ config, onNavigate, onRegistered }: RegisterToPageProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<PesertaTO | null>(null);
  const [copied, setCopied] = useState(false);
  const [idempotencyKey] = useState(() => `to-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      nama_lengkap: '',
      jenis_kelamin: 'L',
      asal_sd: '',
      kelas: '6',
      nisn: '',
      tempat_lahir: '',
      tgl_lahir: '',
      nama_ortu: '',
      wa_ortu: '',
      email: '',
      alamat: '',
      persetujuan: false,
      captcha_answer: '',
      website_hp: '', // honeypot
    };
  });

  useEffect(() => {
    if (!successData) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }
  }, [form, successData]);

  const updateField = (key: string, val: string | boolean) => {
    setError('');
    setForm((prev: Record<string, string | boolean>) => ({ ...prev, [key]: val }));
  };

  const validateStep1 = () => {
    if (!form.nama_lengkap.trim() || !form.asal_sd.trim() || !form.nisn.trim()) {
      setError('Mohon isi Nama Lengkap, Asal SD/MI, dan NISN peserta.');
      return false;
    }
    if (form.nisn.replace(/\D/g, '').length < 8) {
      setError('NISN harus terdiri dari minimal 8 digit angka.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.nama_ortu.trim() || form.wa_ortu.replace(/\D/g, '').length < 10) {
      setError('Nama Orang Tua/Wali dan nomor WhatsApp aktif wajib diisi.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.persetujuan) {
      setError('Orang tua/wali wajib menyetujui ketentuan penggunaan data peserta.');
      return;
    }
    if (String(form.captcha_answer).trim() !== '8') {
      setError('Verifikasi anti-spam salah. Berapakah hasil 5 + 3?');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const created = await api.registerTo({
        ...form,
        idempotency_key: idempotencyKey,
      });
      localStorage.removeItem(DRAFT_KEY);
      setSuccessData(created);
      onRegistered();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pendaftaran.');
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    const waConfirmLink = buildWaLink(
      config?.wa_panitia || '6281234567890',
      `Halo Panitia Spendapul, saya telah mendaftar Try Out TKA SD (Gratis).\nKode Registrasi: ${successData.reg_code}\nNama Siswa: ${successData.nama_lengkap}\nAsal SD: ${successData.asal_sd}\nMohon bantuan verifikasi. Terima kasih.`,
    );

    return (
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-12">
        <div className="border border-slate-200 rounded-2xl p-6 sm:p-10 bg-white space-y-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#16A34A] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#0D9488]">Pendaftaran Try Out Berhasil Dikirim</p>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#1A2438]">
              Simpan Kode Registrasi Anda
            </h1>
            <p className="text-sm text-slate-600">
              Data siswa telah masuk antrean verifikasi panitia. Gunakan kode di bawah bersama nomor WhatsApp untuk
              mengecek status dan mengunduh Kartu Peserta QR.
            </p>
          </div>

          <div className="py-5 px-6 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center gap-3">
            <span className="text-xs font-medium text-slate-500">Kode Registrasi Try Out</span>
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
              <span>Konfirmasi via WhatsApp</span>
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

  const closed = config && (!config.reg_to_open || config.remaining_to <= 0);

  return (
    <div className="max-w-[740px] mx-auto px-4 sm:px-6 py-12">
      <div className="space-y-2 mb-8">
        <p className="text-sm font-semibold text-[#0D9488]">Formulir Pendaftaran Gratis (Rp0)</p>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1A2438]">
          Pendaftaran Try Out TKA SD
        </h1>
        <p className="text-sm text-slate-600">
          Draf pengisian tersimpan otomatis di browser Anda. Kuota tersisa:{' '}
          <span className="font-mono font-semibold text-[#1A2438]">{config?.remaining_to ?? '-'}</span> peserta.
        </p>
      </div>

      {closed ? (
        <div className="border border-amber-200 bg-amber-50 rounded-2xl p-6 text-amber-900 space-y-2">
          <h2 className="font-display font-bold text-lg">Pendaftaran Try Out Sedang Ditutup</h2>
          <p className="text-sm">
            Kuota peserta telah terpenuhi atau masa pendaftaran telah ditutup oleh panitia. Silakan hubungi panitia via
            WhatsApp untuk informasi daftar tunggu.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white space-y-6">
          {/* Progress Steps */}
          <div className="grid grid-cols-3 gap-2 pb-4 border-b border-slate-100 text-xs font-semibold">
            {[
              { n: 1, label: '01. Data Siswa' },
              { n: 2, label: '02. Orang Tua & WA' },
              { n: 3, label: '03. Persetujuan' },
            ].map((s) => (
              <div
                key={s.n}
                className={`py-2 px-3 rounded-lg text-center ${
                  step === s.n
                    ? 'bg-[#0D9488] text-white'
                    : step > s.n
                      ? 'bg-emerald-50 text-[#0D9488]'
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

          {/* Honeypot */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website_hp}
            onChange={(e) => updateField('website_hp', e.target.value)}
            className="hidden"
            aria-hidden="true"
          />

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  required
                  value={form.nama_lengkap}
                  onChange={(e) => updateField('nama_lengkap', e.target.value)}
                  placeholder="Sesuai akta / rapor sekolah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Jenis Kelamin *</label>
                  <select
                    value={form.jenis_kelamin}
                    onChange={(e) => updateField('jenis_kelamin', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">NISN *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={form.nisn}
                    onChange={(e) => updateField('nisn', e.target.value)}
                    placeholder="Contoh: 0145829101"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Asal SD / MI *</label>
                  <input
                    type="text"
                    required
                    value={form.asal_sd}
                    onChange={(e) => updateField('asal_sd', e.target.value)}
                    placeholder="Contoh: SDN 1 Pulung"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Kelas</label>
                  <input
                    type="text"
                    value={form.kelas}
                    onChange={(e) => updateField('kelas', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tempat Lahir</label>
                  <input
                    type="text"
                    value={form.tempat_lahir}
                    onChange={(e) => updateField('tempat_lahir', e.target.value)}
                    placeholder="Ponorogo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={form.tgl_lahir}
                    onChange={(e) => updateField('tgl_lahir', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setStep(2);
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold cursor-pointer"
                >
                  Lanjut ke Data Orang Tua
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Orang Tua / Wali *</label>
                <input
                  type="text"
                  required
                  value={form.nama_ortu}
                  onChange={(e) => updateField('nama_ortu', e.target.value)}
                  placeholder="Nama lengkap orang tua/wali"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">No. WhatsApp Orang Tua *</label>
                  <input
                    type="tel"
                    required
                    value={form.wa_ortu}
                    onChange={(e) => updateField('wa_ortu', e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                  <p className="text-xs text-slate-500 mt-1">Digunakan untuk cek status &amp; info ruang ujian.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email (Opsional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="email@contoh.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  value={form.alamat}
                  onChange={(e) => updateField('alamat', e.target.value)}
                  placeholder="Dusun, Desa, Kecamatan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
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
                    if (validateStep2()) setStep(3);
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold cursor-pointer"
                >
                  Lanjut ke Konfirmasi
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
                <p className="font-semibold text-[#1A2438]">Ringkasan Data Pendaftar</p>
                <div className="grid grid-cols-2 gap-y-1 text-slate-600">
                  <span>Nama Siswa</span>
                  <span className="font-medium text-[#1A2438]">{form.nama_lengkap}</span>
                  <span>Asal SD/MI</span>
                  <span className="font-medium text-[#1A2438]">{form.asal_sd}</span>
                  <span>NISN</span>
                  <span className="font-mono font-medium text-[#1A2438]">{form.nisn}</span>
                  <span>Orang Tua &amp; WA</span>
                  <span className="font-medium text-[#1A2438]">
                    {form.nama_ortu} ({form.wa_ortu})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Verifikasi Keamanan: Berapakah hasil 5 + 3? *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={form.captcha_answer}
                  onChange={(e) => updateField('captcha_answer', e.target.value)}
                  placeholder="Tulis angka jawaban"
                  className="w-40 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
              </div>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.persetujuan}
                  onChange={(e) => updateField('persetujuan', e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#0D9488]"
                />
                <span className="text-sm text-slate-700 leading-relaxed">
                  Saya selaku orang tua/wali menyatakan data siswa adalah benar, menyetujui penggunaan data hanya untuk
                  keperluan verifikasi &amp; pelaksanaan Try Out SMP Negeri 2 Pulung, serta memahami bahwa kegiatan ini{' '}
                  <strong>gratis (Rp0)</strong>.
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
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{submitting ? 'Mengirim...' : 'Kirim Pendaftaran'}</span>
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
