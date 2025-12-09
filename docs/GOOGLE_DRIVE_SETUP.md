# Setup Google Drive Upload

## Langkah-langkah Setup Google Drive API

### 1. Buat Project di Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Klik **Select a project** → **New Project**
3. Beri nama project (misal: "Packing App")
4. Klik **Create**

### 2. Aktifkan Google Drive API

1. Di Google Cloud Console, buka **APIs & Services** → **Library**
2. Cari "Google Drive API"
3. Klik **Google Drive API**
4. Klik **Enable**

### 3. Buat OAuth 2.0 Credentials

1. Buka **APIs & Services** → **Credentials**
2. Klik **Create Credentials** → **OAuth client ID**
3. Jika diminta, konfigurasi **OAuth consent screen** terlebih dahulu:

   - Pilih **External** (atau Internal jika workspace)
   - Isi nama aplikasi: "Packing Documentation"
   - User support email: email Anda
   - Developer contact: email Anda
   - Klik **Save and Continue**
   - Di **Scopes**, klik **Add or Remove Scopes**
   - Tambahkan: `https://www.googleapis.com/auth/drive.file`
   - Klik **Update** → **Save and Continue**
   - Di **Test users**, tambahkan email Anda
   - Klik **Save and Continue**

4. Kembali ke **Credentials**, klik **Create Credentials** → **OAuth client ID**
5. Application type: **Desktop app**
6. Nama: "Packing App Desktop"
7. Klik **Create**
8. **Download JSON** file credentials (simpan sebagai `credentials.json`)

### 4. Dapatkan Refresh Token

Buat file `get-refresh-token.js` di root project:

```javascript
const { google } = require("googleapis");
const readline = require("readline");
const fs = require("fs");

// Load credentials dari file yang di-download
const credentials = JSON.parse(fs.readFileSync("./credentials.json"));

const { client_id, client_secret, redirect_uris } =
  credentials.installed || credentials.web;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// Scopes yang dibutuhkan
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("\n📌 LANGKAH 1: Buka URL ini di browser:");
console.log(authUrl);
console.log("\n📌 LANGKAH 2: Login dengan Google Account Anda");
console.log("📌 LANGKAH 3: Copy kode yang muncul\n");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Masukkan kode authorization: ", async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log("\n✅ Berhasil mendapatkan tokens!\n");
    console.log("Copy nilai-nilai ini ke file .env.local:\n");
    console.log('GOOGLE_CLIENT_ID="' + client_id + '"');
    console.log('GOOGLE_CLIENT_SECRET="' + client_secret + '"');
    console.log('GOOGLE_REFRESH_TOKEN="' + tokens.refresh_token + '"');
    console.log("\n📌 Simpan refresh_token dengan aman!\n");
  } catch (error) {
    console.error("❌ Error mendapatkan token:", error.message);
  }
  rl.close();
});
```

Jalankan:

```bash
node get-refresh-token.js
```

### 5. Buat Folder di Google Drive

1. Buka [Google Drive](https://drive.google.com/)
2. Buat folder baru (misal: "Packing Photos")
3. Klik kanan folder → **Share** → **Change to anyone with the link**
4. Copy URL folder
5. Ambil FOLDER_ID dari URL:
   - URL: `https://drive.google.com/drive/folders/1H1fyGtIaaFBb8XZuwSDluf8PS9mLFRIO`
   - FOLDER_ID: `1H1fyGtIaaFBb8XZuwSDluf8PS9mLFRIO`

### 6. Update .env.local

```env
# Google Drive Configuration
GOOGLE_CLIENT_ID="821514931170-xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxx"
GOOGLE_REFRESH_TOKEN="1//xxxxxxxxxxxxx"
GOOGLE_DRIVE_FOLDER_ID="1H1fyGtIaaFBb8XZuwSDluf8PS9mLFRIO"
```

⚠️ **PENTING**: Pastikan tidak ada prefix `GOOGLE_CLIENT_SECRET=` di dalam value

### 7. Test Upload

Restart development server:

```bash
npm run dev
```

Coba upload foto dari halaman Packing.

### Troubleshooting

#### Error: "Invalid Credentials"

- Pastikan GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET benar
- Pastikan tidak ada spasi atau karakter tambahan

#### Error: "Refresh token expired"

- Jalankan ulang `get-refresh-token.js` untuk mendapatkan refresh token baru

#### Error: "Folder not found"

- Pastikan GOOGLE_DRIVE_FOLDER_ID benar
- Pastikan folder sudah di-share dengan email yang digunakan OAuth

#### Error: "Insufficient permissions"

- Pastikan OAuth scope mencakup: `https://www.googleapis.com/auth/drive.file`
- Re-generate refresh token dengan scope yang benar

### Struktur Folder di Google Drive

Aplikasi akan membuat struktur:

```
Packing Photos/
  └── NamaToko/
      └── 2024-01/
          └── INV001_20240115_143022/
              ├── BEFORE_001.jpg
              ├── BEFORE_002.jpg
              ├── AFTER_001.jpg
              └── AFTER_002.jpg
```

### Security Notes

1. ⚠️ **JANGAN** commit file `credentials.json` ke git
2. ⚠️ **JANGAN** commit `.env.local` ke git
3. ✅ Gunakan `.env.local` untuk development
4. ✅ Set environment variables di production server
5. ✅ Gunakan Google Cloud Project terpisah untuk production

### Production Deployment

Untuk production, set environment variables di hosting platform:

**Vercel/Netlify:**

```bash
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REFRESH_TOKEN=xxx
GOOGLE_DRIVE_FOLDER_ID=xxx
```

**Docker:**

```yaml
environment:
  - GOOGLE_CLIENT_ID=xxx
  - GOOGLE_CLIENT_SECRET=xxx
  - GOOGLE_REFRESH_TOKEN=xxx
  - GOOGLE_DRIVE_FOLDER_ID=xxx
```

### Monitoring Upload

Check logs di console browser atau server logs untuk melihat status upload:

```
✅ Upload queue processor started
🔄 Processing upload for image: xxx
✅ Upload successful: filename.jpg
```
