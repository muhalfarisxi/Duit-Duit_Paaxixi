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
