/**
 * ============================================================================
 * SPENDAPUL COMPETITION 2026 — GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * SMP Negeri 2 Pulung
 *
 * Fitur:
 * 1. Pembuatan otomatis Google Spreadsheet "DB_SPENDAPUL" beserta seluruh tab & header.
 * 2. Pembuatan otomatis struktur folder Google Drive "Spendapul Competition 2026".
 * 3. Upload & streaming file PDF Juknis, Logo Tim, Kartu Pelajar, dan Backup ke Drive.
 * 4. API lengkap untuk proxy Vercel (/api/*): publik, registrasi, cek status,
 *    autentikasi SHA-256 + token sesi, verifikasi pendaftar, editor konten & konfigurasi.
 *
 * CARA SETUP AWAL:
 * 1. Buka https://script.google.com -> Proyek Baru -> tempel seluruh isi file ini ke Code.gs.
 * 2. Pilih fungsi `setupSpendapul` di toolbar atas -> klik Run (Jalankan).
 * 3. Berikan izin akses Google Sheets & Google Drive.
 * 4. Buka Execution Log untuk menyalin `SPREADSHEET_ID`, `ROOT_FOLDER_ID`, dan `PROXY_KEY`.
 * 5. Klik Deploy -> New deployment -> Web app:
 *    - Execute as: Me (email Anda)
 *    - Who has access: Anyone
 * 6. Salin Web App URL (`https://script.google.com/macros/s/.../exec`) ke Vercel Env `GAS_URL`
 *    dan salin `PROXY_KEY` ke Vercel Env `PROXY_KEY`.
 * ============================================================================
 */

var SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 jam
var CACHE_TTL_SEC = 60;

var SHEET_HEADERS = {
  Config: ['key', 'value'],
  Peserta_TO: [
    'reg_code',
    'timestamp',
    'nama_lengkap',
    'jenis_kelamin',
    'asal_sd',
    'kelas',
    'nisn',
    'tempat_lahir',
    'tgl_lahir',
    'nama_ortu',
    'wa_ortu',
    'email',
    'alamat',
    'persetujuan',
    'status',
    'catatan',
    'no_peserta',
    'ruang',
    'checkin_at',
    'verified_by',
    'verified_at',
  ],
  Tim_ML: [
    'reg_code',
    'timestamp',
    'nama_tim',
    'asal_sekolah',
    'nama_kapten',
    'wa_kapten',
    'email',
    'logo_url',
    'persetujuan',
    'status',
    'catatan',
    'seed',
    'checkin_at',
    'verified_by',
    'verified_at',
  ],
  Anggota_ML: [
    'member_id',
    'reg_code',
    'peran',
    'nama_lengkap',
    'nickname_ingame',
    'id_ml',
    'server_id',
    'kelas',
    'kartu_pelajar_url',
  ],
  Hasil_TO: [
    'reg_code',
    'no_peserta',
    'nama',
    'asal_sd',
    'skor_bhs_indonesia',
    'skor_matematika',
    'skor_lainnya',
    'total',
    'ranking',
    'sertifikat_url',
  ],
  Match_ML: [
    'match_id',
    'babak',
    'tim_a',
    'tim_b',
    'skor_a',
    'skor_b',
    'pemenang',
    'jadwal',
    'status',
    'link_live',
  ],
  Pengumuman: ['id', 'tanggal', 'judul', 'isi', 'kategori', 'pinned', 'published'],
  Jadwal: ['id', 'kegiatan', 'tanggal_mulai', 'tanggal_selesai', 'judul', 'deskripsi', 'lokasi'],
  Juknis: ['id', 'kegiatan', 'urutan', 'judul_bagian', 'isi_markdown', 'pdf_url'],
  FAQ: ['id', 'kategori', 'pertanyaan', 'jawaban', 'urutan'],
  Hadiah: ['id', 'kegiatan', 'peringkat', 'hadiah'],
  Sponsor: ['id', 'nama', 'logo_url', 'link', 'tier'],
  Galeri: ['id', 'judul', 'kegiatan', 'tanggal', 'image_key', 'deskripsi'],
  Users: [
    'username',
    'password_hash',
    'salt',
    'role',
    'nama',
    'aktif',
    'last_login',
    'failed_attempts',
    'locked_until',
  ],
  Sessions: ['token_hash', 'username', 'role', 'nama', 'expires_at'],
  Log: ['id', 'timestamp', 'username', 'aksi', 'target', 'detail'],
  Counter: ['nama', 'nilai'],
  Idempotency: ['key', 'reg_code', 'ts'],
};

var TEXT_COLS = {
  nisn: true,
  wa_ortu: true,
  wa_kapten: true,
  id_ml: true,
  server_id: true,
  no_peserta: true,
  tanggal: true,
  tanggal_mulai: true,
  tanggal_selesai: true,
  tgl_lahir: true,
  timestamp: true,
  verified_at: true,
  checkin_at: true,
  last_login: true,
};

// ============================================================================
// 1. SETUP OTOMATIS SPREADSHEET & GOOGLE DRIVE
// ============================================================================

/**
 * Jalankan fungsi ini SEKALI dari editor Apps Script untuk membuat Spreadsheet,
 * struktur folder Google Drive, akun Admin default, dan PROXY_KEY.
 */
function setupSpendapul() {
  var props = PropertiesService.getScriptProperties();

  // 1. Buat / ambil PROXY_KEY
  var proxyKey = props.getProperty('PROXY_KEY');
  if (!proxyKey) {
    proxyKey = randomHex_(24);
    props.setProperty('PROXY_KEY', proxyKey);
  }

  // 2. Buat / ambil Google Drive Folder Structure
  var driveInfo = ensureDriveFolders_();

  // 3. Buat / ambil Google Spreadsheet DB_SPENDAPUL
  var ss = ensureSpreadsheet_(driveInfo.rootFolder);

  // 4. Pastikan seluruh tab, header, config default, & akun admin tersedia
  ensureAllSheetsAndSeed_(ss);

  Logger.log('=== SETUP SPENDAPUL COMPETITION 2026 BERHASIL ===');
  Logger.log('SPREADSHEET_ID   : ' + ss.getId());
  Logger.log('SPREADSHEET_URL  : ' + ss.getUrl());
  Logger.log('ROOT_FOLDER_ID   : ' + driveInfo.rootFolder.getId());
  Logger.log('DRIVE_FOLDER_URL : ' + driveInfo.rootFolder.getUrl());
  Logger.log('PROXY_KEY        : ' + proxyKey);
  Logger.log('Admin Login      : admin / admin123 (segera ubah setelah login)');

  return {
    spreadsheet_id: ss.getId(),
    spreadsheet_url: ss.getUrl(),
    root_folder_id: driveInfo.rootFolder.getId(),
    root_folder_url: driveInfo.rootFolder.getUrl(),
    proxy_key: proxyKey,
  };
}

/**
 * Pasang trigger backup harian otomatis ke Google Drive (pukul 02:00 WIB).
 */
function setupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dailyBackupToDrive') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('dailyBackupToDrive').timeBased().everyDays(1).atHour(2).create();
  Logger.log('Trigger backup harian (02:00) berhasil dipasang.');
}

/**
 * Backup JSON otomatis ke folder 05_Backup di Google Drive.
 */
function dailyBackupToDrive() {
  var props = PropertiesService.getScriptProperties();
  var backupFolderId = props.getProperty('FOLDER_BACKUP_ID');
  if (!backupFolderId) {
    var driveInfo = ensureDriveFolders_();
    backupFolderId = driveInfo.backupFolder.getId();
  }
  var ss = getSpreadsheet_();
  var payload = {
    exported_at: new Date().toISOString(),
    config: readConfig_(ss),
    peserta_to: readTable_(ss, 'Peserta_TO'),
    tim_ml: readTable_(ss, 'Tim_ML'),
    anggota_ml: readTable_(ss, 'Anggota_ML'),
    pengumuman: readTable_(ss, 'Pengumuman'),
    jadwal: readTable_(ss, 'Jadwal'),
    faq: readTable_(ss, 'FAQ'),
    hadiah: readTable_(ss, 'Hadiah'),
    sponsor: readTable_(ss, 'Sponsor'),
    galeri: readTable_(ss, 'Galeri'),
  };
  var folder = DriveApp.getFolderById(backupFolderId);
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
  folder.createFile(
    'backup-spendapul-' + dateStr + '.json',
    JSON.stringify(payload, null, 2),
    MimeType.PLAIN_TEXT
  );
  Logger.log('Backup harian tersimpan: backup-spendapul-' + dateStr + '.json');
}

/**
 * Utilitas opsional: reset password akun admin menjadi "admin123".
 */
function resetAdminPassword() {
  var ss = getSpreadsheet_();
  var users = readTable_(ss, 'Users');
  var salt = randomHex_(16);
  var hash = sha256_(salt + ':admin123');
  var found = false;
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === 'admin') {
      users[i].salt = salt;
      users[i].password_hash = hash;
      users[i].aktif = true;
      users[i].failed_attempts = 0;
      users[i].locked_until = '';
      found = true;
      break;
    }
  }
  if (!found) {
    users.push({
      username: 'admin',
      password_hash: hash,
      salt: salt,
      role: 'ADMIN',
      nama: 'Ketua Panitia (Admin)',
      aktif: true,
      last_login: '',
      failed_attempts: 0,
      locked_until: '',
    });
  }
  writeTable_(ss, 'Users', users);
  Logger.log('Password akun admin direset ke: admin123');
}

function ensureDriveFolders_() {
  var props = PropertiesService.getScriptProperties();
  var rootId = props.getProperty('ROOT_FOLDER_ID');
  var rootFolder = null;

  if (rootId) {
    try {
      rootFolder = DriveApp.getFolderById(rootId);
      if (rootFolder.isTrashed()) rootFolder = null;
    } catch (e) {
      rootFolder = null;
    }
  }

  if (!rootFolder) {
    var existing = DriveApp.getFoldersByName('Spendapul Competition 2026');
    if (existing.hasNext()) {
      rootFolder = existing.next();
    } else {
      rootFolder = DriveApp.createFolder('Spendapul Competition 2026');
    }
    props.setProperty('ROOT_FOLDER_ID', rootFolder.getId());
  }

  var juknisFolder = getOrCreateSubfolder_(rootFolder, '01_Juknis & Dokumen');
  var toFolder = getOrCreateSubfolder_(rootFolder, '02_Try Out');
  var toCertFolder = getOrCreateSubfolder_(toFolder, 'Sertifikat');
  var mlFolder = getOrCreateSubfolder_(rootFolder, '03_Mobile Legends');
  var mlLogoFolder = getOrCreateSubfolder_(mlFolder, 'Logo Tim');
  var mlKartuFolder = getOrCreateSubfolder_(mlFolder, 'Kartu Pelajar');
  var galeriFolder = getOrCreateSubfolder_(rootFolder, '04_Galeri');
  var backupFolder = getOrCreateSubfolder_(rootFolder, '05_Backup');

  props.setProperty('FOLDER_JUKNIS_ID', juknisFolder.getId());
  props.setProperty('FOLDER_TO_SERTIFIKAT_ID', toCertFolder.getId());
  props.setProperty('FOLDER_ML_LOGO_ID', mlLogoFolder.getId());
  props.setProperty('FOLDER_ML_KARTU_ID', mlKartuFolder.getId());
  props.setProperty('FOLDER_GALERI_ID', galeriFolder.getId());
  props.setProperty('FOLDER_BACKUP_ID', backupFolder.getId());

  return {
    rootFolder: rootFolder,
    juknisFolder: juknisFolder,
    toCertFolder: toCertFolder,
    mlLogoFolder: mlLogoFolder,
    mlKartuFolder: mlKartuFolder,
    galeriFolder: galeriFolder,
    backupFolder: backupFolder,
  };
}

function getOrCreateSubfolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function ensureSpreadsheet_(rootFolder) {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  var ss = null;

  if (ssId) {
    try {
      ss = SpreadsheetApp.openById(ssId);
    } catch (e) {
      ss = null;
    }
  }

  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      ss = null;
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create('DB_SPENDAPUL');
    if (rootFolder) {
      try {
        var file = DriveApp.getFileById(ss.getId());
        file.moveTo(rootFolder);
      } catch (e) {
        // Abaikan jika gagal pindah ke subfolder
      }
    }
  }

  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  if (ssId) {
    return SpreadsheetApp.openById(ssId);
  }
  var res = setupSpendapul();
  return SpreadsheetApp.openById(res.spreadsheet_id);
}

function ensureAllSheetsAndSeed_(ss) {
  var sheetNames = Object.keys(SHEET_HEADERS);
  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var headers = SHEET_HEADERS[name];
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#F1F5F9');
      sheet.setFrozenRows(1);
    }
  }

  // Hapus sheet bawaan "Sheet1" jika sudah ada sheet lain
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {}
  }

  // Seed Config jika masih kosong
  var configSheet = ss.getSheetByName('Config');
  if (configSheet.getLastRow() <= 1) {
    writeConfig_(ss, getDefaultConfig_());
  }

  // Seed Counter jika masih kosong
  var counterSheet = ss.getSheetByName('Counter');
  if (counterSheet.getLastRow() <= 1) {
    writeTable_(ss, 'Counter', [
      { nama: 'to', nilai: 0 },
      { nama: 'ml', nilai: 0 },
    ]);
  }

  // Seed Admin default jika Users masih kosong
  var usersSheet = ss.getSheetByName('Users');
  if (usersSheet.getLastRow() <= 1) {
    var adminSalt = randomHex_(16);
    writeTable_(ss, 'Users', [
      {
        username: 'admin',
        password_hash: sha256_(adminSalt + ':admin123'),
        salt: adminSalt,
        role: 'ADMIN',
        nama: 'Ketua Panitia (Admin)',
        aktif: true,
        last_login: '',
        failed_attempts: 0,
        locked_until: '',
      },
    ]);
  }

  // Seed konten informasi awal (Pengumuman, Jadwal, FAQ, Hadiah, Sponsor, Galeri) jika kosong
  seedContentIfEmpty_(ss);
}

function getDefaultConfig_() {
  return {
    event_name: 'Spendapul Competition 2026',
    tagline: 'Ajang Prestasi Akademik & Esport Pelajar Gratis di SMP Negeri 2 Pulung',
    school_name: 'SMP Negeri 2 Pulung',
    school_address: 'Jl. Raya Pulung–Sooko, Kec. Pulung, Kab. Ponorogo, Jawa Timur 63481',
    reg_to_open: true,
    reg_ml_open: true,
    reg_to_deadline: '2026-12-12T23:59',
    reg_ml_deadline: '2026-12-12T23:59',
    quota_to: 200,
    quota_ml: 32,
    wa_panitia: '6281234567890',
    event_date_to: '2026-12-19T07:30',
    event_date_ml: '2026-12-20T08:00',
    event_location: 'Kampus SMP Negeri 2 Pulung, Ponorogo',
    ml_scope: 'Pelajar SMP/MTs & SD/MI Kelas 6 Sederajat',
    ml_require_student_card: false,
    show_hasil: false,
    to_room_capacity: 25,
    hero_title: 'Ajang Prestasi Pelajar & Kompetisi Gratis di SMPN 2 Pulung',
    hero_subtitle:
      'Ikuti Try Out TKA SD untuk siswa kelas 6 SD/MI dan Turnamen Mobile Legends antar pelajar tanpa biaya pendaftaran. Daftar online, unduh kartu QR, dan pantau hasil secara transparan.',
    hero_date_label: '19–20 Desember 2026',
    hero_badge_title: '100% Gratis · Terbuka',
    hero_badge_subtitle: 'Sertifikat & Tropi Pembinaan',
    to_title: 'Try Out TKA SD Tingkat Kecamatan',
    to_description:
      'Uji kesiapan menghadapi Tes Kemampuan Akademik dengan soal terstandar (Bahasa Indonesia, Matematika, dan IPA/Pengetahuan Umum) secara tatap muka di ruang ujian SMP Negeri 2 Pulung.',
    to_format: 'Tatap Muka (Offline)',
    to_subjects: [
      'Bahasa Indonesia — 30 soal',
      'Matematika — 25 soal',
      'IPA / Pengetahuan Umum — 20 soal',
      'Total durasi pengerjaan 150 menit',
    ],
    to_requirements: [
      'Siswa aktif kelas 6 SD/MI sederajat',
      'Mengisi data NISN & persetujuan orang tua',
      'Membawa Kartu Peserta QR (cetak/HP)',
      'Membawa pensil 2B, penghapus & papan alas',
    ],
    ml_title: 'Turnamen Mobile Legends Pelajar',
    ml_description:
      'Tunjukkan strategi dan sportivitas tim sekolahmu pada mode 5v5 Custom Draft Pick dengan sistem gugur dan grand final BO3 di Aula SMP Negeri 2 Pulung.',
    ml_format: [
      'Mode Custom Draft Pick 5v5',
      'Penyisihan – Perempat Final: BO1',
      'Semifinal & Grand Final: BO3',
      'Konfirmasi ulang wajib H-1 via grup kapten',
    ],
    ml_tm_date: 'TM Online: 16 Des 2026',
    ml_rules_summary: [
      '5 pemain inti + maksimal 1 cadangan',
      '1 ID Mobile Legends hanya untuk 1 tim',
      'Dilarang joki, akun ganda, atau cheat',
      'Keterlambatan > 10 menit dikenakan WO',
    ],
    alur_steps: [
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
    ],
    service_hours: 'Senin – Sabtu, 07.30 – 15.00 WIB',
    maps_url: 'https://maps.google.com/?q=SMP+Negeri+2+Pulung+Ponorogo',
    footer_description:
      'Pusat informasi resmi dan pendaftaran gratis Try Out TKA SD serta Kompetisi Mobile Legends pelajar yang diselenggarakan oleh SMP Negeri 2 Pulung.',
    dashboard_notice:
      'Pastikan seluruh pendaftar diverifikasi kelayakan datanya (NISN kelas 6 / ID ML tidak ganda) maksimal 1×24 jam.',
    juknis_pdfs: [
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
    ],
  };
}

function seedContentIfEmpty_(ss) {
  if (ss.getSheetByName('Pengumuman').getLastRow() <= 1) {
    writeTable_(ss, 'Pengumuman', [
      {
        id: 'p-1',
        tanggal: '2026-11-10',
        judul: 'Pendaftaran Resmi Dibuka — Seluruh Kegiatan 100% Gratis',
        isi: 'SMP Negeri 2 Pulung membuka pendaftaran Try Out TKA SD dan Kompetisi Mobile Legends 2026 tanpa biaya pendaftaran. Peserta cukup mendaftar online melalui portal ini hingga 12 Desember 2026 atau sampai kuota terpenuhi.',
        kategori: 'Umum',
        pinned: true,
        published: true,
      },
      {
        id: 'p-2',
        tanggal: '2026-11-11',
        judul: 'Ketentuan Ruang & Perlengkapan Try Out TKA SD',
        isi: 'Peserta Try Out TKA SD wajib membawa Kartu Peserta (unduh di halaman Cek Status setelah diverifikasi), pensil 2B, penghapus, dan papan jalan/alas tulis. Pembagian ruang dapat dilihat langsung pada Kartu Peserta.',
        kategori: 'Try Out',
        pinned: false,
        published: true,
      },
      {
        id: 'p-3',
        tanggal: '2026-11-12',
        judul: 'Technical Meeting Online Kapten Tim Mobile Legends',
        isi: 'Technical Meeting wajib diikuti seluruh kapten tim terverifikasi pada 16 Desember 2026 pukul 15.30 WIB via Google Meet. Tautan akan dibagikan melalui grup WhatsApp kapten setelah verifikasi berkas selesai.',
        kategori: 'Mobile Legends',
        pinned: false,
        published: true,
      },
    ]);
  }

  if (ss.getSheetByName('Jadwal').getLastRow() <= 1) {
    writeTable_(ss, 'Jadwal', [
      {
        id: 'j-1',
        kegiatan: 'umum',
        tanggal_mulai: '2026-11-10',
        tanggal_selesai: '2026-12-12',
        judul: 'Pendaftaran & Verifikasi Online',
        deskripsi:
          'Pendaftaran Try Out TKA SD dan Kompetisi Mobile Legends dibuka secara online. Panitia memverifikasi kelengkapan data maksimal 1x24 jam.',
        lokasi: 'Portal Spendapul Competition',
      },
      {
        id: 'j-2',
        kegiatan: 'mobile-legends',
        tanggal_mulai: '2026-12-16',
        tanggal_selesai: '2026-12-16',
        judul: 'Technical Meeting & Undian Bracket ML',
        deskripsi:
          'Pembacaan aturan pertandingan, konfirmasi ulang daftar pemain, dan pengundian bagan pertandingan resmi.',
        lokasi: 'Online (Grup WA Kapten)',
      },
      {
        id: 'j-3',
        kegiatan: 'try-out',
        tanggal_mulai: '2026-12-19',
        tanggal_selesai: '2026-12-19',
        judul: 'Hari-H Try Out TKA SD (Tatap Muka)',
        deskripsi:
          '07.00 Check-in QR Code · 07.30 Pembukaan · 08.00–10.30 Pengerjaan Soal TKA SD · 11.00 Pembagian Konsumsi & Pembahasan Singkat.',
        lokasi: 'Ruang Kelas SMP Negeri 2 Pulung',
      },
      {
        id: 'j-4',
        kegiatan: 'mobile-legends',
        tanggal_mulai: '2026-12-20',
        tanggal_selesai: '2026-12-20',
        judul: 'Hari-H Turnamen Mobile Legends & Penyerahan Hadiah',
        deskripsi:
          '07.30 Check-in Tim · 08.30 Babak Penyisihan (BO1) · 13.00 Semifinal & Grand Final (BO3) · 16.00 Penyerahan Tropi & Sertifikat.',
        lokasi: 'Aula Utama SMP Negeri 2 Pulung',
      },
    ]);
  }

  if (ss.getSheetByName('FAQ').getLastRow() <= 1) {
    writeTable_(ss, 'FAQ', [
      {
        id: 'f-1',
        kategori: 'Umum',
        pertanyaan: 'Apakah pendaftaran Spendapul Competition benar-benar gratis?',
        jawaban:
          'Ya, seluruh kegiatan Try Out TKA SD maupun Kompetisi Mobile Legends 100% gratis tanpa biaya pendaftaran maupun biaya tambahan di lokasi.',
        urutan: 1,
      },
      {
        id: 'f-2',
        kategori: 'Umum',
        pertanyaan: 'Apakah peserta harus membuat akun login untuk mendaftar?',
        jawaban:
          'Tidak perlu. Peserta cukup mengisi formulir pendaftaran dan menyimpan Kode Registrasi. Untuk mengecek status atau mengunduh Kartu Peserta, gunakan Kode Registrasi dan nomor WhatsApp pada halaman Cek Status.',
        urutan: 2,
      },
      {
        id: 'f-3',
        kategori: 'Try Out',
        pertanyaan: 'Apa saja yang perlu dibawa saat Try Out TKA SD?',
        jawaban:
          'Kartu Peserta (dapat dicetak atau ditunjukkan di HP orang tua saat check-in QR), pensil 2B, penghapus, papan jalan, dan air minum pribadi.',
        urutan: 3,
      },
      {
        id: 'f-4',
        kategori: 'Try Out',
        pertanyaan: 'Apakah orang tua/pendamping boleh menunggu di sekolah?',
        jawaban:
          'Boleh. Panitia menyediakan area tunggu yang nyaman di halaman SMP Negeri 2 Pulung selama pelaksanaan Try Out berlangsung.',
        urutan: 4,
      },
      {
        id: 'f-5',
        kategori: 'Mobile Legends',
        pertanyaan: 'Apakah satu pemain boleh bermain di dua tim berbeda?',
        jawaban:
          'Tidak boleh. Sistem akan menolak otomatis ID ML yang sudah terdaftar di tim lain. Pelanggaran joki atau akun ganda berakibat diskualifikasi.',
        urutan: 5,
      },
      {
        id: 'f-6',
        kategori: 'Mobile Legends',
        pertanyaan: 'Bagaimana jika jaringan internet di sekolah kurang stabil?',
        jawaban:
          'Panitia menyediakan Wi-Fi khusus area pertandingan, namun pemain tetap disarankan menyiapkan paket data pribadi sebagai cadangan.',
        urutan: 6,
      },
    ]);
  }

  if (ss.getSheetByName('Hadiah').getLastRow() <= 1) {
    writeTable_(ss, 'Hadiah', [
      { id: 'h-1', kegiatan: 'try-out', peringkat: 'Juara 1', hadiah: 'Tropi + Piagam Penghargaan + Uang Pembinaan Rp500.000 + Voucher Beasiswa SPMB' },
      { id: 'h-2', kegiatan: 'try-out', peringkat: 'Juara 2', hadiah: 'Tropi + Piagam Penghargaan + Uang Pembinaan Rp350.000' },
      { id: 'h-3', kegiatan: 'try-out', peringkat: 'Juara 3', hadiah: 'Tropi + Piagam Penghargaan + Uang Pembinaan Rp250.000' },
      { id: 'h-4', kegiatan: 'try-out', peringkat: 'Seluruh Peserta', hadiah: 'Sertifikat Peserta, Lembar Pembahasan Soal & Snack Ringan' },
      { id: 'h-5', kegiatan: 'mobile-legends', peringkat: 'Juara 1', hadiah: 'Tropi Bergilir + Piagam + Uang Pembinaan Rp750.000 + Diamond Bonus' },
      { id: 'h-6', kegiatan: 'mobile-legends', peringkat: 'Juara 2', hadiah: 'Tropi + Piagam + Uang Pembinaan Rp500.000' },
      { id: 'h-7', kegiatan: 'mobile-legends', peringkat: 'Juara 3 & MVP', hadiah: 'Tropi + Piagam + Uang Pembinaan Rp300.000 & Penghargaan MVP Final' },
    ]);
  }

  if (ss.getSheetByName('Sponsor').getLastRow() <= 1) {
    writeTable_(ss, 'Sponsor', [
      { id: 's-1', nama: 'SMP Negeri 2 Pulung', logo_url: '', link: '#kontak', tier: 'Utama' },
      { id: 's-2', nama: 'OSIS Spendapul', logo_url: '', link: '#kontak', tier: 'Pendukung' },
      { id: 's-3', nama: 'Komite Sekolah Pulung', logo_url: '', link: '#kontak', tier: 'Pendukung' },
      { id: 's-4', nama: 'Info Ponorogo Pelajar', logo_url: '', link: '#kontak', tier: 'Media Partner' },
    ]);
  }

  if (ss.getSheetByName('Galeri').getLastRow() <= 1) {
    writeTable_(ss, 'Galeri', [
      {
        id: 'g-1',
        judul: 'Lingkungan Kampus SMP Negeri 2 Pulung',
        kegiatan: 'umum',
        tanggal: '2026-10-15',
        image_key: 'campus',
        deskripsi: 'Halaman utama dan ruang kelas SMP Negeri 2 Pulung yang siap menyambut peserta Try Out dan kompetisi.',
      },
      {
        id: 'g-2',
        judul: 'Pelaksanaan Try Out Akademik Kelas 6',
        kegiatan: 'try-out',
        tanggal: '2025-12-14',
        image_key: 'tryout',
        deskripsi: 'Suasana tertib dan fokus siswa kelas 6 SD/MI saat mengerjakan soal Try Out TKA di ruang ujian.',
      },
      {
        id: 'g-3',
        judul: 'Pertandingan Tim Esport Pelajar',
        kegiatan: 'mobile-legends',
        tanggal: '2025-12-15',
        image_key: 'esports',
        deskripsi: 'Kekompakan tim pelajar dalam babak penyisihan turnamen Mobile Legends di aula sekolah.',
      },
    ]);
  }
}

// ============================================================================
// 2. ENTRY POINT WEB APP (doGet / doPost)
// ============================================================================

function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    verifyProxyKey_(params.proxy_key);

    var action = String(params.action || 'config_public').trim();
    var token = String(params.token || '').trim();

    if (action === 'config_public') return okJson_(handleConfigPublic_());
    if (action === 'content') return okJson_(handleContent_());
    if (action === 'peserta_public') return okJson_(handlePesertaPublic_());
    if (action === 'bracket') return okJson_(handleBracket_());
    if (action === 'hasil') return okJson_(handleHasil_());
    if (action === 'juknis_pdf') return okJson_(handleServeJuknisPdf_(params));

    if (action === 'me') {
      var session = requireAuth_(token, ['DASHBOARD', 'ADMIN']);
      return okJson_({ username: session.username, role: session.role, nama: session.nama });
    }
    if (action === 'stats') {
      requireAuth_(token, ['DASHBOARD', 'ADMIN']);
      return okJson_(handleStats_());
    }
    if (action === 'list_to') {
      requireAuth_(token, ['DASHBOARD', 'ADMIN']);
      return okJson_(readTable_(getSpreadsheet_(), 'Peserta_TO'));
    }
    if (action === 'list_ml') {
      requireAuth_(token, ['DASHBOARD', 'ADMIN']);
      return okJson_(handleListMl_());
    }
    if (action === 'list_hasil_to') {
      requireAuth_(token, ['DASHBOARD', 'ADMIN']);
      return okJson_(readTable_(getSpreadsheet_(), 'Hasil_TO'));
    }

    // Admin-only GET
    if (action === 'user_list') {
      requireAuth_(token, ['ADMIN']);
      return okJson_(handleUserList_());
    }
    if (action === 'log_list') {
      requireAuth_(token, ['ADMIN']);
      return okJson_(readTable_(getSpreadsheet_(), 'Log').slice(0, 200));
    }
    if (action === 'export') {
      requireAuth_(token, ['ADMIN']);
      return okJson_(handleExportCsv_(String(params.type || 'peserta-to')));
    }
    if (action === 'backup') {
      requireAuth_(token, ['ADMIN']);
      return okJson_(handleBackupJson_());
    }

    return failJson_('UNKNOWN_ACTION', 'Action GET tidak dikenal: ' + action);
  } catch (err) {
    return handleError_(err);
  }
}

function doPost(e) {
  try {
    var body = parseBody_(e);
    var params = (e && e.parameter) || {};
    verifyProxyKey_(body.proxy_key || params.proxy_key);

    var action = String(body.action || params.action || '').trim();
    var token = String(body.token || params.token || '').trim();

    if (action === 'register_to') return okJson_(handleRegisterTo_(body));
    if (action === 'register_ml') return okJson_(handleRegisterMl_(body));
    if (action === 'cek_status') return okJson_(handleCekStatus_(body));
    if (action === 'login') return okJson_(handleLogin_(body));

    if (action === 'logout') {
      var sLogout = requireAuth_(token, ['DASHBOARD', 'ADMIN']);
      return okJson_(handleLogout_(token, sLogout));
    }
    if (action === 'verify') {
      var sVer = requireAuth_(token, ['DASHBOARD', 'ADMIN']);
      return okJson_(handleVerify_(body, sVer));
    }
    if (action === 'reject') {
      var sRej = requireAuth_(token, ['DASHBOARD', 'ADMIN']);
      return okJson_(handleReject_(body, sRej));
    }
    if (action === 'checkin') {
      var sChk = requireAuth_(token, ['DASHBOARD', 'ADMIN']);
      return okJson_(handleCheckin_(body, sChk));
    }
    if (action === 'input_skor') {
      var sSkor = requireAuth_(token, ['DASHBOARD', 'ADMIN']);
      return okJson_(handleInputSkor_(body, sSkor));
    }
    if (action === 'update_match') {
      var sMatch = requireAuth_(token, ['DASHBOARD', 'ADMIN']);
      return okJson_(handleUpdateMatch_(body, sMatch));
    }

    // Admin-only POST
    if (action === 'config_update') {
      var sCfg = requireAuth_(token, ['ADMIN']);
      return okJson_(handleConfigUpdate_(body, sCfg));
    }
    if (action === 'upload_juknis_pdf') {
      var sUpPdf = requireAuth_(token, ['ADMIN']);
      return okJson_(handleUploadJuknisPdf_(body, sUpPdf));
    }
    if (action === 'upsert_juknis_slot') {
      var sSlot = requireAuth_(token, ['ADMIN']);
      return okJson_(handleUpsertJuknisSlot_(body, sSlot));
    }
    if (action === 'delete_juknis_pdf') {
      var sDelPdf = requireAuth_(token, ['ADMIN']);
      return okJson_(handleDeleteJuknisPdf_(body, sDelPdf));
    }
    if (action === 'content_upsert') {
      var sCUp = requireAuth_(token, ['ADMIN']);
      return okJson_(handleContentUpsert_(body, sCUp));
    }
    if (action === 'content_delete') {
      var sCDel = requireAuth_(token, ['ADMIN']);
      return okJson_(handleContentDelete_(body, sCDel));
    }
    if (action === 'user_create') {
      var sUC = requireAuth_(token, ['ADMIN']);
      return okJson_(handleUserCreate_(body, sUC));
    }
    if (action === 'user_update') {
      var sUU = requireAuth_(token, ['ADMIN']);
      return okJson_(handleUserUpdate_(body, sUU));
    }
    if (action === 'delete_registrasi') {
      var sDR = requireAuth_(token, ['ADMIN']);
      return okJson_(handleDeleteRegistrasi_(body, sDR));
    }

    return failJson_('UNKNOWN_ACTION', 'Action POST tidak dikenal: ' + action);
  } catch (err) {
    return handleError_(err);
  }
}

// ============================================================================
// 3. HANDLER PUBLIK (CACHE-FRIENDLY)
// ============================================================================

function handleConfigPublic_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('config_public');
  if (cached) return JSON.parse(cached);

  var ss = getSpreadsheet_();
  var config = readConfig_(ss);
  var pesertaTo = readTable_(ss, 'Peserta_TO');
  var timMl = readTable_(ss, 'Tim_ML');

  var activeTo = pesertaTo.filter(function (p) { return p.status !== 'REJECTED'; }).length;
  var verifiedTo = pesertaTo.filter(function (p) { return p.status === 'VERIFIED'; }).length;
  var activeMl = timMl.filter(function (t) { return t.status !== 'REJECTED'; }).length;
  var verifiedMl = timMl.filter(function (t) { return t.status === 'VERIFIED'; }).length;

  var payload = cloneObj_(config);
  payload.count_to_active = activeTo;
  payload.count_to_verified = verifiedTo;
  payload.count_ml_active = activeMl;
  payload.count_ml_verified = verifiedMl;
  payload.remaining_to = Math.max(0, Number(config.quota_to || 0) - activeTo);
  payload.remaining_ml = Math.max(0, Number(config.quota_ml || 0) - activeMl);

  cache.put('config_public', JSON.stringify(payload), CACHE_TTL_SEC);
  return payload;
}

function handleContent_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('public_content');
  if (cached) return JSON.parse(cached);

  var ss = getSpreadsheet_();
  var pengumuman = readTable_(ss, 'Pengumuman')
    .filter(function (p) { return toBool_(p.published); })
    .sort(function (a, b) {
      var pa = toBool_(a.pinned);
      var pb = toBool_(b.pinned);
      if (pa !== pb) return pa ? -1 : 1;
      return String(b.tanggal).localeCompare(String(a.tanggal));
    });

  var payload = {
    pengumuman: pengumuman,
    jadwal: readTable_(ss, 'Jadwal'),
    juknis: readTable_(ss, 'Juknis').sort(function (a, b) { return Number(a.urutan) - Number(b.urutan); }),
    faq: readTable_(ss, 'FAQ').sort(function (a, b) { return Number(a.urutan) - Number(b.urutan); }),
    hadiah: readTable_(ss, 'Hadiah'),
    sponsor: readTable_(ss, 'Sponsor'),
    galeri: readTable_(ss, 'Galeri'),
  };

  cache.put('public_content', JSON.stringify(payload), 180);
  return payload;
}

function handlePesertaPublic_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('peserta_public');
  if (cached) return JSON.parse(cached);

  var ss = getSpreadsheet_();
  var to = readTable_(ss, 'Peserta_TO')
    .filter(function (p) { return p.status === 'VERIFIED'; })
    .map(function (p) {
      return {
        reg_code: p.reg_code,
        nama_samaran: maskName_(p.nama_lengkap),
        asal_sd: p.asal_sd,
        no_peserta: p.no_peserta,
        ruang: p.ruang,
      };
    });

  var anggotaAll = readTable_(ss, 'Anggota_ML');
  var ml = readTable_(ss, 'Tim_ML')
    .filter(function (t) { return t.status === 'VERIFIED'; })
    .map(function (t) {
      var count = anggotaAll.filter(function (a) { return a.reg_code === t.reg_code; }).length;
      return {
        reg_code: t.reg_code,
        nama_tim: t.nama_tim,
        asal_sekolah: t.asal_sekolah,
        seed: t.seed || 'Terdaftar',
        jumlah_pemain: count,
      };
    });

  var payload = { to: to, ml: ml };
  cache.put('peserta_public', JSON.stringify(payload), 120);
  return payload;
}

function handleBracket_() {
  var ss = getSpreadsheet_();
  return readTable_(ss, 'Match_ML');
}

function handleHasil_() {
  var ss = getSpreadsheet_();
  var config = readConfig_(ss);
  if (!toBool_(config.show_hasil)) {
    return { published: false, hasil_to: [], juara_ml: [] };
  }
  var hasilTo = readTable_(ss, 'Hasil_TO').sort(function (a, b) {
    return Number(a.ranking) - Number(b.ranking);
  });
  var matches = readTable_(ss, 'Match_ML');
  var finalMatch = null;
  for (var i = 0; i < matches.length; i++) {
    if (String(matches[i].babak).toLowerCase().indexOf('final') >= 0 && matches[i].status === 'Selesai') {
      finalMatch = matches[i];
      break;
    }
  }
  var juaraMl = finalMatch
    ? [
        { peringkat: 'Juara 1', nama_tim: finalMatch.pemenang },
        {
          peringkat: 'Juara 2',
          nama_tim: finalMatch.pemenang === finalMatch.tim_a ? finalMatch.tim_b : finalMatch.tim_a,
        },
      ]
    : [];
  return { published: true, hasil_to: hasilTo, juara_ml: juaraMl };
}

function handleServeJuknisPdf_(params) {
  var rawName = String(params.file || params.id || '').trim();
  var fileId = rawName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!fileId) throw new Error('INVALID_FILE:Nama file PDF tidak valid.');

  var ss = getSpreadsheet_();
  var config = readConfig_(ss);
  var pdfs = config.juknis_pdfs || [];
  var matched = null;
  for (var i = 0; i < pdfs.length; i++) {
    if (String(pdfs[i].file_url || '').indexOf(fileId) >= 0) {
      matched = pdfs[i];
      break;
    }
  }
  if (!matched) throw new Error('NOT_FOUND:File Juknis PDF tidak ditemukan.');

  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();
  var size = blob.getBytes().length;
  var fileName = matched.file_name || file.getName() || 'juknis.pdf';

  // Jika > 3.2 MB, arahkan proxy ke unduhan langsung Drive agar aman dari batas 4.5 MB Vercel
  if (size > 3200000) {
    return {
      file_name: fileName,
      redirect_url: 'https://drive.google.com/uc?export=download&id=' + fileId,
    };
  }

  return {
    file_name: fileName,
    mime_type: 'application/pdf',
    base64: Utilities.base64Encode(blob.getBytes()),
  };
}

// ============================================================================
// 4. PENDAFTARAN & CEK STATUS (DENGAN LOCKSERVICE)
// ============================================================================

function handleRegisterTo_(body) {
  if (body.website_hp) throw new Error('BOT_DETECTED:Permintaan ditolak oleh sistem anti-spam.');

  var nama_lengkap = sanitizeCell_(body.nama_lengkap);
  var asal_sd = sanitizeCell_(body.asal_sd);
  var kelas = sanitizeCell_(body.kelas || '6');
  var nisn = sanitizeCell_(body.nisn).replace(/\D/g, '');
  var nama_ortu = sanitizeCell_(body.nama_ortu);
  var wa_ortu = normalizeWa_(body.wa_ortu);
  var jenis_kelamin = body.jenis_kelamin === 'P' ? 'P' : 'L';
  var tempat_lahir = sanitizeCell_(body.tempat_lahir);
  var tgl_lahir = sanitizeCell_(body.tgl_lahir);
  var email = sanitizeCell_(body.email);
  var alamat = sanitizeCell_(body.alamat);
  var persetujuan = toBool_(body.persetujuan);
  var idempotency_key = String(body.idempotency_key || '').trim();

  if (!nama_lengkap || !asal_sd || !nisn || !nama_ortu || wa_ortu.length < 10 || !persetujuan) {
    throw new Error('VALIDATION_ERROR:Mohon lengkapi seluruh kolom wajib dan centang persetujuan orang tua/wali.');
  }

  return withLock_(function () {
    var ss = getSpreadsheet_();
    var config = readConfig_(ss);
    var pesertaList = readTable_(ss, 'Peserta_TO');

    if (idempotency_key) {
      var idemRows = readTable_(ss, 'Idempotency');
      for (var i = 0; i < idemRows.length; i++) {
        if (idemRows[i].key === idempotency_key) {
          for (var j = 0; j < pesertaList.length; j++) {
            if (pesertaList[j].reg_code === idemRows[i].reg_code) return pesertaList[j];
          }
        }
      }
    }

    if (!toBool_(config.reg_to_open)) {
      throw new Error('CLOSED:Pendaftaran Try Out TKA SD saat ini sedang ditutup.');
    }
    if (config.reg_to_deadline && new Date() > new Date(config.reg_to_deadline)) {
      throw new Error('DEADLINE:Batas waktu pendaftaran Try Out telah berakhir.');
    }

    var activeCount = pesertaList.filter(function (p) { return p.status !== 'REJECTED'; }).length;
    if (activeCount >= Number(config.quota_to || 0)) {
      throw new Error('QUOTA_FULL:Kuota peserta Try Out TKA SD sudah penuh.');
    }

    for (var k = 0; k < pesertaList.length; k++) {
      if (String(pesertaList[k].nisn) === nisn && pesertaList[k].status !== 'REJECTED') {
        throw new Error('DUPLICATE_NISN:NISN ' + nisn + ' sudah terdaftar dengan kode ' + pesertaList[k].reg_code + '.');
      }
    }

    var nextNum = incrementCounter_(ss, 'to');
    var reg_code = 'TO-' + padZero_(nextNum, 4);

    var entry = {
      reg_code: reg_code,
      timestamp: new Date().toISOString(),
      nama_lengkap: nama_lengkap,
      jenis_kelamin: jenis_kelamin,
      asal_sd: asal_sd,
      kelas: kelas,
      nisn: nisn,
      tempat_lahir: tempat_lahir,
      tgl_lahir: tgl_lahir,
      nama_ortu: nama_ortu,
      wa_ortu: wa_ortu,
      email: email,
      alamat: alamat,
      persetujuan: true,
      status: 'PENDING',
      catatan: '',
      no_peserta: '',
      ruang: '',
      checkin_at: '',
      verified_by: '',
      verified_at: '',
    };

    pesertaList.unshift(entry);
    writeTable_(ss, 'Peserta_TO', pesertaList);

    if (idempotency_key) {
      appendRow_(ss, 'Idempotency', { key: idempotency_key, reg_code: reg_code, ts: Date.now() });
    }
    addAuditLog_(ss, 'publik', 'REGISTER_TO', reg_code, nama_lengkap + ' (' + asal_sd + ')');
    invalidatePublicCache_();
    return entry;
  });
}

function handleRegisterMl_(body) {
  if (body.website_hp) throw new Error('BOT_DETECTED:Permintaan ditolak oleh sistem anti-spam.');

  var nama_tim = sanitizeCell_(body.nama_tim);
  var asal_sekolah = sanitizeCell_(body.asal_sekolah);
  var nama_kapten = sanitizeCell_(body.nama_kapten);
  var wa_kapten = normalizeWa_(body.wa_kapten);
  var email = sanitizeCell_(body.email);
  var rawLogo = typeof body.logo_url === 'string' ? body.logo_url : '';
  var persetujuan = toBool_(body.persetujuan);
  var idempotency_key = String(body.idempotency_key || '').trim();
  var rawMembers = Array.isArray(body.anggota) ? body.anggota : [];

  if (!nama_tim || !asal_sekolah || !nama_kapten || wa_kapten.length < 10 || !persetujuan) {
    throw new Error('VALIDATION_ERROR:Lengkapi identitas tim, kontak WhatsApp kapten, dan persetujuan.');
  }

  var cleanedMembers = [];
  for (var i = 0; i < rawMembers.length && cleanedMembers.length < 6; i++) {
    var m = rawMembers[i] || {};
    if (m.nama_lengkap && m.id_ml && m.server_id) {
      cleanedMembers.push({
        member_id: 'M-' + Date.now() + '-' + i,
        reg_code: '',
        peran: m.peran === 'Cadangan' ? 'Cadangan' : 'Utama',
        nama_lengkap: sanitizeCell_(m.nama_lengkap),
        nickname_ingame: sanitizeCell_(m.nickname_ingame || m.nama_lengkap),
        id_ml: sanitizeCell_(m.id_ml).replace(/\D/g, ''),
        server_id: sanitizeCell_(m.server_id).replace(/\D/g, ''),
        kelas: sanitizeCell_(m.kelas || '-'),
        kartu_pelajar_url: typeof m.kartu_pelajar_url === 'string' ? m.kartu_pelajar_url : '',
      });
    }
  }

  var utamaCount = cleanedMembers.filter(function (x) { return x.peran === 'Utama'; }).length;
  if (utamaCount < 5) {
    throw new Error('VALIDATION_ERROR:Data 5 pemain utama (nama, ID ML, Server ID) belum lengkap.');
  }

  var idSeen = {};
  for (var j = 0; j < cleanedMembers.length; j++) {
    if (idSeen[cleanedMembers[j].id_ml]) {
      throw new Error('DUPLICATE_ID_LOCAL:Terdapat ID Mobile Legends yang sama dalam satu tim.');
    }
    idSeen[cleanedMembers[j].id_ml] = true;
  }

  return withLock_(function () {
    var ss = getSpreadsheet_();
    var config = readConfig_(ss);
    var teams = readTable_(ss, 'Tim_ML');
    var allMembers = readTable_(ss, 'Anggota_ML');

    if (idempotency_key) {
      var idemRows = readTable_(ss, 'Idempotency');
      for (var x = 0; x < idemRows.length; x++) {
        if (idemRows[x].key === idempotency_key) {
          for (var y = 0; y < teams.length; y++) {
            if (teams[y].reg_code === idemRows[x].reg_code) {
              var existingTeam = cloneObj_(teams[y]);
              existingTeam.anggota = allMembers.filter(function (a) { return a.reg_code === existingTeam.reg_code; });
              return existingTeam;
            }
          }
        }
      }
    }

    if (!toBool_(config.reg_ml_open)) {
      throw new Error('CLOSED:Pendaftaran Mobile Legends saat ini sedang ditutup.');
    }
    if (config.reg_ml_deadline && new Date() > new Date(config.reg_ml_deadline)) {
      throw new Error('DEADLINE:Batas waktu pendaftaran Mobile Legends telah berakhir.');
    }

    var activeTeams = teams.filter(function (t) { return t.status !== 'REJECTED'; });
    if (activeTeams.length >= Number(config.quota_ml || 0)) {
      throw new Error('QUOTA_FULL:Kuota tim Mobile Legends sudah penuh.');
    }

    var activeCodes = {};
    for (var k = 0; k < activeTeams.length; k++) {
      if (String(activeTeams[k].nama_tim).toLowerCase() === nama_tim.toLowerCase()) {
        throw new Error('DUPLICATE_TEAM:Nama tim "' + nama_tim + '" sudah terdaftar.');
      }
      activeCodes[activeTeams[k].reg_code] = true;
    }

    for (var mIdx = 0; mIdx < cleanedMembers.length; mIdx++) {
      var idMl = cleanedMembers[mIdx].id_ml;
      for (var exIdx = 0; exIdx < allMembers.length; exIdx++) {
        if (activeCodes[allMembers[exIdx].reg_code] && String(allMembers[exIdx].id_ml) === idMl) {
          throw new Error('DUPLICATE_ID_ML:ID ML ' + idMl + ' sudah terdaftar di tim ' + allMembers[exIdx].reg_code + '.');
        }
      }
    }

    var nextNum = incrementCounter_(ss, 'ml');
    var reg_code = 'ML-' + padZero_(nextNum, 3);

    // Simpan Logo Tim & Kartu Pelajar ke Google Drive jika berupa Data URL base64
    var driveFolders = ensureDriveFolders_();
    var savedLogoUrl = '';
    if (rawLogo && rawLogo.indexOf('data:image/') === 0) {
      savedLogoUrl = saveDataUrlToDrive_(
        rawLogo,
        driveFolders.mlLogoFolder.getId(),
        reg_code + '_logo_' + Date.now(),
        true
      );
    }

    var membersWithCode = cleanedMembers.map(function (mem, idx) {
      var savedCardUrl = '';
      if (mem.kartu_pelajar_url && mem.kartu_pelajar_url.indexOf('data:image/') === 0) {
        savedCardUrl = saveDataUrlToDrive_(
          mem.kartu_pelajar_url,
          driveFolders.mlKartuFolder.getId(),
          reg_code + '_kartu_p' + (idx + 1) + '_' + Date.now(),
          false // Privat!
        );
      }
      return {
        member_id: mem.member_id,
        reg_code: reg_code,
        peran: mem.peran,
        nama_lengkap: mem.nama_lengkap,
        nickname_ingame: mem.nickname_ingame,
        id_ml: mem.id_ml,
        server_id: mem.server_id,
        kelas: mem.kelas,
        kartu_pelajar_url: savedCardUrl,
      };
    });

    var teamEntry = {
      reg_code: reg_code,
      timestamp: new Date().toISOString(),
      nama_tim: nama_tim,
      asal_sekolah: asal_sekolah,
      nama_kapten: nama_kapten,
      wa_kapten: wa_kapten,
      email: email,
      logo_url: savedLogoUrl,
      persetujuan: true,
      status: 'PENDING',
      catatan: '',
      seed: '',
      checkin_at: '',
      verified_by: '',
      verified_at: '',
    };

    teams.unshift(teamEntry);
    writeTable_(ss, 'Tim_ML', teams);

    for (var z = 0; z < membersWithCode.length; z++) {
      allMembers.push(membersWithCode[z]);
    }
    writeTable_(ss, 'Anggota_ML', allMembers);

    if (idempotency_key) {
      appendRow_(ss, 'Idempotency', { key: idempotency_key, reg_code: reg_code, ts: Date.now() });
    }
    addAuditLog_(ss, 'publik', 'REGISTER_ML', reg_code, nama_tim + ' (' + asal_sekolah + ')');
    invalidatePublicCache_();

    var result = cloneObj_(teamEntry);
    result.anggota = membersWithCode;
    return result;
  });
}

function handleCekStatus_(body) {
  var reg_code = String(body.reg_code || '').trim().toUpperCase();
  var wa = normalizeWa_(body.wa || '');
  if (!reg_code || wa.length < 8) {
    throw new Error('VALIDATION_ERROR:Masukkan Kode Registrasi dan Nomor WhatsApp yang digunakan saat mendaftar.');
  }

  var ss = getSpreadsheet_();
  if (reg_code.indexOf('TO-') === 0) {
    var pesertaList = readTable_(ss, 'Peserta_TO');
    for (var i = 0; i < pesertaList.length; i++) {
      if (pesertaList[i].reg_code === reg_code && normalizeWa_(pesertaList[i].wa_ortu) === wa) {
        return { jenis: 'try-out', peserta: normalizePesertaObj_(pesertaList[i]) };
      }
    }
    throw new Error('NOT_FOUND:Data tidak ditemukan. Periksa kembali Kode Registrasi dan nomor WhatsApp.');
  }

  if (reg_code.indexOf('ML-') === 0) {
    var teams = readTable_(ss, 'Tim_ML');
    var anggota = readTable_(ss, 'Anggota_ML');
    for (var j = 0; j < teams.length; j++) {
      if (teams[j].reg_code === reg_code && normalizeWa_(teams[j].wa_kapten) === wa) {
        var tim = normalizeTimObj_(teams[j]);
        tim.anggota = anggota.filter(function (a) { return a.reg_code === tim.reg_code; });
        return { jenis: 'mobile-legends', tim: tim };
      }
    }
    throw new Error('NOT_FOUND:Data tim tidak ditemukan. Periksa kembali Kode Registrasi dan nomor WhatsApp kapten.');
  }

  throw new Error('INVALID_CODE:Format Kode Registrasi harus diawali TO- atau ML-.');
}

// ============================================================================
// 5. AUTENTIKASI & SESI
// ============================================================================

function handleLogin_(body) {
  var username = String(body.username || '').trim();
  var password = String(body.password || '');
  if (!username || !password) {
    throw new Error('VALIDATION_ERROR:Username dan password wajib diisi.');
  }

  return withLock_(function () {
    var ss = getSpreadsheet_();
    var users = readTable_(ss, 'Users');
    var userIdx = -1;
    for (var i = 0; i < users.length; i++) {
      if (users[i].username === username) {
        userIdx = i;
        break;
      }
    }
    if (userIdx < 0 || !toBool_(users[userIdx].aktif)) {
      throw new Error('INVALID_CREDENTIALS:Username atau password salah.');
    }

    var user = users[userIdx];
    var now = Date.now();
    var lockedUntil = Number(user.locked_until || 0);
    if (lockedUntil > now) {
      var secs = Math.ceil((lockedUntil - now) / 1000);
      throw new Error('LOCKED:Akun terkunci sementara setelah 5x gagal. Coba lagi dalam ' + secs + ' detik.');
    }

    var computed = sha256_(String(user.salt) + ':' + password);
    if (computed !== user.password_hash) {
      user.failed_attempts = Number(user.failed_attempts || 0) + 1;
      if (user.failed_attempts >= 5) {
        user.locked_until = now + 60000;
        user.failed_attempts = 0;
      }
      users[userIdx] = user;
      writeTable_(ss, 'Users', users);
      throw new Error('INVALID_CREDENTIALS:Username atau password salah.');
    }

    user.failed_attempts = 0;
    user.locked_until = '';
    user.last_login = new Date().toISOString();
    users[userIdx] = user;
    writeTable_(ss, 'Users', users);

    var rawToken = randomHex_(32);
    var sessions = readTable_(ss, 'Sessions').filter(function (s) {
      return Number(s.expires_at) > now;
    });
    sessions.push({
      token_hash: sha256_(rawToken),
      username: user.username,
      role: user.role,
      nama: user.nama,
      expires_at: now + SESSION_TTL_MS,
    });
    writeTable_(ss, 'Sessions', sessions);

    addAuditLog_(ss, user.username, 'LOGIN', user.role, 'Masuk ke panel internal');
    return {
      token: rawToken,
      user: {
        username: user.username,
        role: user.role,
        nama: user.nama,
      },
    };
  });
}

function handleLogout_(token, session) {
  return withLock_(function () {
    var ss = getSpreadsheet_();
    var tokenHash = sha256_(token);
    var sessions = readTable_(ss, 'Sessions').filter(function (s) {
      return s.token_hash !== tokenHash;
    });
    writeTable_(ss, 'Sessions', sessions);
    addAuditLog_(ss, session.username, 'LOGOUT', 'SESSION', 'Keluar dari panel internal');
    return { logged_out: true };
  });
}

function requireAuth_(token, allowedRoles) {
  if (!token) throw new Error('UNAUTHORIZED:Silakan login terlebih dahulu.');
  var ss = getSpreadsheet_();
  var tokenHash = sha256_(token);
  var now = Date.now();
  var sessions = readTable_(ss, 'Sessions');
  var session = null;
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].token_hash === tokenHash && Number(sessions[i].expires_at) > now) {
      session = sessions[i];
      break;
    }
  }
  if (!session) throw new Error('SESSION_EXPIRED:Sesi login telah berakhir. Silakan login kembali.');

  var users = readTable_(ss, 'Users');
  var account = null;
  for (var j = 0; j < users.length; j++) {
    if (users[j].username === session.username && toBool_(users[j].aktif)) {
      account = users[j];
      break;
    }
  }
  if (!account) throw new Error('ACCOUNT_DISABLED:Akun telah dinonaktifkan.');
  if (allowedRoles.indexOf(account.role) < 0) {
    throw new Error('FORBIDDEN:Anda tidak memiliki izin untuk mengakses fitur Admin ini.');
  }
  return {
    username: account.username,
    role: account.role,
    nama: account.nama,
  };
}

// ============================================================================
// 6. HANDLER INTERNAL & VERIFIKASI
// ============================================================================

function handleStats_() {
  var ss = getSpreadsheet_();
  var config = readConfig_(ss);
  var peserta = readTable_(ss, 'Peserta_TO');
  var teams = readTable_(ss, 'Tim_ML');
  var dailyMap = {};

  peserta.forEach(function (p) {
    var d = String(p.timestamp).slice(0, 10);
    if (!dailyMap[d]) dailyMap[d] = { date: d, to: 0, ml: 0 };
    dailyMap[d].to += 1;
  });
  teams.forEach(function (t) {
    var d = String(t.timestamp).slice(0, 10);
    if (!dailyMap[d]) dailyMap[d] = { date: d, to: 0, ml: 0 };
    dailyMap[d].ml += 1;
  });

  var dates = Object.keys(dailyMap).sort().slice(-10);
  var daily_series = dates.map(function (d) { return dailyMap[d]; });

  return {
    total_to: peserta.length,
    pending_to: peserta.filter(function (p) { return p.status === 'PENDING'; }).length,
    verified_to: peserta.filter(function (p) { return p.status === 'VERIFIED'; }).length,
    rejected_to: peserta.filter(function (p) { return p.status === 'REJECTED'; }).length,
    checkin_to: peserta.filter(function (p) { return Boolean(p.checkin_at); }).length,
    quota_to: Number(config.quota_to || 0),
    total_ml: teams.length,
    pending_ml: teams.filter(function (t) { return t.status === 'PENDING'; }).length,
    verified_ml: teams.filter(function (t) { return t.status === 'VERIFIED'; }).length,
    rejected_ml: teams.filter(function (t) { return t.status === 'REJECTED'; }).length,
    checkin_ml: teams.filter(function (t) { return Boolean(t.checkin_at); }).length,
    quota_ml: Number(config.quota_ml || 0),
    daily_series: daily_series,
  };
}

function handleListMl_() {
  var ss = getSpreadsheet_();
  var teams = readTable_(ss, 'Tim_ML');
  var anggota = readTable_(ss, 'Anggota_ML');
  return teams.map(function (t) {
    var obj = normalizeTimObj_(t);
    obj.anggota = anggota.filter(function (a) { return a.reg_code === t.reg_code; });
    return obj;
  });
}

function handleVerify_(body, session) {
  var reg_code = String(body.reg_code || '').trim().toUpperCase();
  var catatan = sanitizeCell_(body.catatan || 'Data telah diverifikasi panitia.');
  var customNoPeserta = sanitizeCell_(body.no_peserta || '');
  var customRuang = sanitizeCell_(body.ruang || '');
  var customSeed = sanitizeCell_(body.seed || '');

  return withLock_(function () {
    var ss = getSpreadsheet_();
    var config = readConfig_(ss);

    if (reg_code.indexOf('TO-') === 0) {
      var peserta = readTable_(ss, 'Peserta_TO');
      var idx = findIndexByField_(peserta, 'reg_code', reg_code);
      if (idx < 0) throw new Error('NOT_FOUND:Peserta tidak ditemukan.');

      var p = peserta[idx];
      p.status = 'VERIFIED';
      p.catatan = catatan;
      p.verified_by = session.username;
      p.verified_at = new Date().toISOString();

      if (!p.no_peserta) {
        var verifiedCount = peserta.filter(function (x) { return x.status === 'VERIFIED' && x.no_peserta; }).length;
        var cap = Math.max(10, Number(config.to_room_capacity || 25));
        var nextIdx = verifiedCount + 1;
        var roomNum = Math.ceil(nextIdx / cap);
        var seat = ((nextIdx - 1) % cap) + 1;
        p.no_peserta = customNoPeserta || (padZero_(roomNum, 2) + '-' + padZero_(seat, 3));
        p.ruang = customRuang || ('Ruang ' + roomNum);
      } else {
        if (customNoPeserta) p.no_peserta = customNoPeserta;
        if (customRuang) p.ruang = customRuang;
      }

      peserta[idx] = p;
      writeTable_(ss, 'Peserta_TO', peserta);
      addAuditLog_(ss, session.username, 'VERIFY_TO', reg_code, p.nama_lengkap + ' -> ' + p.no_peserta + ' (' + p.ruang + ')');
      invalidatePublicCache_();
      return normalizePesertaObj_(p);
    }

    if (reg_code.indexOf('ML-') === 0) {
      var teams = readTable_(ss, 'Tim_ML');
      var tIdx = findIndexByField_(teams, 'reg_code', reg_code);
      if (tIdx < 0) throw new Error('NOT_FOUND:Tim tidak ditemukan.');

      var t = teams[tIdx];
      t.status = 'VERIFIED';
      t.catatan = catatan;
      t.verified_by = session.username;
      t.verified_at = new Date().toISOString();
      if (customSeed) {
        t.seed = customSeed;
      } else if (!t.seed) {
        var mlCount = teams.filter(function (x) { return x.status === 'VERIFIED'; }).length;
        t.seed = 'Seed ' + mlCount;
      }

      teams[tIdx] = t;
      writeTable_(ss, 'Tim_ML', teams);
      addAuditLog_(ss, session.username, 'VERIFY_ML', reg_code, t.nama_tim + ' (' + t.seed + ')');
      invalidatePublicCache_();
      var resTeam = normalizeTimObj_(t);
      resTeam.anggota = readTable_(ss, 'Anggota_ML').filter(function (a) { return a.reg_code === reg_code; });
      return resTeam;
    }

    throw new Error('INVALID_CODE:Kode registrasi tidak valid.');
  });
}

function handleReject_(body, session) {
  var reg_code = String(body.reg_code || '').trim().toUpperCase();
  var catatan = sanitizeCell_(body.catatan || '');
  if (!catatan) throw new Error('VALIDATION_ERROR:Catatan alasan penolakan wajib diisi.');

  return withLock_(function () {
    var ss = getSpreadsheet_();
    if (reg_code.indexOf('TO-') === 0) {
      var peserta = readTable_(ss, 'Peserta_TO');
      var idx = findIndexByField_(peserta, 'reg_code', reg_code);
      if (idx < 0) throw new Error('NOT_FOUND:Peserta tidak ditemukan.');
      peserta[idx].status = 'REJECTED';
      peserta[idx].catatan = catatan;
      peserta[idx].verified_by = session.username;
      peserta[idx].verified_at = new Date().toISOString();
      writeTable_(ss, 'Peserta_TO', peserta);
      addAuditLog_(ss, session.username, 'REJECT_TO', reg_code, catatan);
      invalidatePublicCache_();
      return normalizePesertaObj_(peserta[idx]);
    }
    if (reg_code.indexOf('ML-') === 0) {
      var teams = readTable_(ss, 'Tim_ML');
      var tIdx = findIndexByField_(teams, 'reg_code', reg_code);
      if (tIdx < 0) throw new Error('NOT_FOUND:Tim tidak ditemukan.');
      teams[tIdx].status = 'REJECTED';
      teams[tIdx].catatan = catatan;
      teams[tIdx].verified_by = session.username;
      teams[tIdx].verified_at = new Date().toISOString();
      writeTable_(ss, 'Tim_ML', teams);
      addAuditLog_(ss, session.username, 'REJECT_ML', reg_code, catatan);
      invalidatePublicCache_();
      return normalizeTimObj_(teams[tIdx]);
    }
    throw new Error('INVALID_CODE:Kode registrasi tidak valid.');
  });
}

function handleCheckin_(body, session) {
  var reg_code = String(body.reg_code || '').trim().toUpperCase();
  return withLock_(function () {
    var ss = getSpreadsheet_();
    if (reg_code.indexOf('TO-') === 0) {
      var peserta = readTable_(ss, 'Peserta_TO');
      var idx = findIndexByField_(peserta, 'reg_code', reg_code);
      if (idx < 0) throw new Error('NOT_FOUND:Kode peserta Try Out tidak ditemukan.');
      if (peserta[idx].status !== 'VERIFIED') {
        throw new Error('NOT_VERIFIED:Peserta berstatus ' + peserta[idx].status + '.');
      }
      var already = Boolean(peserta[idx].checkin_at);
      if (!already) {
        peserta[idx].checkin_at = new Date().toISOString();
        writeTable_(ss, 'Peserta_TO', peserta);
        addAuditLog_(ss, session.username, 'CHECKIN_TO', reg_code, peserta[idx].nama_lengkap);
      }
      return { jenis: 'try-out', already: already, peserta: normalizePesertaObj_(peserta[idx]) };
    }
    if (reg_code.indexOf('ML-') === 0) {
      var teams = readTable_(ss, 'Tim_ML');
      var tIdx = findIndexByField_(teams, 'reg_code', reg_code);
      if (tIdx < 0) throw new Error('NOT_FOUND:Kode tim ML tidak ditemukan.');
      if (teams[tIdx].status !== 'VERIFIED') {
        throw new Error('NOT_VERIFIED:Tim berstatus ' + teams[tIdx].status + '.');
      }
      var alreadyMl = Boolean(teams[tIdx].checkin_at);
      if (!alreadyMl) {
        teams[tIdx].checkin_at = new Date().toISOString();
        writeTable_(ss, 'Tim_ML', teams);
        addAuditLog_(ss, session.username, 'CHECKIN_ML', reg_code, teams[tIdx].nama_tim);
      }
      return { jenis: 'mobile-legends', already: alreadyMl, tim: normalizeTimObj_(teams[tIdx]) };
    }
    throw new Error('INVALID_CODE:Format kode harus TO-xxxx atau ML-xxx.');
  });
}

function handleInputSkor_(body, session) {
  var reg_code = String(body.reg_code || '').trim().toUpperCase();
  var bhs = Number(body.skor_bhs_indonesia || 0);
  var mat = Number(body.skor_matematika || 0);
  var lain = Number(body.skor_lainnya || 0);
  var sert = sanitizeCell_(body.sertifikat_url || '');

  return withLock_(function () {
    var ss = getSpreadsheet_();
    var peserta = readTable_(ss, 'Peserta_TO');
    var pIdx = findIndexByField_(peserta, 'reg_code', reg_code);
    if (pIdx < 0) throw new Error('NOT_FOUND:Peserta Try Out tidak ditemukan.');

    var hasil = readTable_(ss, 'Hasil_TO');
    var total = bhs + mat + lain;
    var record = {
      reg_code: reg_code,
      no_peserta: peserta[pIdx].no_peserta || '-',
      nama: peserta[pIdx].nama_lengkap,
      asal_sd: peserta[pIdx].asal_sd,
      skor_bhs_indonesia: bhs,
      skor_matematika: mat,
      skor_lainnya: lain,
      total: total,
      ranking: 1,
      sertifikat_url: sert,
    };

    var hIdx = findIndexByField_(hasil, 'reg_code', reg_code);
    if (hIdx >= 0) hasil[hIdx] = record;
    else hasil.push(record);

    hasil.sort(function (a, b) { return Number(b.total) - Number(a.total); });
    for (var i = 0; i < hasil.length; i++) {
      hasil[i].ranking = i + 1;
    }

    writeTable_(ss, 'Hasil_TO', hasil);
    addAuditLog_(ss, session.username, 'INPUT_SKOR_TO', reg_code, 'Total skor: ' + total);
    return hasil;
  });
}

function handleUpdateMatch_(body, session) {
  if (!body.babak || !body.tim_a || !body.tim_b) {
    throw new Error('VALIDATION_ERROR:Babak, Tim A, dan Tim B wajib diisi.');
  }
  return withLock_(function () {
    var ss = getSpreadsheet_();
    var matches = readTable_(ss, 'Match_ML');
    var match_id = body.match_id || ('M-' + Date.now().toString(36).toUpperCase());
    var matchObj = {
      match_id: match_id,
      babak: sanitizeCell_(body.babak),
      tim_a: sanitizeCell_(body.tim_a),
      tim_b: sanitizeCell_(body.tim_b),
      skor_a: Number(body.skor_a || 0),
      skor_b: Number(body.skor_b || 0),
      pemenang: sanitizeCell_(body.pemenang || ''),
      jadwal: sanitizeCell_(body.jadwal || ''),
      status: body.status === 'Live' || body.status === 'Selesai' ? body.status : 'Belum',
      link_live: sanitizeCell_(body.link_live || ''),
    };
    var idx = findIndexByField_(matches, 'match_id', match_id);
    if (idx >= 0) matches[idx] = matchObj;
    else matches.push(matchObj);

    writeTable_(ss, 'Match_ML', matches);
    addAuditLog_(ss, session.username, 'UPDATE_MATCH_ML', match_id, matchObj.tim_a + ' vs ' + matchObj.tim_b);
    return matches;
  });
}

// ============================================================================
// 7. HANDLER ADMIN (CONFIG, JUKNIS PDF DRIVE, KONTEN, USER, EKSPOR)
// ============================================================================

function handleConfigUpdate_(body, session) {
  return withLock_(function () {
    var ss = getSpreadsheet_();
    var current = readConfig_(ss);
    var patch = body.patch || body;

    // Bersihkan properti routing internal
    delete patch.action;
    delete patch.proxy_key;
    delete patch.token;

    var next = cloneObj_(current);
    var keys = Object.keys(patch);
    for (var i = 0; i < keys.length; i++) {
      next[keys[i]] = patch[keys[i]];
    }

    next.quota_to = Number(next.quota_to || 200);
    next.quota_ml = Number(next.quota_ml || 32);
    next.to_room_capacity = Number(next.to_room_capacity || 25);
    next.wa_panitia = normalizeWa_(next.wa_panitia || '6281234567890');

    writeConfig_(ss, next);
    addAuditLog_(ss, session.username, 'CONFIG_UPDATE', 'Config', 'Memperbarui pengaturan & tampilan acara');
    invalidatePublicCache_();
    return next;
  });
}

function handleUploadJuknisPdf_(body, session) {
  var base64 = String(body.base64 || '').trim();
  if (!base64) throw new Error('EMPTY_FILE:File PDF kosong.');

  var bytes = Utilities.base64Decode(base64);
  if (bytes.length === 0) throw new Error('EMPTY_FILE:File PDF kosong.');

  // Validasi signature %PDF-
  var headerStr = Utilities.newBlob(bytes.slice(0, Math.min(1024, bytes.length))).getDataAsString();
  if (headerStr.indexOf('%PDF-') < 0) {
    throw new Error('INVALID_PDF:File yang diunggah bukan dokumen PDF yang valid.');
  }

  var targetId = String(body.id || '').trim() || ('pdf-' + Date.now().toString(36));
  var labelInput = sanitizeCell_(body.label || '').trim();
  var kegiatanRaw = String(body.kegiatan || 'umum');
  var kegiatan = kegiatanRaw === 'try-out' || kegiatanRaw === 'mobile-legends' ? kegiatanRaw : 'umum';
  var origName = String(body.filename || 'juknis.pdf').replace(/[^\w.\-\s()]/g, '_') || 'juknis.pdf';
  if (origName.toLowerCase().slice(-4) !== '.pdf') origName += '.pdf';

  return withLock_(function () {
    var driveFolders = ensureDriveFolders_();
    var blob = Utilities.newBlob(bytes, 'application/pdf', origName);
    var file = driveFolders.juknisFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var ss = getSpreadsheet_();
    var config = readConfig_(ss);
    var list = Array.isArray(config.juknis_pdfs) ? config.juknis_pdfs.slice() : [];
    var idx = findIndexByField_(list, 'id', targetId);

    // Hapus file lama di Drive jika ada
    if (idx >= 0 && list[idx].file_url) {
      trashDriveFileFromUrl_(list[idx].file_url);
    }

    var nextItem = {
      id: targetId,
      label: labelInput || (idx >= 0 ? list[idx].label : origName.replace(/\.pdf$/i, '')),
      kegiatan: idx >= 0 && !body.kegiatan ? list[idx].kegiatan : kegiatan,
      file_name: origName,
      file_url: '/api/juknis-pdf/' + file.getId() + '.pdf',
      file_size: bytes.length,
      uploaded_at: new Date().toISOString(),
    };

    if (idx >= 0) list[idx] = nextItem;
    else list.push(nextItem);

    config.juknis_pdfs = list;
    writeConfig_(ss, config);
    addAuditLog_(ss, session.username, 'UPLOAD_JUKNIS_PDF', targetId, origName + ' (' + Math.round(bytes.length / 1024) + ' KB)');
    invalidatePublicCache_();
    return list;
  });
}

function handleUpsertJuknisSlot_(body, session) {
  var cleanLabel = sanitizeCell_(body.label || '').trim();
  if (!cleanLabel) throw new Error('VALIDATION_ERROR:Judul tombol Juknis wajib diisi.');
  var kegiatan = body.kegiatan === 'try-out' || body.kegiatan === 'mobile-legends' ? body.kegiatan : 'umum';
  var targetId = String(body.id || '').trim() || ('pdf-' + Date.now().toString(36));

  return withLock_(function () {
    var ss = getSpreadsheet_();
    var config = readConfig_(ss);
    var list = Array.isArray(config.juknis_pdfs) ? config.juknis_pdfs.slice() : [];
    var idx = findIndexByField_(list, 'id', targetId);

    if (idx >= 0) {
      list[idx].label = cleanLabel;
      list[idx].kegiatan = kegiatan;
    } else {
      list.push({
        id: targetId,
        label: cleanLabel,
        kegiatan: kegiatan,
        file_name: '',
        file_url: '',
        file_size: 0,
        uploaded_at: '',
      });
    }
    config.juknis_pdfs = list;
    writeConfig_(ss, config);
    addAuditLog_(ss, session.username, 'UPSERT_JUKNIS_SLOT', targetId, cleanLabel);
    invalidatePublicCache_();
    return list;
  });
}

function handleDeleteJuknisPdf_(body, session) {
  var id = String(body.id || '').trim();
  var mode = body.mode === 'slot' ? 'slot' : 'file';
  if (!id) throw new Error('INVALID_INPUT:ID Juknis PDF wajib diisi.');

  return withLock_(function () {
    var ss = getSpreadsheet_();
    var config = readConfig_(ss);
    var list = Array.isArray(config.juknis_pdfs) ? config.juknis_pdfs.slice() : [];
    var idx = findIndexByField_(list, 'id', id);

    if (idx >= 0) {
      if (list[idx].file_url) {
        trashDriveFileFromUrl_(list[idx].file_url);
      }
      if (mode === 'slot') {
        list.splice(idx, 1);
      } else {
        list[idx].file_name = '';
        list[idx].file_url = '';
        list[idx].file_size = 0;
        list[idx].uploaded_at = '';
      }
      config.juknis_pdfs = list;
      writeConfig_(ss, config);
      addAuditLog_(ss, session.username, 'DELETE_JUKNIS_PDF', id, mode === 'slot' ? 'Hapus tombol & file Juknis' : 'Hapus file PDF Juknis');
      invalidatePublicCache_();
    }
    return list;
  });
}

function handleContentUpsert_(body, session) {
  var sectionMap = {
    pengumuman: 'Pengumuman',
    jadwal: 'Jadwal',
    juknis: 'Juknis',
    faq: 'FAQ',
    hadiah: 'Hadiah',
    sponsor: 'Sponsor',
    galeri: 'Galeri',
  };
  var sheetName = sectionMap[body.section];
  if (!sheetName) throw new Error('INVALID_SECTION:Kategori konten tidak valid.');

  var item = body.item || {};
  return withLock_(function () {
    var ss = getSpreadsheet_();
    var list = readTable_(ss, sheetName);
    var id = item.id || (String(body.section).slice(0, 2) + '-' + Date.now().toString(36));
    var entry = cloneObj_(item);
    entry.id = id;

    var idx = findIndexByField_(list, 'id', id);
    if (idx >= 0) list[idx] = entry;
    else list.unshift(entry);

    writeTable_(ss, sheetName, list);
    addAuditLog_(ss, session.username, 'CONTENT_UPSERT', body.section + ':' + id, entry.judul || entry.pertanyaan || entry.nama || entry.peringkat || id);
    invalidatePublicCache_();
    return list;
  });
}

function handleContentDelete_(body, session) {
  var sectionMap = {
    pengumuman: 'Pengumuman',
    jadwal: 'Jadwal',
    juknis: 'Juknis',
    faq: 'FAQ',
    hadiah: 'Hadiah',
    sponsor: 'Sponsor',
    galeri: 'Galeri',
  };
  var sheetName = sectionMap[body.section];
  var id = String(body.id || '').trim();
  if (!sheetName || !id) throw new Error('INVALID_INPUT:Section dan ID wajib diisi.');

  return withLock_(function () {
    var ss = getSpreadsheet_();
    var list = readTable_(ss, sheetName).filter(function (x) { return String(x.id) !== id; });
    writeTable_(ss, sheetName, list);
    addAuditLog_(ss, session.username, 'CONTENT_DELETE', body.section + ':' + id, 'Menghapus item konten');
    invalidatePublicCache_();
    return list;
  });
}

function handleUserList_() {
  var ss = getSpreadsheet_();
  return readTable_(ss, 'Users').map(function (u) {
    return {
      username: u.username,
      role: u.role,
      nama: u.nama,
      aktif: toBool_(u.aktif),
      last_login: u.last_login || null,
    };
  });
}

function handleUserCreate_(body, session) {
  var username = String(body.username || '').trim().toLowerCase();
  var password = String(body.password || '');
  var nama = sanitizeCell_(body.nama || '');
  var role = body.role === 'ADMIN' ? 'ADMIN' : 'DASHBOARD';
  if (!username || password.length < 6 || !nama) {
    throw new Error('VALIDATION_ERROR:Username, nama, dan password minimal 6 karakter wajib diisi.');
  }

  return withLock_(function () {
    var ss = getSpreadsheet_();
    var users = readTable_(ss, 'Users');
    if (findIndexByField_(users, 'username', username) >= 0) {
      throw new Error('DUPLICATE_USER:Username sudah digunakan.');
    }
    var salt = randomHex_(16);
    users.push({
      username: username,
      password_hash: sha256_(salt + ':' + password),
      salt: salt,
      role: role,
      nama: nama,
      aktif: true,
      last_login: '',
      failed_attempts: 0,
      locked_until: '',
    });
    writeTable_(ss, 'Users', users);
    addAuditLog_(ss, session.username, 'USER_CREATE', username, 'Role: ' + role);
    return handleUserList_();
  });
}

function handleUserUpdate_(body, session) {
  var username = String(body.username || '').trim();
  var role = body.role === 'ADMIN' ? 'ADMIN' : body.role === 'DASHBOARD' ? 'DASHBOARD' : null;
  var hasAktif = typeof body.aktif === 'boolean';
  var newPassword = String(body.new_password || '');

  if (username === session.username && body.aktif === false) {
    throw new Error('SELF_LOCKOUT:Tidak dapat menonaktifkan akun Anda sendiri.');
  }

  return withLock_(function () {
    var ss = getSpreadsheet_();
    var users = readTable_(ss, 'Users');
    var idx = findIndexByField_(users, 'username', username);
    if (idx < 0) throw new Error('NOT_FOUND:Akun tidak ditemukan.');

    if (role) users[idx].role = role;
    if (hasAktif) users[idx].aktif = body.aktif;
    if (newPassword.length >= 6) {
      var salt = randomHex_(16);
      users[idx].salt = salt;
      users[idx].password_hash = sha256_(salt + ':' + newPassword);
    }
    writeTable_(ss, 'Users', users);
    addAuditLog_(ss, session.username, 'USER_UPDATE', username, 'role=' + users[idx].role + ', aktif=' + users[idx].aktif);
    return handleUserList_();
  });
}

function handleDeleteRegistrasi_(body, session) {
  var type = String(body.type || '');
  var reg_code = String(body.reg_code || '').trim().toUpperCase();

  return withLock_(function () {
    var ss = getSpreadsheet_();
    if (type === 'try-out') {
      writeTable_(ss, 'Peserta_TO', readTable_(ss, 'Peserta_TO').filter(function (p) { return p.reg_code !== reg_code; }));
      writeTable_(ss, 'Hasil_TO', readTable_(ss, 'Hasil_TO').filter(function (h) { return h.reg_code !== reg_code; }));
    } else if (type === 'mobile-legends') {
      writeTable_(ss, 'Tim_ML', readTable_(ss, 'Tim_ML').filter(function (t) { return t.reg_code !== reg_code; }));
      writeTable_(ss, 'Anggota_ML', readTable_(ss, 'Anggota_ML').filter(function (a) { return a.reg_code !== reg_code; }));
    }
    addAuditLog_(ss, session.username, 'DELETE_REGISTRASI', reg_code, 'Menghapus pendaftaran ' + type);
    invalidatePublicCache_();
    return { deleted: reg_code };
  });
}

function handleExportCsv_(type) {
  var ss = getSpreadsheet_();
  if (type === 'peserta-to') {
    var peserta = readTable_(ss, 'Peserta_TO');
    return {
      filename: 'peserta-tryout-spendapul.csv',
      mime_type: 'text/csv; charset=utf-8',
      content: toCsv_(
        ['Kode', 'Waktu', 'Nama Lengkap', 'L/P', 'Asal SD', 'Kelas', 'NISN', 'Orang Tua', 'WA Ortu', 'Status', 'No Peserta', 'Ruang', 'Check-in'],
        peserta.map(function (p) {
          return [p.reg_code, p.timestamp, p.nama_lengkap, p.jenis_kelamin, p.asal_sd, p.kelas, p.nisn, p.nama_ortu, p.wa_ortu, p.status, p.no_peserta, p.ruang, p.checkin_at || ''];
        })
      ),
    };
  }
  if (type === 'tim-ml') {
    var teams = readTable_(ss, 'Tim_ML');
    return {
      filename: 'tim-ml-spendapul.csv',
      mime_type: 'text/csv; charset=utf-8',
      content: toCsv_(
        ['Kode', 'Waktu', 'Nama Tim', 'Asal Sekolah', 'Kapten', 'WA Kapten', 'Status', 'Seed', 'Check-in'],
        teams.map(function (t) {
          return [t.reg_code, t.timestamp, t.nama_tim, t.asal_sekolah, t.nama_kapten, t.wa_kapten, t.status, t.seed, t.checkin_at || ''];
        })
      ),
    };
  }
  if (type === 'hasil-to') {
    var hasil = readTable_(ss, 'Hasil_TO');
    return {
      filename: 'hasil-tryout-spendapul.csv',
      mime_type: 'text/csv; charset=utf-8',
      content: toCsv_(
        ['Ranking', 'Kode', 'No Peserta', 'Nama', 'Asal SD', 'Bhs Indonesia', 'Matematika', 'Lainnya', 'Total'],
        hasil.map(function (h) {
          return [h.ranking, h.reg_code, h.no_peserta, h.nama, h.asal_sd, h.skor_bhs_indonesia, h.skor_matematika, h.skor_lainnya, h.total];
        })
      ),
    };
  }
  throw new Error('INVALID_EXPORT:Tipe ekspor tidak dikenal.');
}

function handleBackupJson_() {
  var ss = getSpreadsheet_();
  return {
    filename: 'backup-spendapul-' + new Date().toISOString().slice(0, 10) + '.json',
    mime_type: 'application/json; charset=utf-8',
    content: JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        config: readConfig_(ss),
        peserta_to: readTable_(ss, 'Peserta_TO'),
        tim_ml: readTable_(ss, 'Tim_ML'),
        anggota_ml: readTable_(ss, 'Anggota_ML'),
        hasil_to: readTable_(ss, 'Hasil_TO'),
        match_ml: readTable_(ss, 'Match_ML'),
        pengumuman: readTable_(ss, 'Pengumuman'),
        jadwal: readTable_(ss, 'Jadwal'),
        faq: readTable_(ss, 'FAQ'),
        hadiah: readTable_(ss, 'Hadiah'),
        sponsor: readTable_(ss, 'Sponsor'),
        galeri: readTable_(ss, 'Galeri'),
        users: handleUserList_(),
        logs: readTable_(ss, 'Log'),
      },
      null,
      2
    ),
  };
}

// ============================================================================
// 8. HELPER SPREADSHEET, GOOGLE DRIVE, CACHE, LOCK & KEAMANAN
// ============================================================================

function verifyProxyKey_(incomingKey) {
  var expected = PropertiesService.getScriptProperties().getProperty('PROXY_KEY');
  if (expected && String(incomingKey || '') !== expected) {
    throw new Error('FORBIDDEN_PROXY:Kunci proxy tidak valid.');
  }
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function readTable_(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var headers = SHEET_HEADERS[sheetName];
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var rowObj = {};
    var isEmpty = true;
    for (var c = 0; c < headers.length; c++) {
      var val = values[r][c];
      if (val !== '' && val !== null && val !== undefined) isEmpty = false;
      if (val instanceof Date) {
        val = val.toISOString();
      } else if (TEXT_COLS[headers[c]]) {
        val = val === '' || val === null ? '' : String(val);
      }
      rowObj[headers[c]] = val;
    }
    if (!isEmpty) out.push(rowObj);
  }
  return out;
}

function writeTable_(ss, sheetName, rows) {
  var sheet = ss.getSheetByName(sheetName);
  var headers = SHEET_HEADERS[sheetName];
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }
  if (!rows || rows.length === 0) return;

  var matrix = rows.map(function (obj) {
    return headers.map(function (h) {
      var val = obj[h];
      if (val === undefined || val === null) return '';
      if (TEXT_COLS[h] && val !== '') {
        return "'" + String(val).replace(/^'/, '');
      }
      return val;
    });
  });
  sheet.getRange(2, 1, matrix.length, headers.length).setValues(matrix);
}

function appendRow_(ss, sheetName, obj) {
  var sheet = ss.getSheetByName(sheetName);
  var headers = SHEET_HEADERS[sheetName];
  var row = headers.map(function (h) {
    var val = obj[h];
    if (val === undefined || val === null) return '';
    if (TEXT_COLS[h] && val !== '') return "'" + String(val).replace(/^'/, '');
    return val;
  });
  sheet.appendRow(row);
}

function readConfig_(ss) {
  var defaults = getDefaultConfig_();
  var rows = readTable_(ss, 'Config');
  var result = cloneObj_(defaults);
  for (var i = 0; i < rows.length; i++) {
    var k = String(rows[i].key || '').trim();
    var raw = rows[i].value;
    if (!k) continue;
    if (typeof defaults[k] === 'boolean') {
      result[k] = toBool_(raw);
    } else if (typeof defaults[k] === 'number') {
      result[k] = Number(raw || defaults[k]);
    } else if (Array.isArray(defaults[k])) {
      try {
        result[k] = typeof raw === 'string' && raw ? JSON.parse(raw) : defaults[k];
      } catch (e) {
        result[k] = defaults[k];
      }
    } else {
      result[k] = raw === null || raw === undefined ? '' : String(raw);
    }
  }
  return result;
}

function writeConfig_(ss, configObj) {
  var rows = Object.keys(configObj).map(function (k) {
    var v = configObj[k];
    var serialized = Array.isArray(v) || (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v);
    return { key: k, value: serialized };
  });
  writeTable_(ss, 'Config', rows);
}

function incrementCounter_(ss, name) {
  var rows = readTable_(ss, 'Counter');
  var idx = findIndexByField_(rows, 'nama', name);
  var nextVal = 1;
  if (idx >= 0) {
    nextVal = Number(rows[idx].nilai || 0) + 1;
    rows[idx].nilai = nextVal;
  } else {
    rows.push({ nama: name, nilai: nextVal });
  }
  writeTable_(ss, 'Counter', rows);
  return nextVal;
}

function addAuditLog_(ss, username, aksi, target, detail) {
  var logs = readTable_(ss, 'Log');
  logs.unshift({
    id: 'log-' + Date.now() + '-' + randomHex_(2),
    timestamp: new Date().toISOString(),
    username: username,
    aksi: aksi,
    target: target,
    detail: detail,
  });
  if (logs.length > 500) logs = logs.slice(0, 500);
  writeTable_(ss, 'Log', logs);
}

function saveDataUrlToDrive_(dataUrl, folderId, baseName, isPublic) {
  var match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return '';
  var mimeType = match[1];
  var ext = mimeType.indexOf('png') >= 0 ? 'png' : 'jpg';
  var bytes = Utilities.base64Decode(match[2]);
  var blob = Utilities.newBlob(bytes, mimeType, baseName + '.' + ext);
  var folder = DriveApp.getFolderById(folderId);
  var file = folder.createFile(blob);
  if (isPublic) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/uc?export=view&id=' + file.getId();
  }
  return 'https://drive.google.com/file/d/' + file.getId() + '/view';
}

function trashDriveFileFromUrl_(fileUrl) {
  var m = String(fileUrl || '').match(/\/api\/juknis-pdf\/([a-zA-Z0-9_-]+)/);
  if (!m) return;
  try {
    DriveApp.getFileById(m[1]).setTrashed(true);
  } catch (e) {}
}

function invalidatePublicCache_() {
  try {
    CacheService.getScriptCache().removeAll(['config_public', 'public_content', 'peserta_public']);
  } catch (e) {}
}

function normalizePesertaObj_(p) {
  var obj = cloneObj_(p);
  obj.persetujuan = toBool_(obj.persetujuan);
  obj.checkin_at = obj.checkin_at || null;
  obj.verified_by = obj.verified_by || null;
  obj.verified_at = obj.verified_at || null;
  return obj;
}

function normalizeTimObj_(t) {
  var obj = cloneObj_(t);
  obj.persetujuan = toBool_(obj.persetujuan);
  obj.checkin_at = obj.checkin_at || null;
  obj.verified_by = obj.verified_by || null;
  obj.verified_at = obj.verified_at || null;
  return obj;
}

function sanitizeCell_(val) {
  var s = String(val === null || val === undefined ? '' : val).trim();
  if (/^[=+\-@]/.test(s)) return "'" + s;
  return s;
}

function normalizeWa_(raw) {
  var digits = String(raw === null || raw === undefined ? '' : raw).replace(/\D/g, '');
  if (digits.indexOf('0') === 0) return '62' + digits.slice(1);
  if (digits.indexOf('8') === 0) return '62' + digits;
  return digits;
}

function maskName_(fullName) {
  return String(fullName || '')
    .trim()
    .split(/\s+/)
    .map(function (p) {
      if (p.length <= 2) return (p.charAt(0) || '') + '*';
      var stars = '';
      var count = Math.min(4, p.length - 2);
      for (var i = 0; i < count; i++) stars += '*';
      return p.slice(0, 2) + stars;
    })
    .join(' ');
}

function toCsv_(headers, rows) {
  var esc = function (v) {
    var s = String(v === null || v === undefined ? '' : v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  var lines = [headers.map(esc).join(',')];
  for (var i = 0; i < rows.length; i++) {
    lines.push(rows[i].map(esc).join(','));
  }
  return lines.join('\n');
}

function sha256_(input) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(input), Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    hex += ('0' + b.toString(16)).slice(-2);
  }
  return hex;
}

function randomHex_(bytesLen) {
  var hex = '';
  for (var i = 0; i < bytesLen; i++) {
    hex += ('0' + Math.floor(Math.random() * 256).toString(16)).slice(-2);
  }
  return hex;
}

function padZero_(num, len) {
  var s = String(num);
  while (s.length < len) s = '0' + s;
  return s;
}

function toBool_(v) {
  return v === true || String(v).toUpperCase() === 'TRUE';
}

function findIndexByField_(arr, field, value) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i][field] === value) return i;
  }
  return -1;
}

function cloneObj_(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

function handleError_(err) {
  var msg = err && err.message ? String(err.message) : 'Terjadi kesalahan pada server GAS.';
  var colon = msg.indexOf(':');
  if (colon > 0) {
    return failJson_(msg.slice(0, colon), msg.slice(colon + 1));
  }
  return failJson_('GAS_ERROR', msg);
}

function okJson_(data) {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, data: data, error: null, ts: Date.now() })
  ).setMimeType(ContentService.MimeType.JSON);
}

function failJson_(code, message) {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: false, data: null, error: { code: code, message: message }, ts: Date.now() })
  ).setMimeType(ContentService.MimeType.JSON);
}
