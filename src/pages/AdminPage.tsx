import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  LogOut,
  MessageCircle,
  Pencil,
  Printer,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { api, type AuthUser } from '../lib/api';
import { buildWaLink, formatTanggalWaktuIndo } from '../lib/format';
import type {
  AuditLogItem,
  EventConfig,
  FaqItem,
  GaleriItem,
  HadiahItem,
  JadwalItem,
  JuknisPdfFile,
  KegiatanType,
  PengumumanItem,
  PesertaTO,
  PublicContent,
  RegistrationStatus,
  SponsorItem,
  TimML,
  UserAccountPublic,
  UserRole,
} from '../types/spendapul';

type AdminTab = 'pendaftar' | 'konten' | 'pengaturan' | 'akun' | 'ekspor' | 'log';
type ContentSection = 'pengumuman' | 'jadwal' | 'juknis' | 'faq' | 'hadiah' | 'sponsor' | 'galeri';

interface AdminPageProps {
  user: AuthUser;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  onPublicUpdated: () => void;
}

export function AdminPage({ user, onNavigate, onLogout, onPublicUpdated }: AdminPageProps) {
  const [tab, setTab] = useState<AdminTab>('konten');
  const [section, setSection] = useState<ContentSection>('pengumuman');
  const [content, setContent] = useState<PublicContent | null>(null);
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [users, setUsers] = useState<UserAccountPublic[]>([]);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [toList, setToList] = useState<PesertaTO[]>([]);
  const [mlList, setMlList] = useState<TimML[]>([]);
  const [toast, setToast] = useState('');

  // Structured content editor state (Add + Edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cForm, setCForm] = useState({
    title: '',
    body: '',
    kategori: 'Umum',
    kegiatan: 'umum' as KegiatanType,
    tanggal: new Date().toISOString().slice(0, 10),
    tanggal_selesai: new Date().toISOString().slice(0, 10),
    lokasi: 'SMP Negeri 2 Pulung',
    urutan: 1,
    pinned: false,
    published: true,
    tier: 'Pendukung' as SponsorItem['tier'],
    link: '#kontak',
    image_key: 'campus',
  });

  // Juknis PDF uploader state
  const [pdfEditingId, setPdfEditingId] = useState<string | null>(null);
  const [pdfLabel, setPdfLabel] = useState('');
  const [pdfKegiatan, setPdfKegiatan] = useState<KegiatanType>('umum');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

  // Registration verification state (Try Out & ML)
  const [regType, setRegType] = useState<'try-out' | 'mobile-legends'>('try-out');
  const [searchTo, setSearchTo] = useState('');
  const [statusTo, setStatusTo] = useState<'ALL' | RegistrationStatus>('ALL');
  const [selectedTo, setSelectedTo] = useState<PesertaTO | null>(null);
  const [searchMl, setSearchMl] = useState('');
  const [statusMl, setStatusMl] = useState<'ALL' | RegistrationStatus>('ALL');
  const [selectedMl, setSelectedMl] = useState<TimML | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [customNoPeserta, setCustomNoPeserta] = useState('');
  const [customRuang, setCustomRuang] = useState('');
  const [customSeed, setCustomSeed] = useState('');

  // New user form
  const [newUser, setNewUser] = useState<{ username: string; nama: string; password: string; role: UserRole }>({
    username: '',
    nama: '',
    password: '',
    role: 'ADMIN',
  });

  // Delete registration confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'try-out' | 'mobile-legends'; code: string } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const resetContentForm = (targetSection: ContentSection = section) => {
    setEditingId(null);
    setCForm({
      title: '',
      body: '',
      kategori: 'Umum',
      kegiatan: targetSection === 'hadiah' ? 'try-out' : 'umum',
      tanggal: new Date().toISOString().slice(0, 10),
      tanggal_selesai: new Date().toISOString().slice(0, 10),
      lokasi: 'SMP Negeri 2 Pulung',
      urutan: 1,
      pinned: false,
      published: true,
      tier: 'Pendukung',
      link: '#kontak',
      image_key: 'campus',
    });
  };

  const loadAdminData = async () => {
    try {
      const [cfg, cnt, usr, lg, to, ml] = await Promise.all([
        api.getConfigPublic(),
        api.getContent(),
        api.listUsers(),
        api.listLogs(),
        api.listTo(),
        api.listMl(),
      ]);
      setConfig(cfg);
      setContent(cnt);
      setUsers(usr);
      setLogs(lg);
      setToList(to);
      setMlList(ml);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat panel admin.');
    }
  };

  useEffect(() => {
    if (user.role === 'ADMIN') {
      loadAdminData();
    }
  }, [user.role]);

  if (user.role !== 'ADMIN') {
    return (
      <div className="max-w-[520px] mx-auto px-4 py-20 text-center space-y-4">
        <ShieldAlert className="w-10 h-10 text-[#DC2626] mx-auto" />
        <h1 className="font-display font-bold text-2xl text-[#1A2438]">Akses Terbatas untuk Admin</h1>
        <p className="text-sm text-slate-600">
          Akun ini tidak memiliki izin Admin. Silakan masuk dengan akun Admin untuk mengelola situs.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 text-sm font-semibold cursor-pointer"
          >
            Kembali ke Beranda
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-5 py-2.5 rounded-full bg-[#1A2438] text-white text-sm font-semibold cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </div>
    );
  }

  const handleVerifyTo = async (p: PesertaTO) => {
    try {
      const updated = (await api.verifyRegistration({
        reg_code: p.reg_code,
        catatan: actionNote || 'Data valid & terverifikasi.',
        no_peserta: customNoPeserta,
        ruang: customRuang,
      })) as PesertaTO;
      setSelectedTo(updated);
      setActionNote('');
      setCustomNoPeserta('');
      setCustomRuang('');
      showToast(`${p.reg_code} berhasil diverifikasi.`);
      await loadAdminData();
      onPublicUpdated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal verifikasi.');
    }
  };

  const handleRejectTo = async (p: PesertaTO) => {
    if (!actionNote.trim()) {
      showToast('Isi catatan alasan penolakan terlebih dahulu.');
      return;
    }
    try {
      const updated = (await api.rejectRegistration(p.reg_code, actionNote)) as PesertaTO;
      setSelectedTo(updated);
      setActionNote('');
      showToast(`${p.reg_code} ditolak.`);
      await loadAdminData();
      onPublicUpdated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menolak peserta.');
    }
  };

  const handleVerifyMl = async (t: TimML) => {
    try {
      const updated = (await api.verifyRegistration({
        reg_code: t.reg_code,
        catatan: actionNote || 'Roster & ID ML terverifikasi.',
        seed: customSeed,
      })) as TimML;
      setSelectedMl(updated);
      setActionNote('');
      setCustomSeed('');
      showToast(`${t.reg_code} berhasil diverifikasi.`);
      await loadAdminData();
      onPublicUpdated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal verifikasi tim.');
    }
  };

  const handleRejectMl = async (t: TimML) => {
    if (!actionNote.trim()) {
      showToast('Isi catatan alasan penolakan tim.');
      return;
    }
    try {
      const updated = (await api.rejectRegistration(t.reg_code, actionNote)) as TimML;
      setSelectedMl(updated);
      setActionNote('');
      showToast(`${t.reg_code} ditolak.`);
      await loadAdminData();
      onPublicUpdated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menolak tim.');
    }
  };

  const renderStatusLabel = (status: RegistrationStatus) => {
    if (status === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Terverifikasi
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#DC2626]">
          <XCircle className="w-3.5 h-3.5" />
          Ditolak
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706]">
        <Clock className="w-3.5 h-3.5" />
        Pending
      </span>
    );
  };

  const filteredTo = toList.filter((p) => {
    const matchStatus = statusTo === 'ALL' || p.status === statusTo;
    const q = searchTo.toLowerCase();
    const matchQ =
      !q ||
      p.nama_lengkap.toLowerCase().includes(q) ||
      p.asal_sd.toLowerCase().includes(q) ||
      p.reg_code.toLowerCase().includes(q) ||
      p.nisn.includes(q);
    return matchStatus && matchQ;
  });

  const filteredMl = mlList.filter((t) => {
    const matchStatus = statusMl === 'ALL' || t.status === statusMl;
    const q = searchMl.toLowerCase();
    const matchQ =
      !q ||
      t.nama_tim.toLowerCase().includes(q) ||
      t.asal_sekolah.toLowerCase().includes(q) ||
      t.reg_code.toLowerCase().includes(q);
    return matchStatus && matchQ;
  });

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cForm.title.trim()) return;
    let item: Record<string, unknown> = {};
    if (editingId) item.id = editingId;

    if (section === 'pengumuman') {
      item = {
        ...item,
        tanggal: cForm.tanggal,
        judul: cForm.title,
        isi: cForm.body,
        kategori: cForm.kategori as PengumumanItem['kategori'],
        pinned: cForm.pinned,
        published: cForm.published,
      };
    } else if (section === 'jadwal') {
      item = {
        ...item,
        kegiatan: cForm.kegiatan,
        tanggal_mulai: cForm.tanggal,
        tanggal_selesai: cForm.tanggal_selesai || cForm.tanggal,
        judul: cForm.title,
        deskripsi: cForm.body,
        lokasi: cForm.lokasi,
      };
    } else if (section === 'juknis') {
      item = {
        ...item,
        kegiatan: cForm.kegiatan,
        urutan: Number(cForm.urutan) || 1,
        judul_bagian: cForm.title,
        isi_markdown: cForm.body,
        pdf_url: '',
      };
    } else if (section === 'faq') {
      item = {
        ...item,
        kategori: cForm.kategori as FaqItem['kategori'],
        pertanyaan: cForm.title,
        jawaban: cForm.body,
        urutan: Number(cForm.urutan) || 1,
      };
    } else if (section === 'hadiah') {
      item = {
        ...item,
        kegiatan: cForm.kegiatan === 'mobile-legends' ? 'mobile-legends' : 'try-out',
        peringkat: cForm.title,
        hadiah: cForm.body,
      };
    } else if (section === 'sponsor') {
      item = {
        ...item,
        nama: cForm.title,
        logo_url: '',
        link: cForm.link || '#kontak',
        tier: cForm.tier,
      };
    } else if (section === 'galeri') {
      item = {
        ...item,
        judul: cForm.title,
        kegiatan: cForm.kegiatan,
        tanggal: cForm.tanggal,
        image_key: cForm.image_key,
        deskripsi: cForm.body,
      };
    }

    try {
      await api.upsertContent(section, item);
      resetContentForm(section);
      showToast(editingId ? 'Perubahan konten disimpan.' : 'Konten baru berhasil ditambahkan.');
      await loadAdminData();
      onPublicUpdated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan konten.');
    }
  };

  const handleStartEdit = (id: string) => {
    setEditingId(id);
    if (section === 'pengumuman') {
      const found = content?.pengumuman.find((x) => x.id === id);
      if (found) {
        setCForm((prev) => ({
          ...prev,
          title: found.judul,
          body: found.isi,
          kategori: found.kategori,
          tanggal: found.tanggal,
          pinned: found.pinned,
          published: found.published,
        }));
      }
    } else if (section === 'jadwal') {
      const found = content?.jadwal.find((x) => x.id === id);
      if (found) {
        setCForm((prev) => ({
          ...prev,
          title: found.judul,
          body: found.deskripsi,
          kegiatan: found.kegiatan,
          tanggal: found.tanggal_mulai,
          tanggal_selesai: found.tanggal_selesai,
          lokasi: found.lokasi,
        }));
      }
    } else if (section === 'juknis') {
      const found = content?.juknis.find((x) => x.id === id);
      if (found) {
        setCForm((prev) => ({
          ...prev,
          title: found.judul_bagian,
          body: found.isi_markdown,
          kegiatan: found.kegiatan,
          urutan: found.urutan,
        }));
      }
    } else if (section === 'faq') {
      const found = content?.faq.find((x) => x.id === id);
      if (found) {
        setCForm((prev) => ({
          ...prev,
          title: found.pertanyaan,
          body: found.jawaban,
          kategori: found.kategori,
          urutan: found.urutan,
        }));
      }
    } else if (section === 'hadiah') {
      const found = content?.hadiah.find((x) => x.id === id);
      if (found) {
        setCForm((prev) => ({
          ...prev,
          title: found.peringkat,
          body: found.hadiah,
          kegiatan: found.kegiatan,
        }));
      }
    } else if (section === 'sponsor') {
      const found = content?.sponsor.find((x) => x.id === id);
      if (found) {
        setCForm((prev) => ({
          ...prev,
          title: found.nama,
          link: found.link,
          tier: found.tier,
        }));
      }
    } else if (section === 'galeri') {
      const found = content?.galeri.find((x) => x.id === id);
      if (found) {
        setCForm((prev) => ({
          ...prev,
          title: found.judul,
          body: found.deskripsi,
          kegiatan: found.kegiatan,
          tanggal: found.tanggal,
          image_key: found.image_key,
        }));
      }
    }
  };

  const handleDeleteContent = async (id: string) => {
    try {
      await api.deleteContent(section, id);
      if (editingId === id) resetContentForm(section);
      showToast('Item konten dihapus.');
      await loadAdminData();
      onPublicUpdated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus.');
    }
  };

  const resetPdfForm = () => {
    setPdfEditingId(null);
    setPdfLabel('');
    setPdfKegiatan('umum');
    setPdfFile(null);
  };

  const handleSavePdfForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfLabel.trim() && !pdfFile) {
      showToast('Isi judul tombol atau pilih file PDF terlebih dahulu.');
      return;
    }
    if (pdfFile) {
      if (pdfFile.type && pdfFile.type !== 'application/pdf' && !pdfFile.name.toLowerCase().endsWith('.pdf')) {
        showToast('Hanya file berformat .pdf yang diperbolehkan.');
        return;
      }
      if (pdfFile.size > 20 * 1024 * 1024) {
        showToast('Ukuran file PDF maksimal 20 MB.');
        return;
      }
    }
    try {
      setPdfBusyId('form');
      let updatedList: JuknisPdfFile[];
      if (pdfFile) {
        updatedList = await api.uploadJuknisPdf({
          id: pdfEditingId || undefined,
          label: pdfLabel.trim() || pdfFile.name.replace(/\.pdf$/i, ''),
          kegiatan: pdfKegiatan,
          file: pdfFile,
        });
        showToast('File Juknis PDF berhasil diunggah.');
      } else {
        updatedList = await api.upsertJuknisSlot({
          id: pdfEditingId || undefined,
          label: pdfLabel.trim(),
          kegiatan: pdfKegiatan,
        });
        showToast(pdfEditingId ? 'Label tombol Juknis diperbarui.' : 'Tombol Juknis baru ditambahkan.');
      }
      setConfig((prev) => (prev ? { ...prev, juknis_pdfs: updatedList } : prev));
      resetPdfForm();
      onPublicUpdated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan Juknis PDF.');
    } finally {
      setPdfBusyId(null);
    }
  };

  const handleInlineUploadPdf = async (item: JuknisPdfFile, file: File) => {
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Hanya file berformat .pdf yang diperbolehkan.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast('Ukuran file PDF maksimal 20 MB.');
      return;
    }
    try {
      setPdfBusyId(item.id);
      const updatedList = await api.uploadJuknisPdf({
        id: item.id,
        label: item.label,
        kegiatan: item.kegiatan,
        file,
      });
      setConfig((prev) => (prev ? { ...prev, juknis_pdfs: updatedList } : prev));
      showToast(`PDF untuk "${item.label}" berhasil diunggah.`);
      onPublicUpdated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengunggah PDF.');
    } finally {
      setPdfBusyId(null);
    }
  };

  const handleDeletePdf = async (id: string, mode: 'file' | 'slot') => {
    try {
      setPdfBusyId(id);
      const updatedList = await api.deleteJuknisPdf(id, mode);
      setConfig((prev) => (prev ? { ...prev, juknis_pdfs: updatedList } : prev));
      if (pdfEditingId === id) resetPdfForm();
      showToast(mode === 'slot' ? 'Tombol Juknis dihapus.' : 'File PDF dihapus dari tombol.');
      onPublicUpdated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus.');
    } finally {
      setPdfBusyId(null);
    }
  };

  const currentItems: Array<{ id: string; title: string; subtitle: string }> =
    section === 'pengumuman'
      ? (content?.pengumuman || []).map((x: PengumumanItem) => ({
          id: x.id,
          title: x.judul,
          subtitle: `${x.kategori} · ${x.tanggal}${x.pinned ? ' · Disematkan' : ''}`,
        }))
      : section === 'jadwal'
        ? (content?.jadwal || []).map((x: JadwalItem) => ({
            id: x.id,
            title: x.judul,
            subtitle: `${x.tanggal_mulai} · ${x.lokasi}`,
          }))
        : section === 'faq'
          ? (content?.faq || []).map((x: FaqItem) => ({
              id: x.id,
              title: x.pertanyaan,
              subtitle: `${x.kategori} · Urutan ${x.urutan}`,
            }))
          : section === 'hadiah'
            ? (content?.hadiah || []).map((x: HadiahItem) => ({
                id: x.id,
                title: `${x.peringkat} (${x.kegiatan})`,
                subtitle: x.hadiah,
              }))
            : section === 'sponsor'
              ? (content?.sponsor || []).map((x: SponsorItem) => ({
                  id: x.id,
                  title: x.nama,
                  subtitle: x.tier,
                }))
              : (content?.galeri || []).map((x: GaleriItem) => ({
                  id: x.id,
                  title: x.judul,
                  subtitle: `${x.tanggal} · Foto: ${x.image_key}`,
                }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="font-display font-extrabold text-base sm:text-lg text-[#1A2438] whitespace-nowrap cursor-pointer"
            >
              Spendapul
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-[#F26440] truncate">Panel Admin</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs text-slate-500">{user.nama}</span>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-slate-100">
          {[
            { id: 'konten', label: 'Konten & Juknis PDF' },
            { id: 'pendaftar', label: `Pendaftar (${toList.length + mlList.length})` },
            { id: 'pengaturan', label: 'Pengaturan & Tampilan' },
            { id: 'akun', label: 'Akun Admin' },
            { id: 'ekspor', label: 'Ekspor & Daftar Hadir' },
            { id: 'log', label: 'Log Aktivitas' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as AdminTab)}
              className={`px-4 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                tab === item.id ? 'border-[#F26440] text-[#1A2438]' : 'border-transparent text-slate-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl bg-[#1A2438] text-white text-sm font-medium shadow-lg no-print">
          {toast}
        </div>
      )}

      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-8">
        {/* TAB 0: PENDAFTAR & VERIFIKASI */}
        {tab === 'pendaftar' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Pendaftar Try Out</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#1A2438] tabular-nums">{toList.length}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">TO Terverifikasi</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#0D9488] tabular-nums">
                  {toList.filter((p) => p.status === 'VERIFIED').length}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Tim Mobile Legends</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#1A2438] tabular-nums">{mlList.length}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Tim ML Terverifikasi</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#F26440] tabular-nums">
                  {mlList.filter((t) => t.status === 'VERIFIED').length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setRegType('try-out')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  regType === 'try-out' ? 'bg-[#0D9488] text-white' : 'text-slate-600'
                }`}
              >
                Try Out TKA SD ({toList.length})
              </button>
              <button
                type="button"
                onClick={() => setRegType('mobile-legends')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  regType === 'mobile-legends' ? 'bg-[#F26440] text-white' : 'text-slate-600'
                }`}
              >
                Tim Mobile Legends ({mlList.length})
              </button>
            </div>

            {regType === 'try-out' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className={`${selectedTo ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={searchTo}
                        onChange={(e) => setSearchTo(e.target.value)}
                        placeholder="Cari nama, SD, kode, atau NISN..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
                      {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatusTo(st)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            statusTo === st ? 'bg-[#1A2438] text-white' : 'text-slate-600'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                        <tr>
                          <th className="py-3 px-4">Kode</th>
                          <th className="py-3 px-4">Nama Siswa</th>
                          <th className="py-3 px-4">Asal SD</th>
                          <th className="py-3 px-4">Ruang / No</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTo.map((p) => (
                          <tr
                            key={p.reg_code}
                            onClick={() => {
                              setSelectedTo(p);
                              setCustomNoPeserta(p.no_peserta);
                              setCustomRuang(p.ruang);
                            }}
                            className={`cursor-pointer hover:bg-slate-50 ${
                              selectedTo?.reg_code === p.reg_code ? 'bg-slate-50' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-mono text-xs font-semibold">{p.reg_code}</td>
                            <td className="py-3 px-4 font-medium text-[#1A2438]">{p.nama_lengkap}</td>
                            <td className="py-3 px-4 text-slate-600">{p.asal_sd}</td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-600">
                              {p.no_peserta ? `${p.no_peserta} · ${p.ruang}` : '-'}
                            </td>
                            <td className="py-3 px-4">{renderStatusLabel(p.status)}</td>
                          </tr>
                        ))}
                        {filteredTo.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 px-4 text-center text-sm text-slate-500">
                              Belum ada pendaftar Try Out TKA SD.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedTo && (
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5 h-fit">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-xs font-semibold text-[#0D9488]">{selectedTo.reg_code}</p>
                        <h3 className="font-display font-bold text-lg text-[#1A2438]">{selectedTo.nama_lengkap}</h3>
                        <p className="text-xs text-slate-500">{selectedTo.asal_sd} · Kelas {selectedTo.kelas}</p>
                      </div>
                      <button type="button" onClick={() => setSelectedTo(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 text-xs border-y border-slate-100 py-4">
                      <div>
                        <dt className="text-slate-500">NISN</dt>
                        <dd className="font-mono font-semibold text-[#1A2438]">{selectedTo.nisn}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Orang Tua</dt>
                        <dd className="font-semibold text-[#1A2438]">{selectedTo.nama_ortu}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">WA Orang Tua</dt>
                        <dd className="font-mono text-[#1A2438]">{selectedTo.wa_ortu}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Waktu Daftar</dt>
                        <dd className="text-[#1A2438]">{formatTanggalWaktuIndo(selectedTo.timestamp)}</dd>
                      </div>
                    </dl>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="No. Peserta (otomatis)"
                          value={customNoPeserta}
                          onChange={(e) => setCustomNoPeserta(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                        <input
                          type="text"
                          placeholder="Ruang (otomatis)"
                          value={customRuang}
                          onChange={(e) => setCustomRuang(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Catatan verifikasi / alasan penolakan..."
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerifyTo(selectedTo)}
                          className="flex-1 py-2 px-3 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold cursor-pointer"
                        >
                          Verifikasi
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectTo(selectedTo)}
                          className="flex-1 py-2 px-3 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          Tolak
                        </button>
                      </div>
                      <a
                        href={buildWaLink(
                          selectedTo.wa_ortu,
                          `Halo Bapak/Ibu ${selectedTo.nama_ortu}, pendaftaran Try Out ${selectedTo.nama_lengkap} (${selectedTo.reg_code}) berstatus ${selectedTo.status}. ${
                            selectedTo.status === 'VERIFIED'
                              ? `Nomor Peserta: ${selectedTo.no_peserta}, ${selectedTo.ruang}. Silakan unduh Kartu QR di halaman Cek Status.`
                              : selectedTo.catatan
                          }`,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-[#1A2438]"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>Kirim Info via WhatsApp</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className={`${selectedMl ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={searchMl}
                        onChange={(e) => setSearchMl(e.target.value)}
                        placeholder="Cari tim, sekolah, atau kode..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
                      {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatusMl(st)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            statusMl === st ? 'bg-[#1A2438] text-white' : 'text-slate-600'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                        <tr>
                          <th className="py-3 px-4">Kode</th>
                          <th className="py-3 px-4">Nama Tim</th>
                          <th className="py-3 px-4">Sekolah</th>
                          <th className="py-3 px-4">Seed</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMl.map((t) => (
                          <tr
                            key={t.reg_code}
                            onClick={() => {
                              setSelectedMl(t);
                              setCustomSeed(t.seed);
                            }}
                            className="cursor-pointer hover:bg-slate-50"
                          >
                            <td className="py-3 px-4 font-mono text-xs font-semibold">{t.reg_code}</td>
                            <td className="py-3 px-4 font-semibold text-[#1A2438]">{t.nama_tim}</td>
                            <td className="py-3 px-4 text-slate-600">{t.asal_sekolah}</td>
                            <td className="py-3 px-4 font-mono text-xs">{t.seed || '-'}</td>
                            <td className="py-3 px-4">{renderStatusLabel(t.status)}</td>
                          </tr>
                        ))}
                        {filteredMl.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 px-4 text-center text-sm text-slate-500">
                              Belum ada tim Mobile Legends terdaftar.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedMl && (
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5 h-fit">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-xs font-semibold text-[#F26440]">{selectedMl.reg_code}</p>
                        <h3 className="font-display font-bold text-lg text-[#1A2438]">{selectedMl.nama_tim}</h3>
                        <p className="text-xs text-slate-500">
                          {selectedMl.asal_sekolah} · Kapten: {selectedMl.nama_kapten} ({selectedMl.wa_kapten})
                        </p>
                      </div>
                      <button type="button" onClick={() => setSelectedMl(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {selectedMl.logo_url && (
                      <img src={selectedMl.logo_url} alt={selectedMl.nama_tim} className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                    )}

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-slate-500">Roster Pemain</p>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                        {(selectedMl.anggota || []).map((a) => (
                          <div key={a.member_id} className="px-3 py-2 flex items-center justify-between gap-2 bg-slate-50/40">
                            <div>
                              <span className="font-semibold text-[#1A2438]">{a.nickname_ingame}</span>
                              <span className="text-slate-500 ml-1.5">
                                ({a.nama_lengkap} · Kls {a.kelas} · {a.peran})
                              </span>
                            </div>
                            <span className="font-mono text-slate-600">
                              {a.id_ml} ({a.server_id})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Seed Tim (misal Seed 1)"
                        value={customSeed}
                        onChange={(e) => setCustomSeed(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono"
                      />
                      <textarea
                        rows={2}
                        placeholder="Catatan verifikasi / penolakan..."
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerifyMl(selectedMl)}
                          className="flex-1 py-2 px-3 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold cursor-pointer"
                        >
                          Verifikasi Tim
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectMl(selectedMl)}
                          className="flex-1 py-2 px-3 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          Tolak Tim
                        </button>
                      </div>
                      <a
                        href={buildWaLink(
                          selectedMl.wa_kapten,
                          `Halo Kapten ${selectedMl.nama_kapten}, tim ${selectedMl.nama_tim} (${selectedMl.reg_code}) berstatus ${selectedMl.status}. ${selectedMl.catatan}`,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-[#1A2438]"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>Kirim Info ke Kapten via WA</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* TAB 1: KONTEN (Add + Edit + Delete for all 7 sections) */}
        {tab === 'konten' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-1.5">
              {(['pengumuman', 'jadwal', 'juknis', 'faq', 'hadiah', 'sponsor', 'galeri'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSection(s);
                    resetContentForm(s);
                    resetPdfForm();
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                    section === s ? 'bg-[#1A2438] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {s === 'juknis' ? 'Juknis (PDF)' : s}
                </button>
              ))}
            </div>

            {section === 'juknis' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-bold text-base text-[#1A2438]">
                        {pdfEditingId ? 'Edit Tombol / Ganti PDF' : 'Tambah Tombol & Upload PDF'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Unggah file Juknis format <strong>.pdf</strong> (maks. 20 MB) agar langsung bisa diunduh peserta.
                      </p>
                    </div>
                    {pdfEditingId && (
                      <button
                        type="button"
                        onClick={resetPdfForm}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Batal</span>
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSavePdfForm} className="space-y-3 text-sm">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Judul Tombol Juknis</label>
                      <input
                        type="text"
                        required
                        placeholder="mis. Juknis Try Out TKA SD 2026"
                        value={pdfLabel}
                        onChange={(e) => setPdfLabel(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Kategori Kegiatan</label>
                      <select
                        value={pdfKegiatan}
                        onChange={(e) => setPdfKegiatan(e.target.value as KegiatanType)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      >
                        <option value="umum">Umum (Semua Lomba)</option>
                        <option value="try-out">Try Out TKA SD</option>
                        <option value="mobile-legends">Mobile Legends</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        File Juknis (.pdf){pdfEditingId ? ' — opsional jika hanya mengubah judul' : ' — boleh menyusul'}
                      </label>
                      <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-300 hover:border-[#F26440] rounded-xl p-4 cursor-pointer bg-slate-50/60 transition-colors">
                        <Upload className="w-5 h-5 text-[#F26440]" />
                        <span className="text-xs font-semibold text-[#1A2438] text-center">
                          {pdfFile ? pdfFile.name : 'Pilih file PDF dari perangkat'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {pdfFile
                            ? `${Math.max(1, Math.round(pdfFile.size / 1024))} KB`
                            : 'Format .pdf · Maksimal 20 MB'}
                        </span>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setPdfFile(f);
                            if (f && !pdfLabel.trim()) {
                              setPdfLabel(f.name.replace(/\.pdf$/i, ''));
                            }
                          }}
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={pdfBusyId === 'form'}
                      className="w-full py-2.5 rounded-lg bg-[#F26440] hover:bg-[#DC4E2B] disabled:bg-slate-300 text-white font-semibold cursor-pointer"
                    >
                      {pdfBusyId === 'form'
                        ? 'Mengunggah PDF...'
                        : pdfFile
                          ? 'Unggah PDF & Simpan'
                          : pdfEditingId
                            ? 'Simpan Perubahan Tombol'
                            : 'Simpan Tombol Juknis'}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div>
                    <h2 className="font-display font-bold text-base text-[#1A2438]">
                      Daftar Tombol &amp; File Juknis PDF ({(config?.juknis_pdfs || []).length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Klik <strong>Upload / Ganti PDF</strong> langsung pada salah satu tombol di bawah saat file PDF siap.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {(config?.juknis_pdfs || []).map((item) => {
                      const hasFile = Boolean(item.file_url);
                      const isBusy = pdfBusyId === item.id;
                      return (
                        <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#F26440]">
                                {item.kegiatan === 'try-out'
                                  ? 'Try Out TKA SD'
                                  : item.kegiatan === 'mobile-legends'
                                    ? 'Mobile Legends'
                                    : 'Umum'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  hasFile ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {hasFile ? 'PDF Tersedia' : 'Belum Diunggah'}
                              </span>
                            </div>
                            <p className="font-semibold text-sm text-[#1A2438]">{item.label}</p>
                            {hasFile && (
                              <p className="text-xs text-slate-500 truncate">
                                {item.file_name} ({Math.max(1, Math.round((item.file_size || 0) / 1024))} KB)
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <label
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                                hasFile
                                  ? 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                                  : 'bg-[#1A2438] text-white hover:bg-slate-800'
                              }`}
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>{isBusy ? 'Mengunggah...' : hasFile ? 'Ganti PDF' : 'Upload PDF'}</span>
                              <input
                                type="file"
                                accept="application/pdf,.pdf"
                                disabled={isBusy}
                                className="sr-only"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleInlineUploadPdf(item, f);
                                  e.target.value = '';
                                }}
                              />
                            </label>

                            {hasFile && (
                              <a
                                href={item.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                title="Buka PDF"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Buka</span>
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setPdfEditingId(item.id);
                                setPdfLabel(item.label);
                                setPdfKegiatan(item.kegiatan);
                                setPdfFile(null);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#1A2438] hover:bg-slate-100 cursor-pointer"
                              aria-label="Edit label tombol"
                              title="Edit Judul & Kategori"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {hasFile && (
                              <button
                                type="button"
                                onClick={() => handleDeletePdf(item.id, 'file')}
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 cursor-pointer"
                                title="Hapus file PDF saja"
                                aria-label="Hapus file PDF"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeletePdf(item.id, 'slot')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Hapus tombol Juknis"
                              aria-label="Hapus tombol"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit">
              <form onSubmit={handleSaveContent} className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-base text-[#1A2438] capitalize">
                    {editingId ? `Edit ${section}` : `Tambah ${section}`}
                  </h2>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => resetContentForm(section)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batal Edit</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {section === 'faq'
                      ? 'Pertanyaan'
                      : section === 'hadiah'
                        ? 'Peringkat (mis. Juara 1)'
                        : section === 'sponsor'
                          ? 'Nama Sponsor / Partner'
                          : 'Judul'}
                  </label>
                  <input
                    type="text"
                    required
                    value={cForm.title}
                    onChange={(e) => setCForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>

                {(section === 'pengumuman' || section === 'faq') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Kategori</label>
                      <select
                        value={cForm.kategori}
                        onChange={(e) => setCForm((p) => ({ ...p, kategori: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      >
                        <option value="Umum">Umum</option>
                        <option value="Try Out">Try Out</option>
                        <option value="Mobile Legends">Mobile Legends</option>
                      </select>
                    </div>
                    {section === 'pengumuman' ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
                        <input
                          type="date"
                          value={cForm.tanggal}
                          onChange={(e) => setCForm((p) => ({ ...p, tanggal: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Urutan</label>
                        <input
                          type="number"
                          value={cForm.urutan}
                          onChange={(e) => setCForm((p) => ({ ...p, urutan: Number(e.target.value) }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                        />
                      </div>
                    )}
                  </div>
                )}

                {section === 'pengumuman' && (
                  <div className="flex items-center gap-6 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cForm.pinned}
                        onChange={(e) => setCForm((p) => ({ ...p, pinned: e.target.checked }))}
                        className="accent-[#F26440]"
                      />
                      <span>Sematkan (Penting)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cForm.published}
                        onChange={(e) => setCForm((p) => ({ ...p, published: e.target.checked }))}
                        className="accent-[#0D9488]"
                      />
                      <span>Publikasikan</span>
                    </label>
                  </div>
                )}

                {(section === 'jadwal' || section === 'hadiah' || section === 'galeri') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Kegiatan</label>
                      <select
                        value={cForm.kegiatan}
                        onChange={(e) => setCForm((p) => ({ ...p, kegiatan: e.target.value as KegiatanType }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      >
                        {section !== 'hadiah' && <option value="umum">Umum</option>}
                        <option value="try-out">Try Out TKA SD</option>
                        <option value="mobile-legends">Mobile Legends</option>
                      </select>
                    </div>
                    {section === 'galeri' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Pilihan Foto</label>
                        <select
                          value={cForm.image_key}
                          onChange={(e) => setCForm((p) => ({ ...p, image_key: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300"
                        >
                          <option value="campus">Kampus SMPN 2 Pulung</option>
                          <option value="tryout">Suasana Try Out</option>
                          <option value="esports">Turnamen Esport</option>
                          <option value="hero">Kolaborasi Pelajar</option>
                        </select>
                      </div>
                    )}
                    {section === 'jadwal' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Lokasi</label>
                        <input
                          type="text"
                          value={cForm.lokasi}
                          onChange={(e) => setCForm((p) => ({ ...p, lokasi: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300"
                        />
                      </div>
                    )}
                  </div>
                )}

                {(section === 'jadwal' || section === 'galeri') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {section === 'jadwal' ? 'Tanggal Mulai' : 'Tanggal Dokumentasi'}
                      </label>
                      <input
                        type="date"
                        value={cForm.tanggal}
                        onChange={(e) => setCForm((p) => ({ ...p, tanggal: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                    {section === 'jadwal' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Selesai</label>
                        <input
                          type="date"
                          value={cForm.tanggal_selesai}
                          onChange={(e) => setCForm((p) => ({ ...p, tanggal_selesai: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                        />
                      </div>
                    )}
                  </div>
                )}

                {section === 'sponsor' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Tier Sponsor</label>
                      <select
                        value={cForm.tier}
                        onChange={(e) => setCForm((p) => ({ ...p, tier: e.target.value as SponsorItem['tier'] }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      >
                        <option value="Utama">Utama</option>
                        <option value="Pendukung">Pendukung</option>
                        <option value="Media Partner">Media Partner</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Tautan (Opsional)</label>
                      <input
                        type="text"
                        value={cForm.link}
                        onChange={(e) => setCForm((p) => ({ ...p, link: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>
                )}

                {section !== 'sponsor' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {section === 'faq' ? 'Jawaban' : section === 'hadiah' ? 'Rincian Hadiah' : 'Isi / Deskripsi'}
                    </label>
                    <textarea
                      rows={3}
                      value={cForm.body}
                      onChange={(e) => setCForm((p) => ({ ...p, body: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-[#F26440] hover:bg-[#DC4E2B] text-white font-semibold cursor-pointer"
                >
                  {editingId ? 'Simpan Perubahan' : 'Tambah Konten'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="font-display font-bold text-base text-[#1A2438] capitalize">
                Daftar {section} ({currentItems.length})
              </h2>
              <div className="divide-y divide-slate-100">
                {currentItems.map((item) => (
                  <div key={item.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm text-[#1A2438]">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#1A2438] hover:bg-slate-100 cursor-pointer"
                        aria-label="Edit item"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteContent(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        aria-label="Hapus item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
            )}
          </div>
        )}

        {/* TAB 2: PENGATURAN & TAMPILAN DASHBOARD PENGGUNA */}
        {tab === 'pengaturan' && config && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.updateConfig(config);
                showToast('Seluruh pengaturan & tampilan halaman pengguna berhasil diperbarui.');
                onPublicUpdated();
              } catch (err) {
                showToast(err instanceof Error ? err.message : 'Gagal simpan pengaturan.');
              }
            }}
            className="max-w-[980px] space-y-6"
          >
            {/* Section 1: Kontrol Pendaftaran, Kuota & Tanggal */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
              <div>
                <h2 className="font-display font-bold text-lg text-[#1A2438]">1. Status Pendaftaran, Kuota &amp; Jadwal</h2>
                <p className="text-xs text-slate-500">Mengatur pembukaan pendaftaran, batas kuota, ruang, dan jadwal pelaksanaan.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 cursor-pointer">
                  <span className="text-sm font-semibold text-[#1A2438]">Buka Pendaftaran Try Out</span>
                  <input
                    type="checkbox"
                    checked={config.reg_to_open}
                    onChange={(e) => setConfig({ ...config, reg_to_open: e.target.checked })}
                    className="w-4 h-4 accent-[#0D9488]"
                  />
                </label>
                <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 cursor-pointer">
                  <span className="text-sm font-semibold text-[#1A2438]">Buka Pendaftaran Mobile Legends</span>
                  <input
                    type="checkbox"
                    checked={config.reg_ml_open}
                    onChange={(e) => setConfig({ ...config, reg_ml_open: e.target.checked })}
                    className="w-4 h-4 accent-[#F26440]"
                  />
                </label>
                <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 cursor-pointer">
                  <span className="text-sm font-semibold text-[#1A2438]">Wajib Kartu Pelajar di Form ML</span>
                  <input
                    type="checkbox"
                    checked={config.ml_require_student_card}
                    onChange={(e) => setConfig({ ...config, ml_require_student_card: e.target.checked })}
                    className="w-4 h-4 accent-[#F26440]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Kuota Try Out</label>
                  <input
                    type="number"
                    value={config.quota_to}
                    onChange={(e) => setConfig({ ...config, quota_to: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Kuota Tim Mobile Legends</label>
                  <input
                    type="number"
                    value={config.quota_ml}
                    onChange={(e) => setConfig({ ...config, quota_ml: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Kapasitas per Ruang TO</label>
                  <input
                    type="number"
                    value={config.to_room_capacity}
                    onChange={(e) => setConfig({ ...config, to_room_capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Deadline Pendaftaran TO</label>
                  <input
                    type="datetime-local"
                    value={config.reg_to_deadline.slice(0, 16)}
                    onChange={(e) => setConfig({ ...config, reg_to_deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Deadline Pendaftaran ML</label>
                  <input
                    type="datetime-local"
                    value={config.reg_ml_deadline.slice(0, 16)}
                    onChange={(e) => setConfig({ ...config, reg_ml_deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Pelaksanaan Try Out</label>
                  <input
                    type="datetime-local"
                    value={config.event_date_to.slice(0, 16)}
                    onChange={(e) => setConfig({ ...config, event_date_to: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Pelaksanaan ML</label>
                  <input
                    type="datetime-local"
                    value={config.event_date_ml.slice(0, 16)}
                    onChange={(e) => setConfig({ ...config, event_date_ml: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Hero Beranda & Footer */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4 text-sm">
              <div>
                <h2 className="font-display font-bold text-lg text-[#1A2438]">2. Teks Hero Beranda &amp; Footer</h2>
                <p className="text-xs text-slate-500">Semua teks utama yang tampil di halaman depan pengguna dan footer situs.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Acara</label>
                  <input
                    type="text"
                    value={config.event_name}
                    onChange={(e) => setConfig({ ...config, event_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Label Tanggal di Hero</label>
                  <input
                    type="text"
                    value={config.hero_date_label}
                    onChange={(e) => setConfig({ ...config, hero_date_label: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Judul Utama Hero (Headline)</label>
                <input
                  type="text"
                  value={config.hero_title}
                  onChange={(e) => setConfig({ ...config, hero_title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subjudul / Deskripsi Hero</label>
                <textarea
                  rows={2}
                  value={config.hero_subtitle}
                  onChange={(e) => setConfig({ ...config, hero_subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Judul Lencana Hero</label>
                  <input
                    type="text"
                    value={config.hero_badge_title}
                    onChange={(e) => setConfig({ ...config, hero_badge_title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Subjudul Lencana Hero</label>
                  <input
                    type="text"
                    value={config.hero_badge_subtitle}
                    onChange={(e) => setConfig({ ...config, hero_badge_subtitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi Footer Situs</label>
                <textarea
                  rows={2}
                  value={config.footer_description}
                  onChange={(e) => setConfig({ ...config, footer_description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            {/* Section 3: Informasi Kegiatan Try Out & Mobile Legends */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#1A2438]">3. Informasi Kartu &amp; Detail Kegiatan</h2>
                  <p className="text-xs text-slate-500">Mengatur judul, deskripsi, mata uji, format, dan syarat yang tampil di kartu beranda maupun halaman detail.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTab('konten');
                    setSection('juknis');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-[#F26440] self-start cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    Upload Juknis PDF ({(config.juknis_pdfs || []).filter((j) => j.file_url).length}/
                    {(config.juknis_pdfs || []).length} tersedia)
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Try Out */}
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="font-display font-bold text-sm text-[#0D9488]">Try Out TKA SD</p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Judul Try Out</label>
                    <input
                      type="text"
                      value={config.to_title}
                      onChange={(e) => setConfig({ ...config, to_title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Format Pelaksanaan</label>
                    <input
                      type="text"
                      value={config.to_format}
                      onChange={(e) => setConfig({ ...config, to_format: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi Singkat</label>
                    <textarea
                      rows={3}
                      value={config.to_description}
                      onChange={(e) => setConfig({ ...config, to_description: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mata Uji (1 poin per baris)</label>
                    <textarea
                      rows={4}
                      value={(config.to_subjects || []).join('\n')}
                      onChange={(e) => setConfig({ ...config, to_subjects: e.target.value.split('\n') })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Syarat &amp; Perlengkapan (1 poin per baris)</label>
                    <textarea
                      rows={4}
                      value={(config.to_requirements || []).join('\n')}
                      onChange={(e) => setConfig({ ...config, to_requirements: e.target.value.split('\n') })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                {/* Mobile Legends */}
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="font-display font-bold text-sm text-[#F26440]">Kompetisi Mobile Legends</p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Judul Turnamen ML</label>
                    <input
                      type="text"
                      value={config.ml_title}
                      onChange={(e) => setConfig({ ...config, ml_title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Sasaran Peserta</label>
                      <input
                        type="text"
                        value={config.ml_scope}
                        onChange={(e) => setConfig({ ...config, ml_scope: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Info Technical Meeting</label>
                      <input
                        type="text"
                        value={config.ml_tm_date}
                        onChange={(e) => setConfig({ ...config, ml_tm_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi Singkat</label>
                    <textarea
                      rows={3}
                      value={config.ml_description}
                      onChange={(e) => setConfig({ ...config, ml_description: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Format Pertandingan (1 poin per baris)</label>
                    <textarea
                      rows={4}
                      value={(config.ml_format || []).join('\n')}
                      onChange={(e) => setConfig({ ...config, ml_format: e.target.value.split('\n') })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Aturan Kelayakan (1 poin per baris)</label>
                    <textarea
                      rows={4}
                      value={(config.ml_rules_summary || []).join('\n')}
                      onChange={(e) => setConfig({ ...config, ml_rules_summary: e.target.value.split('\n') })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Alur Pendaftaran 4 Langkah */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4 text-sm">
              <div>
                <h2 className="font-display font-bold text-lg text-[#1A2438]">4. Alur Pendaftaran (4 Langkah di Beranda)</h2>
                <p className="text-xs text-slate-500">Edit judul dan keterangan masing-masing langkah pendaftaran peserta.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(config.alur_steps || []).map((step, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <span className="font-mono text-xs font-bold text-[#F26440]">{step.no}</span>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          alur_steps: config.alur_steps.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s)),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                    />
                    <textarea
                      rows={2}
                      value={step.desc}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          alur_steps: config.alur_steps.map((s, i) => (i === idx ? { ...s, desc: e.target.value } : s)),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Section 5: Identitas Sekolah & Kontak Panitia */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4 text-sm">
              <div>
                <h2 className="font-display font-bold text-lg text-[#1A2438]">5. Sekolah, Lokasi &amp; Kontak Panitia</h2>
                <p className="text-xs text-slate-500">Informasi yang tampil di Hero, halaman Kontak, Footer, dan tombol WhatsApp.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Sekolah Penyelenggara</label>
                  <input
                    type="text"
                    value={config.school_name}
                    onChange={(e) => setConfig({ ...config, school_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lokasi Singkat Acara</label>
                  <input
                    type="text"
                    value={config.event_location}
                    onChange={(e) => setConfig({ ...config, event_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Lengkap Sekolah</label>
                  <input
                    type="text"
                    value={config.school_address}
                    onChange={(e) => setConfig({ ...config, school_address: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp Panitia (format 628...)</label>
                  <input
                    type="text"
                    value={config.wa_panitia}
                    onChange={(e) => setConfig({ ...config, wa_panitia: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jam Layanan Panitia</label>
                  <input
                    type="text"
                    value={config.service_hours}
                    onChange={(e) => setConfig({ ...config, service_hours: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tautan Google Maps Lokasi</label>
                  <input
                    type="url"
                    value={config.maps_url}
                    onChange={(e) => setConfig({ ...config, maps_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-8 py-3 rounded-full bg-[#F26440] hover:bg-[#DC4E2B] text-white text-sm font-semibold shadow-sm cursor-pointer"
              >
                Simpan Seluruh Pengaturan &amp; Tampilan
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: AKUN */}
        {tab === 'akun' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit">
              <h2 className="font-display font-bold text-base text-[#1A2438]">Tambah Akun Admin</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const updated = await api.createUser({ ...newUser, role: 'ADMIN' });
                    setUsers(updated);
                    setNewUser({ username: '', nama: '', password: '', role: 'ADMIN' });
                    showToast('Akun admin baru berhasil dibuat.');
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'Gagal membuat akun.');
                  }
                }}
                className="space-y-3 text-sm"
              >
                <input
                  type="text"
                  required
                  placeholder="Username (tanpa spasi)"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Admin"
                  value={newUser.nama}
                  onChange={(e) => setNewUser({ ...newUser, nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Password (min. 6 karakter)"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-[#F26440] text-white font-semibold cursor-pointer"
                >
                  Buat Akun Admin
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="font-display font-bold text-base text-[#1A2438]">Daftar Akun Admin</h2>
              <div className="divide-y divide-slate-100 text-sm">
                {users.map((u) => (
                  <div key={u.username} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#1A2438]">
                        {u.nama} <span className="font-mono text-xs text-slate-500">(@{u.username})</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Role: {u.role} · Status: {u.aktif ? 'Aktif' : 'Nonaktif'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const updated = await api.updateUser({
                              username: u.username,
                              aktif: !u.aktif,
                            });
                            setUsers(updated);
                            showToast(`Status ${u.username} diperbarui.`);
                          } catch (err) {
                            showToast(err instanceof Error ? err.message : 'Gagal ubah status.');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
                      >
                        {u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EKSPOR & DAFTAR HADIR */}
        {tab === 'ekspor' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
              <button
                type="button"
                onClick={() => api.downloadExport('/api/admin/export/peserta-to', 'peserta-tryout.csv')}
                className="flex items-center justify-between p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-left cursor-pointer"
              >
                <div>
                  <p className="font-display font-bold text-sm text-[#1A2438]">Ekspor Peserta Try Out</p>
                  <p className="text-xs text-slate-500 mt-0.5">Format CSV (Excel)</p>
                </div>
                <Download className="w-5 h-5 text-[#0D9488]" />
              </button>

              <button
                type="button"
                onClick={() => api.downloadExport('/api/admin/export/tim-ml', 'tim-mobile-legends.csv')}
                className="flex items-center justify-between p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-left cursor-pointer"
              >
                <div>
                  <p className="font-display font-bold text-sm text-[#1A2438]">Ekspor Tim ML</p>
                  <p className="text-xs text-slate-500 mt-0.5">Format CSV (Excel)</p>
                </div>
                <Download className="w-5 h-5 text-[#F26440]" />
              </button>

              <button
                type="button"
                onClick={() => api.downloadExport('/api/admin/backup', 'backup-spendapul.json')}
                className="flex items-center justify-between p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-left cursor-pointer"
              >
                <div>
                  <p className="font-display font-bold text-sm text-[#1A2438]">Backup Database</p>
                  <p className="text-xs text-slate-500 mt-0.5">Arsip JSON lengkap</p>
                </div>
                <Download className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#1A2438]">Daftar Hadir Cetak (Peserta Terverifikasi)</h2>
                  <p className="text-xs text-slate-500">Siap cetak untuk meja registrasi ulang di SMP Negeri 2 Pulung.</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A2438] text-white text-xs font-semibold no-print cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Daftar Hadir</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-slate-200">Kode</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">No. Peserta / Seed</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Nama / Tim</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Asal Sekolah</th>
                      <th className="py-2.5 px-3">Tanda Tangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {toList
                      .filter((p) => p.status === 'VERIFIED')
                      .map((p) => (
                        <tr key={p.reg_code}>
                          <td className="py-2.5 px-3 font-mono border-r border-slate-200">{p.reg_code}</td>
                          <td className="py-2.5 px-3 font-mono border-r border-slate-200">
                            {p.no_peserta} ({p.ruang})
                          </td>
                          <td className="py-2.5 px-3 font-semibold border-r border-slate-200">{p.nama_lengkap}</td>
                          <td className="py-2.5 px-3 border-r border-slate-200">{p.asal_sd}</td>
                          <td className="py-2.5 px-3 text-slate-400">...............</td>
                        </tr>
                      ))}
                    {mlList
                      .filter((t) => t.status === 'VERIFIED')
                      .map((t) => (
                        <tr key={t.reg_code}>
                          <td className="py-2.5 px-3 font-mono border-r border-slate-200">{t.reg_code}</td>
                          <td className="py-2.5 px-3 font-mono border-r border-slate-200">{t.seed || 'Tim ML'}</td>
                          <td className="py-2.5 px-3 font-semibold border-r border-slate-200">{t.nama_tim}</td>
                          <td className="py-2.5 px-3 border-r border-slate-200">{t.asal_sekolah}</td>
                          <td className="py-2.5 px-3 text-slate-400">...............</td>
                        </tr>
                      ))}
                    {toList.filter((p) => p.status === 'VERIFIED').length === 0 &&
                      mlList.filter((t) => t.status === 'VERIFIED').length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                            Belum ada peserta atau tim terverifikasi untuk dicetak.
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-red-200 rounded-xl p-6 space-y-3 no-print">
              <h3 className="font-display font-bold text-base text-[#DC2626]">Hapus Data Pendaftaran (Khusus Admin)</h3>
              <p className="text-xs text-slate-600">
                Gunakan hanya untuk menghapus data pendaftar yang membatalkan keikutsertaan atau data tidak valid.
              </p>
              {toList.length === 0 && mlList.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada data pendaftaran yang tersimpan.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {toList.slice(0, 6).map((p) => (
                    <button
                      key={p.reg_code}
                      type="button"
                      onClick={() => setDeleteTarget({ type: 'try-out', code: p.reg_code })}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-mono text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      Hapus {p.reg_code}
                    </button>
                  ))}
                  {mlList.slice(0, 4).map((t) => (
                    <button
                      key={t.reg_code}
                      type="button"
                      onClick={() => setDeleteTarget({ type: 'mobile-legends', code: t.reg_code })}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-mono text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      Hapus {t.reg_code}
                    </button>
                  ))}
                </div>
              )}
              {deleteTarget && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-red-900">
                    Konfirmasi penghapusan permanen data <span className="font-mono">{deleteTarget.code}</span>?
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(null)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteRegistrasi(deleteTarget.type, deleteTarget.code);
                        setDeleteTarget(null);
                        showToast(`Data ${deleteTarget.code} dihapus.`);
                        loadAdminData();
                        onPublicUpdated();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#DC2626] text-white text-xs font-semibold cursor-pointer"
                    >
                      Ya, Hapus Permanen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: LOG AKTIVITAS */}
        {tab === 'log' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-display font-bold text-base text-[#1A2438]">Riwayat Aktivitas Sistem</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Pengguna</th>
                    <th className="py-3 px-4">Aksi</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {formatTanggalWaktuIndo(l.timestamp)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-[#1A2438]">{l.username}</td>
                      <td className="py-2.5 px-4 font-mono text-[#0D9488]">{l.aksi}</td>
                      <td className="py-2.5 px-4 font-mono">{l.target}</td>
                      <td className="py-2.5 px-4 text-slate-600">{l.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
