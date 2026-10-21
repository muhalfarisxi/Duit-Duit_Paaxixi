// Konfigurasi publik aplikasi web dari Firebase Console (bukan password).
// Jangan pernah menaruh service account, password, atau data keuangan di repo publik.
// Firestore Security Rules harus dipublish sebelum memasukkan transaksi nyata.
window.ARUS_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBhgKrSQDWdVB2vq6HZ0y0sPixXlReVfas',
  authDomain: 'duit-duit-paaxixi.firebaseapp.com',
  projectId: 'duit-duit-paaxixi',
  storageBucket: 'duit-duit-paaxixi.firebasestorage.app',
  messagingSenderId: '862159080208',
  appId: '1:862159080208:web:41233c4fba56088e1e7395'
};

// Public reCAPTCHA Enterprise site key (NOT a secret).
// Firebase Console > App Check: register this GitHub Pages domain, then copy its site key.
// AI generation requires Firebase AI Logic enabled and App Check enforced.
window.ARUS_AI_APP_CHECK_SITE_KEY = '6LfX1vktAAAAACAOEw9YLUv1yG0YgJpJljqm0EM_';
