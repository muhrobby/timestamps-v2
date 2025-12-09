# Setup Google Drive dengan Service Account (Lebih Mudah!)

## Keuntungan Service Account:

✅ Tidak perlu OAuth flow yang rumit  
✅ Tidak perlu refresh token  
✅ Tidak ada expire token  
✅ Cukup 1 file JSON credential  
✅ Lebih cocok untuk server-side application

---

## Langkah-langkah Setup

### 1. Buat Service Account di Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Pilih atau buat project baru
3. Buka **APIs & Services** → **Library**
4. Cari dan aktifkan **Google Drive API**
5. Kembali ke **APIs & Services** → **Credentials**
6. Klik **Create Credentials** → **Service Account**
7. Isi detail:
   - **Service account name**: `packing-drive-uploader`
   - **Service account ID**: akan auto-generate
   - Klik **Create and Continue**
8. **Grant access** (optional, skip): Klik **Continue**
9. **Grant users access** (optional, skip): Klik **Done**

### 2. Download Service Account Key

1. Di halaman **Credentials**, cari service account yang baru dibuat
2. Klik service account tersebut
3. Tab **Keys** → **Add Key** → **Create new key**
4. Pilih **JSON**
5. Klik **Create**
6. File JSON akan ter-download otomatis
7. **Rename file** menjadi `service-account.json`
8. Pindahkan ke root project

### 3. Share Google Drive Folder dengan Service Account

1. Buka `service-account.json`, cari field `client_email`
   - Contoh: `packing-drive-uploader@project-id.iam.gserviceaccount.com`
2. Buka [Google Drive](https://drive.google.com/)
3. Buat folder baru: **"Packing Photos"**
4. Klik kanan folder → **Share**
5. Masukkan **email service account** (dari `client_email`)
6. Berikan akses **Editor**
7. Klik **Share**
8. Copy **Folder ID** dari URL:
   - URL: `https://drive.google.com/drive/folders/1H1fyGtIaaFBb8XZuwSDluf8PS9mLFRIO`
   - Folder ID: `1H1fyGtIaaFBb8XZuwSDluf8PS9mLFRIO`

### 4. Update Environment Variables

Edit `.env.local`:

```env
# Google Drive Configuration - Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL="packing-drive-uploader@project-id.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE....\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID="1H1fyGtIaaFBb8XZuwSDluf8PS9mLFRIO"

# Upload Configuration
UPLOAD_TEMP_DIR="./uploads/temp"
```

**Cara mendapatkan nilai dari `service-account.json`:**

```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "packing-drive-uploader@project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

Copy:

- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

⚠️ **PENTING untuk private_key:**

- Pastikan ada `\n` di string (newline)
- Jangan hilangkan `-----BEGIN PRIVATE KEY-----` dan `-----END PRIVATE KEY-----`
- Gunakan double quotes `"`

### 5. Test Setup

Jalankan script test:

```bash
node test-service-account.js
```

Jika berhasil, akan muncul:

```
✅ Service Account berhasil ter-autentikasi!
✅ Akses ke folder berhasil!
✅ Setup Google Drive sudah benar!
```

### 6. Restart Development Server

```bash
npm run dev
```

### 7. Test Upload

Buka aplikasi dan coba upload foto!

---

## Troubleshooting

### Error: "Invalid JWT Signature"

- Private key tidak lengkap atau rusak
- Pastikan copy seluruh private key termasuk header/footer
- Pastikan ada `\n` di string

### Error: "Folder not found" atau "Permission denied"

- Folder belum di-share dengan service account email
- Folder ID salah
- Service account belum diberi akses "Editor"

### Error: "Invalid service account"

- Email service account salah
- Service account tidak aktif di Google Cloud Console

---

## Perbandingan dengan OAuth

| Feature          | OAuth 2.0           | Service Account     |
| ---------------- | ------------------- | ------------------- |
| Setup            | Rumit (OAuth flow)  | Mudah (1 file JSON) |
| Token Management | Perlu refresh token | Tidak perlu         |
| Expire           | Token bisa expire   | Tidak expire        |
| User Interaction | Perlu login Google  | Tidak perlu         |
| Best For         | User-facing apps    | Server-side apps    |
| Security         | User-based          | App-based           |

**Rekomendasi:** Gunakan **Service Account** untuk aplikasi ini karena:

- Backend server yang upload
- Tidak perlu user login Google
- Lebih simple dan reliable

---

## Security Notes

1. ⚠️ **JANGAN** commit `service-account.json` ke git
2. ⚠️ **JANGAN** commit `.env.local` ke git
3. ✅ Add ke `.gitignore`:
   ```
   service-account.json
   .env.local
   ```
4. ✅ Untuk production, set environment variables di hosting platform
5. ✅ Gunakan secrets management di production

---

## Production Deployment

### Vercel / Netlify

Set environment variables di dashboard:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
GOOGLE_DRIVE_FOLDER_ID=xxx
```

### Docker

```yaml
environment:
  - GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx
  - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=xxx
  - GOOGLE_DRIVE_FOLDER_ID=xxx
```

Atau mount service-account.json:

```yaml
volumes:
  - ./service-account.json:/app/service-account.json:ro
```

---

## Monitoring

Check logs untuk status upload:

```
✅ Service Account authenticated
✅ Upload queue processor started
🔄 Processing upload for image: xxx
✅ Upload successful to Google Drive: filename.jpg
```

---

**✅ Setup selesai! Service Account lebih reliable untuk production.**
