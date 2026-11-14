# DESIGN.md — Spendapul Competition
**Pusat Informasi & Pendaftaran Acara SMP Negeri 2 Pulung**

Versi 1.1 · Stack: Google Spreadsheet · Google Drive · Google Apps Script (GAS) · Vercel
Perubahan v1.1: kegiatan **gratis** (tanpa pembayaran), sisi admin disederhanakan menjadi **dua halaman: Dashboard dan Admin**.

---

## 1. Ringkasan

**Spendapul Competition** adalah acara SMP Negeri 2 Pulung dengan dua kegiatan, **keduanya gratis**:

| Kegiatan | Sasaran | Format peserta |
|---|---|---|
| **Try Out TKA SD** | Siswa kelas 6 SD/MI | Individu |
| **Kompetisi Mobile Legends** | Pelajar (SMP/SMA sederajat — dapat diatur) | Tim (5 pemain utama + 1 cadangan) |

Landing page berfungsi sebagai **satu pintu informasi**: profil acara, juknis, pendaftaran online, pengumuman, jadwal, hasil, dan kontak panitia. Panitia mengelola semuanya lewat halaman **Dashboard** dan **Admin** tanpa menyentuh kode.

### Tujuan
1. Pendaftaran online yang mudah dari HP (mayoritas pengguna mobile).
2. Informasi selalu terbaru tanpa deploy ulang (konten dikelola dari halaman Admin).
3. Data peserta rapi, terverifikasi, dan bisa dipantau real-time.
4. Tahan dipakai banyak orang bersamaan (lihat bagian 9).
5. Biaya Rp0 (semua layanan dalam tier gratis).

### Keputusan yang sudah ditetapkan
- Kegiatan **gratis** → tidak ada bukti bayar, rekening, atau rekap pemasukan.
- Pengguna sisi admin hanya dua jenis halaman: **Dashboard** dan **Admin**. Panitia sendiri adalah pengguna Dashboard/Admin (tidak ada role "panitia" terpisah).

### Asumsi (silakan koreksi)
- **Dashboard** = halaman kerja harian panitia (pantau, verifikasi, check-in, input hasil). **Admin** = halaman pengaturan (konten, pengaturan acara, akun, ekspor, log).
- Verifikasi tetap ada, tetapi untuk **memeriksa kelayakan data** (kelas 6, status pelajar, data ID ML lengkap), bukan pembayaran.
- Try Out dilaksanakan **tatap muka di sekolah**; opsi CBT online ada di bagian 12.

---

## 2. Peran Pengguna (Roles)

| Role | Login | Halaman | Hak akses |
|---|---|---|---|
| **Pengunjung / Peserta** | Tidak | Halaman publik | Lihat informasi, daftar, cek status dengan Kode Registrasi + nomor WA |
| **Dashboard** | Ya | `/dashboard` | Statistik, daftar peserta & tim, verifikasi/tolak, check-in hari-H, input skor & hasil pertandingan. Tidak dapat mengubah konten, pengaturan, atau akun |
| **Admin** | Ya | `/dashboard` + `/admin` | Semua hak Dashboard + kelola konten, pengaturan acara (buka/tutup, kuota), akun pengguna, ekspor, hapus data, log |

> Akun dibuat per orang oleh Admin dan diberi role **Dashboard** atau **Admin**.

---

## 3. Arsitektur Sistem

```
┌────────────┐      ┌──────────────────────┐      ┌─────────────────────┐
│  Browser   │ ───► │  Vercel              │ ───► │  Google Apps Script │
│  (HP/PC)   │ ◄─── │  Frontend + /api/*   │ ◄─── │  Web App (backend)  │
└────────────┘      │  (proxy + cache)     │      └──────────┬──────────┘
                    └──────────────────────┘                 │
                                                 ┌───────────┴───────────┐
                                                 ▼                       ▼
                                          Google Spreadsheet       Google Drive
                                          (database)               (file upload)
```

- **Vercel** — hosting frontend + route `/api/*` sebagai perantara ke GAS (URL GAS tersembunyi, cache CDN, rate limit, anti-spam).
- **GAS Web App** — logika backend: validasi, baca/tulis Sheet, upload ke Drive, autentikasi.
- **Spreadsheet** — database (satu file, banyak tab; bagian 5).
- **Drive** — penyimpanan kartu pelajar, logo tim, poster, juknis PDF, sertifikat.

### Teknologi frontend (rekomendasi)
- **Next.js (App Router) + Tailwind CSS**, deploy ke Vercel dari GitHub. Alternatif tanpa build step: HTML + Tailwind + vanilla JS.
- Ikon: lucide-react.

---

## 4. Struktur Halaman

### 4.1 Halaman Publik
| Route | Isi |
|---|---|
| `/` | **Landing page**: hero + countdown, dua kartu kegiatan, jadwal, hadiah, pengumuman terbaru, sponsor, FAQ singkat, CTA "Daftar Gratis" |
| `/try-out` | Detail Try Out TKA SD: deskripsi, mapel, jadwal, lokasi, syarat, juknis ringkas, tombol daftar |
| `/mobile-legends` | Detail kompetisi ML: format, aturan, hadiah, jadwal, syarat tim, tombol daftar |
| `/daftar/try-out` | Form pendaftaran Try Out |
| `/daftar/mobile-legends` | Form pendaftaran tim ML |
| `/juknis` | Juknis lengkap (accordion per kegiatan) + unduh PDF |
| `/jadwal` | Timeline acara |
| `/pengumuman` | Daftar pengumuman |
| `/cek-status` | Cek status: Kode Registrasi + No. WA |
| `/peserta` | Daftar peserta/tim terverifikasi (nama disamarkan sebagian) |
| `/bracket` | Bagan pertandingan ML + skor |
| `/hasil` | Hasil Try Out & juara ML (dibuka setelah acara) |
| `/faq`, `/kontak`, `/galeri` | FAQ, kontak & peta sekolah, dokumentasi |

### 4.2 Halaman Internal (hanya dua)

| Route | Akses | Fungsi |
|---|---|---|
| `/login` | — | Login (username + password) |
| `/dashboard` | Dashboard, Admin | Satu halaman berisi tab: **Ringkasan** · **Peserta Try Out** · **Tim ML** · **Check-in** · **Hasil & Bracket** |
| `/admin` | Admin saja | Satu halaman berisi tab: **Konten** · **Pengaturan** · **Akun** · **Ekspor** · **Log** |

Isi tab **/dashboard**:
- **Ringkasan**: kartu statistik (total pendaftar TO, total tim ML, pending, terverifikasi, ditolak, kuota terpakai, hadir hari-H) + grafik pendaftar per hari.
- **Peserta Try Out / Tim ML**: tabel cari, filter status, panel detail, tombol Verifikasi / Tolak (dengan catatan) dan tombol "Kirim info via WhatsApp".
- **Check-in**: scan QR dari kamera HP atau input kode manual.
- **Hasil & Bracket**: input skor Try Out, atur pertandingan dan skor ML.

Isi tab **/admin**:
- **Konten**: pengumuman, jadwal, FAQ, juknis, hadiah, sponsor.
- **Pengaturan**: buka/tutup pendaftaran, kuota, deadline, tanggal acara, kontak WA, buka/tutup halaman hasil.
- **Akun**: tambah/nonaktifkan pengguna, atur role (Dashboard/Admin), reset password.
- **Ekspor**: unduh CSV/Excel, daftar hadir cetak.
- **Log**: riwayat aktivitas.

---

## 5. Desain Database (Google Spreadsheet)

Satu Spreadsheet: **`DB_SPENDAPUL`**. Baris 1 = header.

### Tab `Config` (key–value)
| key | contoh |
|---|---|
| `event_name` | Spendapul Competition 2026 |
| `reg_to_open` / `reg_ml_open` | TRUE |
| `reg_to_deadline` / `reg_ml_deadline` | 2026-12-10 23:59 |
| `quota_to` / `quota_ml` | 200 / 32 |
| `wa_panitia` | 62812xxxxxxx |
| `event_date_to` / `event_date_ml` | tanggal pelaksanaan |
| `show_hasil` | FALSE |

### Tab `Peserta_TO`
`reg_code` · `timestamp` · `nama_lengkap` · `jenis_kelamin` · `asal_sd` · `kelas` · `nisn` · `tempat_lahir` · `tgl_lahir` · `nama_ortu` · `wa_ortu` · `email` · `alamat` · `persetujuan` · `status` (PENDING/VERIFIED/REJECTED) · `catatan` · `no_peserta` · `ruang` · `checkin_at` · `verified_by` · `verified_at`

### Tab `Tim_ML`
`reg_code` · `timestamp` · `nama_tim` · `asal_sekolah` · `nama_kapten` · `wa_kapten` · `email` · `logo_url` · `persetujuan` · `status` · `catatan` · `seed` · `checkin_at` · `verified_by` · `verified_at`

### Tab `Anggota_ML`
`member_id` · `reg_code` · `peran` (Utama/Cadangan) · `nama_lengkap` · `nickname_ingame` · `id_ml` · `server_id` · `kelas` · `kartu_pelajar_url`

### Tab `Hasil_TO`
`reg_code` · `no_peserta` · `nama` · `skor_bhs_indonesia` · `skor_matematika` · `skor_lainnya` · `total` · `ranking` · `sertifikat_url`

### Tab `Match_ML`
`match_id` · `babak` · `tim_a` · `tim_b` · `skor_a` · `skor_b` · `pemenang` · `jadwal` · `status` (Belum/Live/Selesai) · `link_live`

### Tab konten
- `Pengumuman`: `id` · `tanggal` · `judul` · `isi` · `kategori` · `pinned` · `published`
- `Jadwal`: `id` · `kegiatan` · `tanggal_mulai` · `tanggal_selesai` · `judul` · `deskripsi` · `lokasi`
- `Juknis`: `id` · `kegiatan` · `urutan` · `judul_bagian` · `isi_markdown` · `pdf_url`
- `FAQ`: `id` · `kategori` · `pertanyaan` · `jawaban` · `urutan`
- `Hadiah`: `kegiatan` · `peringkat` · `hadiah`
- `Sponsor`: `nama` · `logo_url` · `link` · `tier`

### Tab sistem
- `Users`: `username` · `password_hash` · `salt` · `role` (DASHBOARD/ADMIN) · `nama` · `aktif` · `last_login`
- `Sessions`: `token_hash` · `username` · `role` · `expires_at`
- `Log`: `timestamp` · `username` · `aksi` · `target` · `detail`
- `Counter`: `nama` · `nilai` (penomoran `TO-0001`, `ML-001` yang aman dari duplikat)
- `Stats_Cache`: hasil agregat untuk Ringkasan dashboard

---

## 6. Struktur Google Drive

```
Spendapul Competition/
├── 01_Juknis & Dokumen/     (PDF juknis, surat edaran, poster)
├── 02_Try Out/
│   └── Sertifikat/
├── 03_Mobile Legends/
│   ├── Logo Tim/
│   └── Kartu Pelajar/
├── 04_Galeri/
└── 05_Backup/               (backup Spreadsheet berkala)
```

- **Kartu pelajar** bersifat privat; admin melihatnya lewat GAS.
- File publik (poster, juknis PDF, logo sponsor): "Siapa saja yang memiliki link: Pelihat".
- Penamaan otomatis: `{reg_code}_{jenis}_{timestamp}.{ext}`; batas 2 MB per file (gambar dikompres di browser).

---

## 7. Alur Utama

### 7.1 Pendaftaran Try Out (gratis)
1. Orang tua/siswa buka `/daftar/try-out` → isi data + centang persetujuan.
2. Frontend validasi → `/api/register-to`.
3. GAS: validasi ulang → cek pendaftaran dibuka & kuota → `LockService` → buat `reg_code` → simpan ke Sheet → status `PENDING`.
4. Layar sukses: **Kode Registrasi**, tombol "Konfirmasi via WhatsApp".
5. Panitia memeriksa data di Dashboard → `VERIFIED` → peserta cek di `/cek-status` dan mengunduh **Kartu Peserta** (QR code).

### 7.2 Pendaftaran Tim Mobile Legends (gratis)
1. Kapten mengisi data tim + 5 pemain utama + (opsional) 1 cadangan; ID ML & Server ID wajib.
2. Unggah logo tim (opsional) dan kartu pelajar pemain (wajib/opsional sesuai pengaturan).
3. Validasi: nama tim unik, tidak ada ID ML ganda antar-tim, kuota tim.
4. `PENDING` → verifikasi Dashboard → `VERIFIED`.
5. Setelah pendaftaran ditutup, seed & jadwal diisi di tab Hasil & Bracket → tampil di `/bracket`.

### 7.3 Hari-H
Panitia buka tab **Check-in** di HP → scan QR kartu peserta/tim → `checkin_at` terisi; jumlah hadir muncul real-time.

### 7.4 Pasca acara
Input skor TO → ranking otomatis → Admin mengaktifkan `show_hasil` → `/hasil` tampil. Sertifikat diunggah/dibuat massal (opsional).

---

## 8. API (Google Apps Script)

Satu Web App (`doGet`/`doPost`), routing lewat parameter `action`; semua request lewat Vercel `/api/*`.

### Publik
| Method | Action | Fungsi | Cache |
|---|---|---|---|
| GET | `config_public` | Status buka/tutup, tanggal, kuota tersisa | 60 dtk |
| GET | `content` | Pengumuman, jadwal, FAQ, juknis, hadiah, sponsor | 5 mnt |
| GET | `peserta_public` | Daftar terverifikasi (disamarkan) | 2 mnt |
| GET | `bracket` | Match ML | 30 dtk |
| GET | `hasil` | Hasil (jika dibuka) | 5 mnt |
| POST | `register_to` | Daftar Try Out | — |
| POST | `register_ml` | Daftar tim ML | — |
| POST | `cek_status` | Cek status (kode + WA) | — |

### Internal (butuh token)
| Action | Role |
|---|---|
| `login`, `logout` | Dashboard, Admin |
| `stats`, `list_to`, `list_ml`, `detail_*` | Dashboard, Admin |
| `verify`, `reject`, `checkin` | Dashboard, Admin |
| `input_skor`, `update_match` | Dashboard, Admin |
| `content_upsert`, `content_delete` | Admin |
| `config_update` | Admin |
| `user_create`, `user_update` | Admin |
| `export`, `delete_registrasi`, `log_list` | Admin |

### Format respons
```json
{ "ok": true, "data": {}, "error": null, "ts": 1731500000 }
```
Error: `{ "ok": false, "error": { "code": "QUOTA_FULL", "message": "Kuota pendaftaran sudah penuh" } }`

---

## 9. Skalabilitas — Agar Dipakai Banyak Orang

| Risiko | Solusi |
|---|---|
| Ribuan pengunjung membaca bersamaan | Konten publik di-cache 2 lapis: `CacheService` GAS + CDN Vercel (`s-maxage`, `stale-while-revalidate`). Pembaca tidak menyentuh Sheet. |
| GAS membatasi eksekusi bersamaan (±30) | Halaman statis dilayani Vercel; hanya *daftar* dan aksi internal yang ke GAS. |
| Pendaftaran bersamaan → data tabrakan | `LockService.getScriptLock()` saat menulis & menomori; `Counter` atomik. |
| Lonjakan saat pendaftaran dibuka (karena gratis, biasanya ramai) | Loading state, cegah *double submit*, `idempotency_key` agar kirim ulang tidak membuat data ganda. |
| Upload file besar lambat | Kompres di browser (maks. ±1 MB), batas 2 MB. |
| Sheet membesar | Satu tab per entitas, tanpa rumus berat di tab data; agregasi di `Stats_Cache`. Aman <10 ribu baris per tab. |
| Spam/bot (lebih rawan karena gratis) | Honeypot + **Cloudflare Turnstile**, rate limit per IP & per nomor WA di route Vercel, batas 1 pendaftaran per NISN/ID ML. |
| Kuota harian GAS | Pantau lewat tab `Log`; siapkan jalur cadangan pendaftaran via WhatsApp. |
| Beban check-in | Check-in = tulis satu sel; QR berisi `reg_code`; pencarian via indeks di cache. |

**Estimasi realistis:** nyaman untuk beberapa ribu pengunjung/hari dan ratusan pendaftar, termasuk lonjakan di jam pertama pembukaan.

---

## 10. Keamanan & Privasi

Mayoritas peserta adalah **anak di bawah umur**.

1. **Autentikasi:** password di-hash (SHA-256 + salt unik), penundaan setelah 5× gagal, token sesi acak (hash disimpan di `Sessions`), kedaluwarsa 8 jam.
2. **Otorisasi per aksi** di GAS (bukan hanya disembunyikan di UI): Dashboard tidak dapat memanggil aksi Admin.
3. **Rahasia** di Script Properties GAS dan Environment Variables Vercel, bukan di kode/GitHub.
4. **GAS hanya diakses via Vercel** dengan `PROXY_KEY` yang diverifikasi.
5. **Validasi ganda** (frontend + GAS); cegah *formula injection* (awali sel teks yang diawali `= + - @` dengan `'`).
6. **Privasi:** halaman publik hanya menampilkan nama sebagian, tanpa NISN/WA/alamat. Cek status wajib kode + WA.
7. **Drive:** file sensitif privat.
8. **Persetujuan** penggunaan data (orang tua/wali untuk peserta Try Out) di form.
9. **Backup** harian otomatis ke `05_Backup`.
10. **Log** aktivitas untuk verifikasi, ubah, dan hapus data.

---

## 11. Desain Visual (UI/UX)

### Prinsip
Mobile-first · cepat dimuat (<3 dtk di 4G) · jelas dan hangat · dua kegiatan dibedakan warna.

### Palet warna (usulan)
| Peran | Warna | Hex |
|---|---|---|
| Primer | Biru tua | `#1E3A8A` |
| Aksen Try Out | Teal | `#0D9488` |
| Aksen Mobile Legends | Ungu / oranye | `#7C3AED` / `#F97316` |
| Latar | Putih / abu muda | `#FFFFFF` / `#F8FAFC` |
| Teks | Slate gelap | `#0F172A` |
| Sukses / Peringatan / Error | | `#16A34A` / `#F59E0B` / `#DC2626` |

### Tipografi
Judul **Poppins** atau **Plus Jakarta Sans** (600–800) · isi **Inter** (400–500) · fallback `system-ui, sans-serif`.

### Komponen
Navbar sticky · hero + countdown · kartu kegiatan · timeline · accordion juknis/FAQ · form multi-langkah · badge status · tabel responsif · kartu statistik · modal konfirmasi · toast · tombol WhatsApp mengambang.

### Struktur Landing Page (`/`)
1. **Navbar**: Logo · Try Out · Mobile Legends · Juknis · Jadwal · Pengumuman · tombol **Daftar Gratis**
2. **Hero**: judul, tagline, tanggal & lokasi, countdown penutupan pendaftaran, 2 CTA (Daftar Try Out / Daftar Tim ML), label **GRATIS**
3. **Tentang acara**: 2–3 kalimat + angka (kuota, hadiah, tanggal)
4. **Dua kartu kegiatan**: ikon, deskripsi, kuota tersisa (progress bar), tombol Detail & Daftar
5. **Alur pendaftaran**: Isi form → Verifikasi data → Dapat kartu peserta → Hadir di hari-H
6. **Jadwal penting** (timeline)
7. **Hadiah & fasilitas**
8. **Pengumuman terbaru** (3 item)
9. **FAQ** (5–6 pertanyaan teratas)
10. **Sponsor & media partner**
11. **Footer**: alamat + peta, kontak panitia, media sosial

### Desain form
Multi-langkah dengan progres · draf tersimpan sementara di browser · pesan error Bahasa Indonesia yang jelas · tombol kirim *disabled* + spinner · halaman sukses dengan Kode Registrasi besar, tombol salin dan kirim ke WhatsApp.

### Desain Dashboard (`/dashboard`)
Navigasi tab (di HP berupa tab geser/bawah). Kartu statistik di atas, grafik pendaftar per hari, tabel dengan pencarian/filter/paginasi, panel detail dengan aksi Verifikasi/Tolak + catatan.

### Desain Admin (`/admin`)
Navigasi tab: Konten · Pengaturan · Akun · Ekspor · Log. Editor konten sederhana (judul, isi, urutan, tampil/sembunyi), pengaturan berupa toggle & input tanggal/kuota, konfirmasi ganda untuk aksi hapus.

### Aksesibilitas
Kontras ≥ 4.5:1 · teks dasar 16px · area sentuh ≥ 44px · label form jelas · `alt` pada gambar.

---

## 12. Fitur Rekomendasi

### Prioritas tinggi (versi 1)
1. Kode registrasi + cek status (tanpa login peserta)
2. Kartu peserta/tim dengan QR + check-in hari-H
3. Countdown dan penutupan otomatis (deadline/kuota penuh)
4. Tombol WhatsApp (konfirmasi dan bantuan)
5. Notifikasi status: tombol "Kirim info" yang membuka WA dengan pesan siap kirim, dan/atau email otomatis (`MailApp`)
6. Pengumuman & juknis dikelola dari halaman Admin
7. Ekspor daftar hadir (PDF/Excel)
8. FAQ & kontak
9. **Anti-spam & anti-duplikat** (penting karena gratis): Turnstile, 1 NISN/ID ML = 1 pendaftaran

### Prioritas menengah
10. Pembagian ruang & nomor peserta otomatis (Try Out)
11. Bracket ML & skor live
12. Peringkat Try Out + analisis skor per mapel
13. Sertifikat otomatis (Google Slides → PDF → Drive)
14. Rekap asal SD peserta (bahan promosi SPMB)

### Opsional
15. Try Out CBT online (timer & acak soal)
16. Embed live streaming (YouTube/TikTok)
17. Galeri dokumentasi, survei kepuasan
18. PWA / mode gelap

### Masukan khusus
**Try Out TKA SD**
- Tentukan mapel, jumlah soal, durasi, dan sistem skor (mengikuti kisi-kisi TKA SD).
- Sediakan pembahasan soal & hasil per siswa sebagai nilai tambah bagi orang tua.
- Siapkan kuota per ruang (mis. 20–30 siswa) dan denah ruang.
- Karena gratis, tetapkan **kuota** yang jelas sesuai kapasitas ruang dan pengawas, dan siapkan **daftar tunggu** bila peminat melebihi kuota.

**Mobile Legends**
- Putuskan format (gugur atau grup + gugur), BO1/BO3, draft pick, aturan tunda/WO.
- Aturan wajib: batas usia/status pelajar, larangan joki/akun ganda/cheat, kesesuaian ID & server, toleransi keterlambatan, penyelesaian sengketa.
- Buat grup WhatsApp koordinasi kapten dan adakan technical meeting sebelum hari-H.
- Karena gratis, tim yang tidak hadir merugikan jadwal: tambahkan **aturan konfirmasi ulang** (H-1) dan sanksi tidak hadir (mis. didiskualifikasi dari slot tim cadangan).

---

## 13. Draf Konten Juknis (kerangka)

### Umum
Latar belakang & tujuan · waktu & tempat · penyelenggara & kontak · peserta & persyaratan · **ketentuan: kegiatan gratis, tanpa pungutan biaya** · tata tertib · penghargaan · penutup

### Try Out TKA SD
1. Sasaran & syarat peserta
2. Mata pelajaran & jumlah soal
3. Jadwal & alur (registrasi ulang → pembagian ruang → pengerjaan → penutupan)
4. Hal yang dibawa (kartu peserta, alat tulis)
5. Tata tertib peserta & pendamping
6. Penilaian & pengumuman hasil
7. Hak peserta (sertifikat, pembahasan, hadiah)

### Mobile Legends
1. Persyaratan tim & pemain
2. Mekanisme pendaftaran & verifikasi
3. Format pertandingan & bracket
4. Aturan permainan (draft, pause, disconnect, WO)
5. Larangan & sanksi
6. Jadwal pertandingan, konfirmasi ulang & technical meeting
7. Hadiah & penghargaan
8. Mekanisme protes & keputusan panitia

---

## 14. Struktur Proyek

```
spendapul-web/                     # repo GitHub → Vercel
├── app/
│   ├── page.tsx                   # landing
│   ├── try-out/ · mobile-legends/ · juknis/ · jadwal/
│   ├── daftar/try-out/ · daftar/mobile-legends/
│   ├── cek-status/ · pengumuman/ · bracket/ · hasil/ · faq/ · kontak/
│   ├── login/
│   ├── dashboard/                 # tab: ringkasan, peserta, tim, check-in, hasil
│   ├── admin/                     # tab: konten, pengaturan, akun, ekspor, log
│   └── api/[...path]/route.ts     # proxy ke GAS + cache + rate limit
├── components/
├── lib/ (api.ts, validators.ts, format.ts)
├── public/
└── .env.local                     # GAS_URL, PROXY_KEY, TURNSTILE_SECRET

gas-backend/
├── Code.gs        # doGet / doPost + router
├── Auth.gs        # login, session, role guard (DASHBOARD / ADMIN)
├── Register.gs    # register_to, register_ml
├── Dashboard.gs   # list, verify, checkin, skor, bracket
├── Admin.gs       # content, config, users, export
├── Drive.gs       # upload & folder helper
├── Cache.gs       # CacheService wrapper
├── Utils.gs       # validasi, id generator, lock, log
└── Triggers.gs    # backup harian, rekap stats
```

**Environment Variables (Vercel):** `GAS_URL` · `PROXY_KEY` · `TURNSTILE_SECRET` · `NEXT_PUBLIC_TURNSTILE_SITEKEY` · `NEXT_PUBLIC_WA_PANITIA`
**Script Properties (GAS):** `PROXY_KEY` · `SPREADSHEET_ID` · `ROOT_FOLDER_ID` · `SALT`

---

## 15. Rencana Pengerjaan

| Tahap | Pekerjaan | Perkiraan |
|---|---|---|
| 1. Persiapan | Finalisasi aturan, kuota, tanggal; siapkan logo, poster, kontak; buat Spreadsheet & folder Drive | 2–3 hari |
| 2. Backend | Struktur Sheet; GAS: config, content, register, cek_status, auth, verify | 4–6 hari |
| 3. Frontend publik | Landing, halaman kegiatan, juknis, form, cek status | 4–6 hari |
| 4. Dashboard & Admin | Login, dua halaman bertab, verifikasi, konten, pengaturan, akun | 4–5 hari |
| 5. Uji & optimasi | Uji beban pendaftaran, uji di berbagai HP, keamanan, cache | 2–3 hari |
| 6. Rilis | Deploy Vercel, domain (opsional), sosialisasi | 1 hari |
| 7. Hari-H & pasca | Check-in QR, skor, bracket, hasil, sertifikat | sesuai jadwal |

---

## 16. Checklist Sebelum Rilis

- [ ] Semua teks juknis, jadwal, kontak final dan dicek panitia
- [ ] Pendaftaran dites end-to-end (TO & ML) dari HP berbeda
- [ ] Uji kirim bersamaan (±30–50 pendaftar) tanpa duplikat/data hilang
- [ ] Kuota penuh & deadline menutup pendaftaran otomatis
- [ ] File kartu pelajar di Drive bersifat privat
- [ ] Password kuat; akun dibuat per orang dengan role yang tepat
- [ ] Turnstile/anti-spam aktif; aturan 1 NISN/ID ML = 1 pendaftaran berjalan
- [ ] Backup otomatis berjalan
- [ ] Rencana cadangan: pendaftaran via WhatsApp jika sistem bermasalah
- [ ] Persetujuan penggunaan data peserta (anak) tercantum di form

---

## 17. Pertanyaan Terbuka

1. **Kuota** peserta Try Out dan jumlah tim ML? Perlu daftar tunggu?
2. **Tanggal** acara, lokasi, dan batas akhir pendaftaran?
3. Mata pelajaran, jumlah soal & durasi Try Out TKA SD?
4. Format ML (gugur/grup, BO1/BO3) dan **batasan peserta** (SMP saja atau SMP–SMA)?
5. Hadiah dan sponsor (jika ada)?
6. Try Out **tatap muka**, **online (CBT)**, atau keduanya?
7. Nama & logo resmi, warna identitas, dan domain yang diinginkan (mis. `spendapul.vercel.app` atau domain sendiri)?
8. Siapa saja yang akan memegang akun **Admin** dan akun **Dashboard**?

---

*Dokumen ini adalah rancangan awal dan dapat direvisi. Langkah berikutnya: finalisasi bagian 17, lalu mulai dari struktur Spreadsheet & GAS (tahap 2).*
