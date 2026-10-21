# Mengaktifkan Insight Keuangan Gemini AI

Insight Keuangan pada dashboard sudah berupa popup dan selalu memiliki analisis statistik lokal sebagai cadangan. **Mode Gemini belum akan mengirim permintaan atau bekerja sebelum konfigurasi Firebase AI Logic + App Check selesai.** Tidak ada kunci rahasia model yang boleh disimpan di repository ini.

## Aktivasi satu kali

1. Buka [Firebase Console](https://console.firebase.google.com/project/duit-duit-paaxixi/overview), pilih project `duit-duit-paaxixi`, lalu buka **AI Logic** dan pilih **Get started**.
2. Pilih **Gemini Developer API** dan ikuti panduan mengaktifkan layanan serta kebijakan kuota/penagihan sesuai kebutuhan. Model yang digunakan di website: `gemini-3.5-flash`.
3. Buka **App Check**, daftarkan aplikasi web untuk domain `muhalfarisxi.github.io` menggunakan **reCAPTCHA Enterprise**. Konfigurasikan pengesahan (attestation) produksi dan pastikan **AI Logic** dilindungi App Check (Enforced).
4. Salin **reCAPTCHA Enterprise site key** (ini *public site key*, bukan secret key). Pada file `firebase-config.js`, ubah:
   ```js
   window.ARUS_AI_APP_CHECK_SITE_KEY = 'SITE_KEY_RECAPTCHA_ENTERPRISE';
   ```
   Jangan memasukkan API key Gemini, service-account, token admin, atau password ke source code.
5. Publish/update GitHub Pages, buka website lalu tekan **Insight Keuangan → Buka Insight → Analisis dengan Gemini**.

## Privasi

- Permintaan AI baru terjadi setelah pengguna memilih tombol **Analisis dengan Gemini**.
- Payload terbatas pada rentang tanggal, jumlah & total transaksi, nama kelompok/pos, ringkasan tanggal/bulan, pemasukan agregat yang relevan dan penggunaan anggaran.
- Catatan, judul transaksi, nomor rekening, identitas pihak utang/piutang, dan rincian mentah transaksi tidak disertakan.
- Data yang dikirim diproses oleh penyedia Gemini melalui Firebase AI Logic. Periksa ketentuan layanan, kuota, dan potensi biaya sebelum mengaktifkan.
- Bila belum dikonfigurasi atau panggilan gagal, popup tetap menampilkan analisis aturan statistik lokal tanpa mengklaimnya sebagai generasi AI.

## Referensi resmi

- [Firebase AI Logic – Get started for Web](https://firebase.google.com/docs/ai-logic/get-started?platform=web)
- [Firebase AI Logic – App Check](https://firebase.google.com/docs/ai-logic/app-check)
- [Firebase AI Logic – Model dan kuota](https://firebase.google.com/docs/ai-logic/models)
