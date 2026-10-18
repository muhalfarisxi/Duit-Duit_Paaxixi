# Duit-Duit Paaxixi — Versi Google Login

Website ini sudah menggunakan **Login Google (Firebase Authentication)**, sesuai Google Sign-in yang diaktifkan pada proyek `duit-duit-paaxixi`. Konfigurasi Firebase yang terlihat di screenshot telah dimasukkan ke `firebase-config.js`. Itu adalah **konfigurasi publik aplikasi web**, bukan password.

## 1. Atur Firestore Security Rules (WAJIB)
1. Buka https://console.firebase.google.com/project/duit-duit-paaxixi/firestore .
2. Klik tab **Rules**.
3. Ganti seluruh isi editor dengan `firestore.rules` dalam paket ini, lalu klik **Publish**.
4. Aturan itu hanya mengizinkan akun Google yang login untuk mengakses dokumen di `users/{uid}/arus/` bila UID pada jalur sama dengan UID yang login. Akun Google lain tidak dapat membuka datamu, tetapi masih bisa login dan membuat dataset terpisah miliknya sendiri. Bila ingin menolak semua akun selain milikmu, setelah login pertama ambil UID pada **Authentication → Users**, lalu tambahkan batas UID tetap ke rules.
5. JANGAN gunakan `allow read, write: if true`.

## 2. Daftarkan GitHub Pages sebagai Authorized Domain
1. Buat repo GitHub, misal `duit-duit-paaxixi`.
2. Ketika sudah tahu URL Pages, buka Firebase **Authentication → Settings → Authorized domains**.
3. Tambahkan `NAMAUSER.github.io` (tanpa `https://`, tanpa path repo), dengan NAMAUSER adalah username GitHub milikmu.
4. Pada GitHub repository, Settings → Pages → Deploy from a branch → `main`, `/(root)`.

## 3. Unggah website
Unggah **empat file ini** ke root repo GitHub: `index.html`, `cloud.js`, `firebase-config.js`, `firestore.rules` (rules untuk dokumentasi saja; **tidak otomatis terpasang ke Firestore** saat diunggah ke GitHub). `PANDUAN_SETUP.md` boleh diunggah juga.

## 4. Uji sinkronisasi
1. Buka website di laptop lewat HTTPS GitHub Pages, lalu menu **Rekening & Data** → **Masuk dengan Google**.
2. Pada pertama kali, bila cloud kosong, gunakan opsi **Mulai cloud baru (kosong)**; jangan unggah data simulasi bila tidak dimaksudkan.
3. Input satu transaksi uji tanpa informasi rekening asli; cek Firestore menampilkan data di `users/UID/arus`.
4. Buka alamat GitHub Pages yang sama di HP; masuk dengan **akun Google yang sama**; pastikan transaksi uji muncul. Edit/hapus dari salah satu perangkat dan cek yang lain.
5. Setelah uji sukses, gunakan data sesungguhnya. Siapkan cadangan lewat **Ekspor JSON** secara berkala.

### Catatan
- Pop-up Google Login bisa diblokir oleh browser tertentu. Uji di Chrome terbaru; gunakan situs GitHub Pages melalui tab browser, bukan browser dalam aplikasi lain.
- Data yang tercatat tetap terbatas pada informasi yang kamu input manual, tidak mengambil informasi dari rekening bank otomatis.
- Kode sinkronisasi per bulan pada versi ini dapat mengalami konflik jika dua perangkat mengedit bulan yang sama **pada saat bersamaan**. Hindari edit simultan sampai mekanisme konflik ditingkatkan.
- Bila akun Google login benar tetapi muncul `Missing or insufficient permissions`, periksa apakah rules telah dipublish, pengguna login, dan konfigurasi project sesuai.
- Jika login Google tidak berhasil dengan pesan `auth/unauthorized-domain`, tambahkan domain GitHub Pages pada Firebase Authentication → Settings → Authorized domains.
- Label internal `arus` dalam jalur database tidak perlu diubah; itu hanya nama struktur yang dipakai aplikasi.


## Quotes Berbasis Keuangan & Tren Populer
- Dashboard membuat insight dari transaksi **di browser pengguna**: anggaran yang melewati batas, yang menipis, pemasukan vs pengeluaran, dan kategori paling besar.
- Insight itu digabung dengan quote Gen Z dari `quote-mingguan.json`. **Angka, kategori, dan rincian keuangan tidak pernah dikirim ke TikTok/Google Trends**.
- GitHub Actions memperbarui quote mingguan secara otomatis (jadwal sekitar Senin 06.30 WIB), mengambil tema dari **Google Trends Indonesia** jika tersedia. Bila gagal, pakai quote cadangan.
- Integrasi tren resmi **TikTok Indonesia** tersedia sebagai pilihan, tetapi **belum aktif** sampai API terotorisasi. Jika memiliki akses TikTok Business API, simpan kredensial pada repository **Settings → Secrets and variables → Actions → Repository secrets**:
  - `TIKTOK_ACCESS_TOKEN`
  - `TIKTOK_ADVERTISER_ID`
- **Jangan pernah** menulis token/kredensial di `index.html`, `quote-mingguan.json`, atau chat. Ketika dua secret sudah tersedia, skrip akan mencoba `discovery/trending_list/` untuk hashtag populer wilayah `ID`, dan otomatis fallback ke Google Trends bila akses gagal.
- Tokoh/artis hanya disebut bila cocok dengan tema dari sumber tren yang benar-benar terbaca. Quote merupakan kalimat **orisinal**, bukan pernyataan atau kutipan resmi tokoh tersebut.

## Kelola Pos Anggaran Langsung Dari Website
- Buka **Anggaran Bulanan** untuk mengedit pagu tiap kategori dan klik **Simpan Anggaran**.
- Pada bagian kelompok **LIVING FIX**, **PLAYING**, dan **LIVING LAIN**, klik **＋ Tambah Pos**.
- Untuk mengubah nama atau kelompok suatu pos, klik **Edit** di sebelah posnya; kode kategori tetap dipertahankan supaya riwayat transaksi dan anggaran tidak terputus.
- Klik **Hapus** hanya untuk pos yang belum dipakai transaksi/pemindahan atau memiliki anggaran aktif. Pos yang sudah digunakan sengaja tidak bisa dihapus agar catatan historis aman.
- Semua perubahan data yang dibuat setelah sinkronisasi siap tersimpan melalui mekanisme Firebase yang sudah dipakai website.

## Kelompok Pengeluaran Fleksibel (Pembaruan)
- Buka **Anggaran Bulanan → Kelola Kelompok Pengeluaran**.
- Isi **Nama Kelompok** dan pilih **Warna Kelompok**, kemudian klik **Tambah Kelompok**.
- Klik **Edit** untuk mengubah nama/warna kelompok yang sudah ada. Semua kategori/pos di kelompok itu otomatis mengikuti nama baru; ID kategori serta riwayat transaksi/anggaran tetap sama.
- Klik **Hapus** hanya setelah semua pos di kelompok itu dipindahkan ke kelompok lain. Minimal satu kelompok harus tetap ada.
- Pada tabel **Atur Batas Tiap Kategori**, klik **＋ Tambah Pos** untuk mengisi kelompok baru, atau edit kategori untuk memindahkannya.
- Kelompok akan otomatis muncul di input transaksi, pie chart komposisi pengeluaran, serta sinkronisasi cloud.
- Struktur `expenseGroups: [{id,name,color}]` disimpan bersama data keuangan di Firestore (`users/<uid>/arus/meta`) dan ikut diekspor ke cadangan JSON.
- File cadangan dan data Firestore versi sebelumnya yang belum memiliki `expenseGroups` tetap didukung; kelompok asal akan dibuat otomatis tanpa menghapus data.
- Arsip laporan lama adalah *snapshot*, sehingga nama kelompok pada laporan yang sudah diarsipkan tetap merekam kondisi saat laporan dibuat.
