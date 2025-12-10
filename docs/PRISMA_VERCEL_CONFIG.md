# Prisma Configuration untuk Vercel Deployment

## Perubahan yang Dilakukan

### 1. **Named Import → ESM Import**
File: `server/utils/prisma.ts` dan `prisma/seed.ts`

```typescript
// ✅ Correct - ESM named imports
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
```

**Alasan**: Vercel environment menggunakan Node.js ESM yang native mendukung named imports dari Prisma v7. Approach default import tidak perlu digunakan.

### 2. **Connection Pool Management**
- PostgreSQL adapter dengan `Pool` dari `pg` package
- Graceful shutdown untuk production environment
- Singleton pattern untuk PrismaClient di development

### 3. **Build Script Update**
File: `package.json`

```json
"build": "prisma generate && nuxt build",
"postinstall": "nuxt prepare && prisma generate"
```

**Alasan**: Memastikan Prisma client di-generate sebelum build, mencegah "PrismaClient not found" errors.

### 4. **NPM Configuration**
File: `.npmrc`

```properties
legacy-peer-deps=true
engine-strict=false
```

**Alasan**: Mengatasi peer dependency conflict antara zod@4 dan h3-zod@0.5.3.

## Environment Requirements

Pastikan di Vercel environment variables sudah diset:
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - set ke `production`
- Semua environment variables lain (JWT_SECRET, Google Drive, dll)

## Testing

```bash
# Local development
npm run dev

# Local production build
npm run build
npm run preview

# Seed database (jika diperlukan)
npx prisma db seed
```

## Troubleshooting

Jika masih ada error di Vercel:

1. **Clear build cache di Vercel** - Settings → Deployments → Clear All
2. **Re-run deployment** setelah semua perubahan di-push
3. **Check Vercel logs** untuk error yang lebih detail

## References

- https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/postgresql
- https://www.prisma.io/docs/reference/database-reference/connection-urls/postgresql
- https://www.prisma.io/docs/concepts/components/prisma-client
