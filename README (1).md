# Kirana

Chat, voice chat, dan telepon dengan karakter AI bernama Kirana. Murni HTML, CSS, dan JavaScript tanpa backend.

## Deploy ke GitHub Pages

1. Buat repository baru di GitHub, lalu upload `index.html`, `style.css`, `app.js`.
2. Buka Settings, Pages, pilih branch `main` dan folder `/ (root)`, lalu Save.
3. Tunggu satu sampai dua menit, situs aktif di `https://username.github.io/nama-repo/`.

## Menyambungkan AI

Buka situsnya, tekan tombol pengaturan di pojok kanan atas, pilih penyedia, dan tempel API key.

- **Google Gemini:** buat key gratis di aistudio.google.com.
- **Claude:** buat key di console.anthropic.com (perlu saldo).

Key disimpan hanya di browser pemakai. Jangan menulis key langsung di `app.js`, karena repository publik bisa dibaca siapa saja.

## Catatan

- Pengenalan suara jalan paling baik di Chrome atau Edge (Android dan desktop). Safari iPhone dukungannya terbatas.
- Situs harus dibuka lewat HTTPS (GitHub Pages sudah HTTPS) supaya mikrofon bisa dipakai.
- Tanpa key, Kirana berjalan dalam mode demo dengan balasan tetap.
- Telepon di sini adalah panggilan suara lewat browser, bukan ke nomor HP.
