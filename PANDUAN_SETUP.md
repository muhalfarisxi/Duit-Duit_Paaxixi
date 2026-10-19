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


## Dashboard Analisis Dinamis (Kumulatif, Filter, dan Trendline)
- Buka **Dashboard → Komposisi Pengeluaran → ⚙ Atur Analisis**. Defaultnya adalah akumulasi pengeluaran pada bulan di bagian atas website.
- Filter ditata berurutan: **(1) Periode Pengeluaran → (2) Kelompok Pengeluaran → (3) Pos Pengeluaran → (4) Tampilan Komposisi**.
- Filter dibuat **ringkas dua kolom**. Klik kolom **Kelompok** atau **Pos** untuk membuka pop-up kecil dengan pilihan centang (multi-select) dan tombol **Pilih Semua / Hapus Semua**. Pop-up tidak menambah tinggi kartu, dapat ditutup dengan menekan di luar atau tombol Esc, dan menyesuaikan posisi jika tidak cukup ruang di bawah.
- Kelompok dan pos mendukung **Pilih Semua** serta **Hapus Semua**. Daftar pos hanya berisi pos dari kelompok yang masih dipilih; saat kelompok diganti, pilihan pos diatur ulang menjadi semua pos yang terlihat.
- Periode komposisi bisa berupa bulan terpilih, rentang tanggal bebas, atau seluruh tanggal yang tercatat. Persentase diagram donat dihitung dari transaksi yang masuk filter.
- Bagian **Tren & Perbandingan Pengeluaran** menggunakan **grafik garis** dengan titik dan label nominal. Pilih jenis perbandingan **Antartanggal (Harian), Antarbulan (Bulanan), atau Antartahun (Tahunan)**. Setiap jenis memiliki input **Dari** dan **Sampai** sendiri.
- Pengaturan rentang tren **independen** dari periode donat, namun tetap mengikuti pilihan kelompok/pos. Defaultnya 14 hari, 12 bulan, atau 5 tahun terakhir relatif terhadap bulan terpilih; tombol **Rentang Default** mengembalikan pengaturan tersebut.
- Label nominal titik ditampilkan secara default; centang **Tampilkan Label Nominal Di Titik Grafik** bisa dimatikan untuk grafik lebih bersih. Untuk rentang panjang, label diberi jarak agar tidak bertumpuk. Arahkan kursor atau sentuh titik untuk melihat nominal lengkap.
- Garis **Total Pengeluaran** menjadi garis utama. Garis tambahan menunjukkan kelompok/pos terbesar agar tren penyumbang utama terlihat. Laporan mencakup perubahan antarperiode, kontributor utama, dan indikasi lonjakan (>30% sekaligus minimum Rp50.000), kenaikan 3 periode berturut-turut, atau konsentrasi >=50%.
- Tabel rincian angka **tidak ditampilkan terus-menerus**; buka **Lihat Rincian Angka Per Periode** jika perlu. Supaya performa HP tetap stabil, grafik dibatasi maksimum 60 hari, 36 bulan, atau 20 tahun terakhir dari rentang yang dipilih dan memberikan keterangan bila rentang dipangkas.
- Periode tanpa transaksi tidak otomatis dianggap nol aktual; perbandingan persen hanya dibuat bila kedua periode punya transaksi dan periode pembanding positif. Periode berjalan ditandai belum lengkap.
- Filter ini hanya memengaruhi analisis; transaksi, saldo, anggaran, arsip laporan, dan sinkronisasi Firestore tetap seperti sebelumnya. Perubahan nama/kelompok pos di masa depan akan tercermin pada pengelompokan riwayat analisis berdasarkan kategori saat ini.



## Popup Tambah / Edit Kelompok dan Pos Pengeluaran
- Pada menu **Anggaran Bulanan → Kelola Kelompok Pengeluaran**, klik **＋ Tambah Kelompok** atau **Edit** untuk membuka popup kecil.
- Kelompok: isi nama lalu pilih satu dari **5 rekomendasi warna unik** yang ditampilkan sebagai swatch lingkaran (tanpa input HEX bebas). Rekomendasi diambil dari **25 warna kurasi yang serasi dengan navy** dan **tidak pernah menawarkan warna yang sudah dipakai kelompok lain**. Saat mengedit, warna sendiri yang sekarang tetap termasuk dalam 5 pilihan; 4 sisanya adalah alternatif yang berbeda. Saat kelompok baru dibuat, warna default mengambil rekomendasi paling berbeda dari warna yang sudah ada. Jika 25 warna kurasi habis, kode menyediakan variasi harmonis tambahan tanpa mengulang HEX. Kelompok lama dengan duplikasi warna akan dinormalisasi otomatis, dengan menjaga warna unik yang sudah ada. Popup menyediakan **Simpan Perubahan/Tambah Kelompok**, **Batal**, dan **✕**.
- Pada tabel **Atur Batas Tiap Kategori**, klik **＋ Tambah Pos** pada kelompok yang sesuai, tombol global **＋ Tambah Pos**, atau **Edit** pada baris pos. Popup memungkinkan mengubah nama dan kelompok tanpa mengganti ID pos.
- Menekan **Esc** atau mengeklik area gelap di luar formulir juga menutup popup.
- **Ikon kategori** dalam popup mengikuti nama pos/kelompok yang diketik.
- Angka anggaran yang belum disimpan tetap dipertahankan di input tabel ketika popup disimpan. Tekan **Simpan Anggaran** untuk benar-benar menyimpan perubahan nominal pagu; perubahan nama/kelompok memiliki tombol Simpan tersendiri.
- Hapus masih meminta konfirmasi dan menjaga agar pos yang sudah dipakai transaksi/anggaran tidak dapat dihapus sembarangan.
- Penyimpanan data dan sinkronisasi Firestore tetap memakai mekanisme yang sama seperti sebelumnya.


## Kalender dan Grafik Tinjau Pengeluaran
- Menu **Tinjau Pengeluaran** memiliki dua mode: **Grafik Per Pos** (default) dan **Kalender Tanggal**. Kedua tampilan responsif untuk ponsel/laptop.
- **Grafik Per Pos**: dalam satu panel, grafik dikelompokkan menjadi **dropdown per Kelompok Pengeluaran** (default tertutup), menampilkan ikon, jumlah pos/transaksi, total pengeluaran, dan jumlah batas anggaran kelompok. Kelompok diurutkan berdasarkan total pengeluaran terbesar. Ringkasan setiap kelompok **juga memiliki grafik batang horizontal** sesuai total pengeluaran kelompok serta **garis batas anggaran total kelompok** (penjumlahan anggaran efektif semua pos di dalamnya), dilengkapi status Aman/Menipis/Melewati Batas. Warna batang sesuai warna kelompok. Skala grafik ringkasan sama untuk seluruh kelompok. Klik nama atau grafik kelompok untuk membuka/menutup pos miliknya; beberapa kelompok dapat dibuka bersamaan. Di dalamnya, batang horizontal tiap pos diurutkan dari nominal terbesar, memakai warna kelompok, dan memiliki garis batas anggaran per pos. Klik batang untuk membuka popup daftar transaksi pos tersebut, termasuk Edit/Hapus. Status dan batas anggaran tetap mengacu pada pengeluaran kumulatif bulan yang dipilih, sementara nominal batang bisa mengikuti filter tanggal. Pilihan kelompok yang sedang terbuka tetap terbuka setelah melihat popup.
- **Kalender Tanggal**: tujuh kolom Senin–Minggu, berisi total pengeluaran harian (disingkat ketika perlu agar muat pada HP). Tanggal tanpa transaksi ditandai garis pendek. Klik tanggal untuk membuka popup transaksi tanggal tersebut. Tanggal hari ini ditandai menurut waktu WIB.
- **Lihat Seluruh Pengeluaran**: tombol pada kalender membuka popup berisi rekap bulan terpilih **dikelompokkan menurut tanggal terbaru ke terlama**, dengan rincian transaksi dan tombol Edit/Hapus.
- Filter kategori berlaku untuk kedua mode, termasuk popup daftar keseluruhan. Reset Filter mengembalikan semua pos. CSV tetap tersedia dan menggunakan filter yang sedang aktif.
- Pop-up bisa ditutup dengan tombol ✕, klik latar gelap di luar dialog, atau tombol Escape. Mode Kalender tidak menggunakan input Filter Tanggal tersendiri karena seluruh hari langsung tersedia untuk diklik.
- Perubahan ini hanya mengubah tampilan dan cara meninjau; pengolahan anggaran, arsip keuangan, serta mekanisme sinkronisasi Firebase tetap menggunakan data yang sama.
