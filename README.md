# Packing Documentation System

Aplikasi dokumentasi packing fullstack menggunakan Nuxt 3, Tailwind CSS, Prisma ORM, dan PostgreSQL.

## 🎯 Fitur Utama

- ✅ **Autentikasi & Otorisasi** - JWT-based authentication dengan role-based access control (ADMIN, OPS, USER)
- ✅ **Manajemen User** - CRUD user dengan bulk import via CSV
- ✅ **Manajemen Store/Cabang** - Kelola toko dengan user assignment
- ✅ **Packing Documentation** - Record packing dengan:
  - Nomor invoice/barcode scanning
  - Foto before/after (max 5 each)
  - Timestamp otomatis
  - Catatan packing
- ✅ **Watermark pada Foto** - Admin dapat mengatur posisi:
  - Logo brand (top-left, top-center, top-right, bottom-left, bottom-center, bottom-right)
  - Alamat detail
  - Timestamp
- ✅ **Google Drive Integration** - Upload otomatis ke Google Drive dengan:
  - Queue system (5-second intervals)
  - Progress tracking
  - Retry mechanism
  - No Redis/BullMQ (lightweight)
- ✅ **Dashboard Analytics** - Stats packing, users, stores
- ✅ **History Tracking** - View semua packing records dengan filter & sort

## 🛠️ Tech Stack

- **Frontend**: Nuxt 3 (Vue 3), Tailwind CSS, VueUse
- **Backend**: Nitro (Nuxt Server Engine)
- **Database**: PostgreSQL dengan Prisma ORM
- **Authentication**: JWT dengan jose library
- **File Upload**: Google Drive API dengan custom queue processor
- **Barcode Scanner**: html5-qrcode
- **Validation**: Zod

## 🚀 Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Google Cloud Project dengan Drive API enabled

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/packing_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Google Drive (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REFRESH_TOKEN="your-google-refresh-token"
GOOGLE_DRIVE_FOLDER_ID="your-drive-folder-id"

# Upload
UPLOAD_TEMP_DIR="./uploads/temp"
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed
```

### Development

```bash
npm run dev
```

Buka http://localhost:3000

### Default Credentials

| Role  | Email             | Password |
| ----- | ----------------- | -------- |
| Admin | admin@packing.com | admin123 |
| OPS   | ops@packing.com   | ops123   |
| User  | user@packing.com  | user123  |

## 📁 Project Structure

```
├── app/
│   ├── assets/css/        # Global CSS & Tailwind
│   ├── components/        # Vue components
│   │   ├── ui/           # Reusable UI components
│   │   ├── scanner/      # Barcode scanner
│   │   └── packing/      # Packing-specific components
│   ├── composables/       # Vue composables
│   ├── layouts/           # Page layouts
│   ├── middleware/        # Route middleware
│   ├── pages/             # App pages
│   ├── schemas/           # Zod validation schemas
│   └── types/             # TypeScript types
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeder
├── server/
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication
│   │   ├── users/        # User management
│   │   ├── stores/       # Store management
│   │   ├── packing/      # Packing records
│   │   └── settings/     # App settings
│   ├── middleware/        # Server middleware
│   ├── plugins/           # Server plugins
│   └── utils/             # Server utilities
└── public/                # Static files
```

## 🔐 Role Permissions

| Feature          | ADMIN | OPS       | USER |
| ---------------- | ----- | --------- | ---- |
| Create Packing   | ✅    | ✅        | ✅   |
| View Own Packing | ✅    | ✅        | ✅   |
| View All Packing | ✅    | ✅        | ❌   |
| Manage Users     | ✅    | ❌        | ❌   |
| Manage Stores    | ✅    | View Only | ❌   |
| Settings         | ✅    | ❌        | ❌   |

## 📤 Google Drive Setup

1. Buat project di [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google Drive API
3. Buat OAuth 2.0 credentials
4. Generate refresh token menggunakan OAuth Playground
5. Masukkan credentials ke `.env`

## 📚 Documentation

Dokumentasi lengkap tersedia untuk membantu Anda memulai:

### 🚀 Getting Started

| Dokumen                            | Deskripsi                             | Waktu  |
| ---------------------------------- | ------------------------------------- | ------ |
| [QUICK_START.md](./QUICK_START.md) | 5-minute quick reference & navigation | 5 min  |
| [SETUP.md](./SETUP.md)             | Detailed step-by-step setup guide     | 15 min |

### 📖 Development

| Dokumen                                    | Deskripsi                                        | Waktu  |
| ------------------------------------------ | ------------------------------------------------ | ------ |
| [ARCHITECTURE.md](./ARCHITECTURE.md)       | System architecture, data flows, security layers | 20 min |
| [API_REFERENCE.md](./API_REFERENCE.md)     | Complete API endpoint documentation              | 20 min |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues & solutions                        | 30 min |

### 🚀 Deployment & Operations

| Dokumen                                        | Deskripsi                                  | Waktu  |
| ---------------------------------------------- | ------------------------------------------ | ------ |
| [DEPLOYMENT.md](./DEPLOYMENT.md)               | Production deployment (VPS, Docker, Cloud) | 30 min |
| [TESTING.md](./TESTING.md)                     | Testing strategies, examples, CI/CD setup  | 25 min |
| [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) | Feature inventory & technical summary      | 15 min |

**💡 Tip**: Mulai dengan QUICK_START.md, lalu baca dokumentasi yang relevan sesuai kebutuhan Anda.

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

Lihat [TESTING.md](./TESTING.md) untuk strategi testing lengkap.

## 📦 Production Build

```bash
# Build
npm run build

# Preview production build
npm run preview
```

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md) untuk panduan deployment production.

## 📝 Quick API Overview

Dokumentasi lengkap API ada di [API_REFERENCE.md](./API_REFERENCE.md)

### Authentication (3 endpoints)

- `POST /api/auth/login` - Login & get JWT token
- `POST /api/auth/logout` - Logout & invalidate token
- `GET /api/auth/me` - Get current user info

### Users (6 endpoints)

- `GET /api/users` - List users (paginated, role-based)
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (soft delete)
- `POST /api/users/bulk-import` - Bulk import users via CSV

### Stores (5 endpoints)

- `GET /api/stores` - List all stores (paginated)
- `POST /api/stores` - Create new store
- `GET /api/stores/:id` - Get store details
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store (with validation)

### Packing (6 endpoints)

- `GET /api/packing` - List packing records (paginated, filtered)
- `POST /api/packing` - Create packing record
- `GET /api/packing/:id` - Get packing details
- `PUT /api/packing/:id` - Update packing record
- `POST /api/packing/:id/upload` - Upload before/after images
- `GET /api/packing/upload-status` - Check upload progress

### Settings (3 endpoints)

- `GET /api/settings` - Get watermark & company settings
- `POST /api/settings` - Create settings (if not exists)
- `PUT /api/settings` - Update settings

### System (1 endpoint)

- `POST /api/init` - Initialize database with default data

**Total: 24 API endpoints** ✅

## 🎯 Common Tasks

### Start Development Server

```bash
npm run dev
# Open http://localhost:3001
```

### Initialize Database

```bash
# Via API
curl -X POST http://localhost:3001/api/init

# Or manually
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

### View Database

```bash
npx prisma studio
# Open http://localhost:5555
```

### Create Production Build

```bash
npm run build
npm run preview
```

### Check Migrations

```bash
npx prisma migrate status
```

## 📞 Support

Jika mengalami masalah:

1. Cek [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review [SETUP.md](./SETUP.md) untuk verifikasi setup
3. Check server logs: `npm run dev 2>&1 | tee app.log`
4. Test API: lihat contoh di [API_REFERENCE.md](./API_REFERENCE.md)

## 📄 License

MIT License

# yarn

yarn build

# bun

bun run build

````

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
````

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
