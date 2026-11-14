# Panduan Deploy: Google Spreadsheet + Google Drive + GAS + Vercel

## 1. Setup Google Apps Script (`gas-backend/Code.gs`)
1. Buka **[script.google.com](https://script.google.com)** menggunakan akun Google sekolah/panitia (`spendapul5758@gmail.com` atau akun panitia).
2. Klik **New Project (Proyek Baru)**, lalu salin seluruh isi file `gas-backend/Code.gs` ke editor `Code.gs` dan simpan (**Ctrl+S**).
3. Pada dropdown fungsi di toolbar atas, pilih **`setupSpendapul`** lalu klik **Run (Jalankan)**.
4. Berikan izin akses Google Sheets & Google Drive saat diminta.
5. Setelah selesai, buka **Execution Log**:
   - Spreadsheet **`DB_SPENDAPUL`** otomatis dibuat lengkap dengan seluruh tab (`Config`, `Peserta_TO`, `Tim_ML`, `Anggota_ML`, `Pengumuman`, `Jadwal`, `FAQ`, `Hadiah`, `Sponsor`, `Galeri`, `Users`, `Sessions`, `Log`, `Counter`, `Idempotency`).
   - Folder Google Drive **`Spendapul Competition 2026`** otomatis dibuat beserta subfoldernya (`01_Juknis & Dokumen`, `02_Try Out/Sertifikat`, `03_Mobile Legends/Logo Tim`, `03_Mobile Legends/Kartu Pelajar`, `04_Galeri`, `05_Backup`).
   - Catat nilai **`PROXY_KEY`** yang muncul di Execution Log.
6. *(Opsional)* Jalankan fungsi **`setupTriggers`** sekali untuk mengaktifkan backup harian otomatis ke folder `05_Backup`.

## 2. Deploy GAS sebagai Web App
1. Di editor Apps Script, klik **Deploy -> New deployment**.
2. Pilih tipe **Web app**:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
3. Klik **Deploy**, lalu salin **Web App URL** (berakhiran `/exec`).

## 3. Deploy ke Vercel
1. Hubungkan repository proyek ini ke **Vercel** (Framework Preset: **Vite**).
2. Tambahkan **Environment Variables** di Project Settings Vercel:
   - `GAS_URL` = Web App URL GAS dari langkah 2 (`https://script.google.com/macros/s/.../exec`)
   - `PROXY_KEY` = nilai `PROXY_KEY` dari Execution Log langkah 1
3. Klik **Deploy**.
   - File `vercel.json` dan `api/proxy.ts` akan otomatis mem-proxy seluruh request `/api/*` ke Google Apps Script, melayani PDF Juknis dari Google Drive lewat `/api/juknis-pdf/*`, serta menyimpan upload pendaftar ke Spreadsheet & Drive.

## 4. Login Awal Panel Admin
- Buka `/admin` atau `/login` pada domain Vercel Anda.
- Login awal: `admin` / `admin123` (segera ubah password di menu **Akun Admin** setelah berhasil masuk).
