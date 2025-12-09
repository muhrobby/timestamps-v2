# Troubleshooting Guide

Panduan lengkap untuk mengatasi masalah umum yang mungkin terjadi saat mengembangkan, menjalankan, atau mendeploy aplikasi Packing Documentation System.

---

## 📋 Table of Contents

1. [Setup Issues](#setup-issues)
2. [Database Problems](#database-problems)
3. [Server Issues](#server-issues)
4. [API Problems](#api-problems)
5. [Authentication Issues](#authentication-issues)
6. [Upload & Google Drive](#upload--google-drive)
7. [Frontend Issues](#frontend-issues)
8. [Performance & Optimization](#performance--optimization)
9. [Deployment Issues](#deployment-issues)
10. [Quick Diagnostics](#quick-diagnostics)

---

## Setup Issues

### Problem: "npm ERR! peer dep missing: zod"

**Cause**: Version conflict between h3-zod (needs zod@3.21.0) and project's zod version (4.x)

**Solution**:

```bash
npm install --legacy-peer-deps
```

**Why it works**: Allows npm to bypass peer dependency requirements while maintaining functionality.

---

### Problem: "Module not found: '@/types'"

**Cause**: Path alias not configured in tsconfig.json

**Solution**:
Check tsconfig.json:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "~/*": ["./*"]
    }
  }
}
```

Restart dev server:

```bash
npm run dev
```

---

### Problem: "PostgreSQL connection refused"

**Cause**: Database server not running

**Solution**:

**On Linux/macOS**:

```bash
# Check if PostgreSQL is running
pg_isready -h localhost

# If not running, start it
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux

# Or if using Docker
docker run -d \
  -e POSTGRES_USER=packing \
  -e POSTGRES_PASSWORD=packing123 \
  -e POSTGRES_DB=packing_db \
  -p 5432:5432 \
  postgres:15
```

**On Windows**:

- Open Services app (services.msc)
- Find "PostgreSQL Server"
- Right-click → Start
- Or use pgAdmin GUI

---

### Problem: ".env.local not loading"

**Cause**: File not in correct location or wrong format

**Solution**:

1. Verify file exists in project root:

```bash
ls -la .env.local  # Should exist
```

2. Check format:

```bash
# Should be: KEY=value
cat .env.local
```

3. Restart dev server after creating/modifying:

```bash
npm run dev
```

---

## Database Problems

### Problem: "Migration failed: relation 'users' does not exist"

**Cause**: Migration not applied or database not initialized

**Solution**:

```bash
# Check migration status
npx prisma migrate status

# If migrations are pending, apply them
npx prisma migrate deploy

# Or reset for development (WARNING: deletes data)
npx prisma migrate reset --force

# Then initialize data
curl -X POST http://localhost:3001/api/init
```

---

### Problem: "PrismaClientInitializationError"

**Cause**: DATABASE_URL not set or invalid

**Solution**:

```bash
# Verify DATABASE_URL
echo $DATABASE_URL

# Should output something like:
# postgresql://user:password@localhost:5432/dbname?schema=public

# If empty, set it
export DATABASE_URL="postgresql://packing:packing123@localhost:5432/packing_db?schema=public"

# Or create .env.local
echo 'DATABASE_URL="postgresql://packing:packing123@localhost:5432/packing_db?schema=public"' > .env.local

# Regenerate Prisma Client
npx prisma generate

# Restart server
npm run dev
```

---

### Problem: "Unique constraint failed on email"

**Cause**: User already exists in database

**Solution**:

```bash
# Option 1: Reset database (development only)
npx prisma migrate reset --force

# Option 2: Delete specific user via SQL
npx prisma db execute
# Then:
# DELETE FROM "User" WHERE email = 'admin@packing.com';

# Option 3: Use API to delete user (requires auth)
curl -X DELETE http://localhost:3001/api/users/[user-id] \
  -H "Authorization: Bearer [token]"
```

---

### Problem: "connection limit exceeded"

**Cause**: Too many database connections open

**Solution**:

```bash
# Check connection pool in prisma.config.ts
# Add or adjust connection limits

# Or in .env.local:
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=10"

# Restart services
npm run dev
```

---

## Server Issues

### Problem: "Port 3000 already in use"

**Cause**: Another application using port 3000

**Solution**:

```bash
# Option 1: Kill process using port 3000
lsof -i :3000  # Find PID
kill -9 [PID]

# Option 2: Use different port
PORT=3001 npm run dev

# Option 3: Check nuxt.config.ts
# Make sure devServer configuration is correct:
# export default defineNuxtConfig({
#   devServer: {
#     port: 3001
#   }
# })
```

---

### Problem: "Cannot find module 'nitro'"

**Cause**: Dependencies not installed

**Solution**:

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Then run
npm run dev
```

---

### Problem: "Vite cache corruption"

**Cause**: Build cache corrupted

**Solution**:

```bash
# Clear caches
rm -rf .nuxt .output node_modules/.vite

# Reinstall and rebuild
npm install
npm run build

# Or for dev
npm run dev
```

---

### Problem: "getaddrinfo ENOTFOUND" when calling external APIs

**Cause**: Network/DNS issue or wrong API endpoint

**Solution**:

```bash
# Test network connectivity
curl https://www.google.com

# Check DNS
nslookup google.com

# Verify API endpoint in code
# Check server/utils/google-drive.ts

# Test with direct curl
curl -v "https://www.googleapis.com/oauth2/v4/token" \
  -d "code=..." \
  -d "client_id=..." \
  -d "client_secret=..."
```

---

## API Problems

### Problem: "401 Unauthorized on API call"

**Cause**: Invalid or missing JWT token

**Solution**:

```bash
# 1. Check if token exists in localStorage
# Open browser console:
localStorage.getItem('auth_token')

# 2. If missing, login again
# GET /login page
# Submit credentials

# 3. Check token format
# Should include: Bearer [token]

# 4. Check token expiration
# Default: 7 days
# Tokens expire, need re-login

# 5. Verify token is sent in headers
# Network tab → check Authorization header
```

---

### Problem: "403 Forbidden - Insufficient permissions"

**Cause**: User role doesn't have access

**Solution**:

```bash
# Check user role
# 1. GET /api/auth/me endpoint
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer [token]"

# 2. Verify role matches endpoint requirement
# ADMIN: All endpoints
# OPS: Read most, limited write
# USER: Own records only

# 3. Use admin account to test
# Email: admin@packing.com
# Password: admin123

# 4. Check role-based guards in API routes
# Look for: requireAdmin(), requireAdminOrOps()
```

---

### Problem: "400 Bad Request - Validation failed"

**Cause**: Invalid request data

**Solution**:

```bash
# Check request body
# 1. Verify all required fields present
# 2. Check field types match schema
# 3. Verify format (email, date, etc.)

# Example:
# Wrong:
{
  "email": "user@test",  // Missing .com
  "name": 123            // Should be string
}

# Correct:
{
  "email": "user@test.com",
  "name": "John Doe"
}

# Test with curl
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [token]" \
  -d '{
    "email": "user@test.com",
    "name": "John Doe",
    "password": "password123",
    "role": "USER",
    "storeId": "store-id"
  }'
```

---

### Problem: "500 Internal Server Error"

**Cause**: Server-side error, check logs

**Solution**:

```bash
# 1. Check server console output
# Look for error messages and stack traces

# 2. Check database connection
npx prisma db execute
# If this fails, database issue

# 3. Check environment variables
echo $DATABASE_URL
echo $GOOGLE_DRIVE_API_KEY

# 4. Check server logs (if deployed)
# PM2: pm2 logs
# Docker: docker logs [container-id]

# 5. Enable verbose logging
# In server route, add console.log

# 6. Check for uncaught exceptions
# Add error boundary in Nitro middleware
```

---

### Problem: "API timeout - request hanging"

**Cause**: Slow database query, external API latency, or infinite loop

**Solution**:

```bash
# 1. Check if database is responsive
npx prisma studio  # Opens UI to inspect data

# 2. Analyze slow queries
# Add console.time() in route:
console.time('query')
const users = await prisma.user.findMany()
console.timeEnd('query')

# 3. Add request timeout
// In server middleware:
defineEventHandler(async (event) => {
  const timeout = setTimeout(() => {
    throw createError('Request timeout')
  }, 30000)

  await executeHandler(event)
  clearTimeout(timeout)
})

# 4. Check external API (Google Drive)
# May be rate limited or down
# Check Google Drive API status
```

---

## Authentication Issues

### Problem: "Token expired - need to login again"

**Cause**: JWT token older than 7 days

**Solution**:

```bash
# This is expected behavior
# User must login again:
# 1. Redirect to /login
# 2. Enter credentials
# 3. Get new token

# To change token expiry:
# Edit server/utils/auth-middleware.ts
// Change: const expiresIn = '7d'
//     to: const expiresIn = '30d'

# Redeploy application
```

---

### Problem: "Password not hashing correctly"

**Cause**: bcryptjs configuration issue

**Solution**:

```bash
# Verify bcryptjs version
npm list bcryptjs

# Should be 2.4.3+

# Check hashing in server/api/auth/login.post.ts
// Should use:
import bcryptjs from 'bcryptjs'
const hashedPassword = await bcryptjs.hash(password, 12)
const isValid = await bcryptjs.compare(inputPassword, storedHash)

# Verify saltRounds = 12
# (higher = slower but more secure)
```

---

### Problem: "CORS error when authenticating"

**Cause**: CORS policy blocking credentials

**Solution**:

```bash
# In nuxt.config.ts, verify nitro config:
export default defineNuxtConfig({
  nitro: {
    prerender: {
      crawlLinks: false,
    },
  },
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
})

# Or add middleware:
// server/middleware/cors.ts
export default defineEventHandler((event) => {
  setHeader(event, 'Access-Control-Allow-Origin', '*')
  setHeader(event, 'Access-Control-Allow-Methods', '*')
  setHeader(event, 'Access-Control-Allow-Headers', '*')
})
```

---

## Upload & Google Drive

### Problem: "Images not uploading to Google Drive"

**Cause**: Authentication issue, API rate limit, or network error

**Solution**:

```bash
# 1. Check Google Drive credentials
# Verify in .env.local:
GOOGLE_DRIVE_API_KEY=[key]
GOOGLE_DRIVE_CLIENT_ID=[id]
GOOGLE_DRIVE_CLIENT_SECRET=[secret]

# 2. Check queue status
# Database → UploadQueue table
# Status should: PENDING → UPLOADING → COMPLETED

# 3. Check upload queue processor
# Runs every 5 seconds
# Check server/utils/google-drive.ts

# 4. Enable debug logging
// In google-drive.ts:
console.log('Processing upload queue...')
console.log('Found uploads:', pendingUploads.length)

# 5. Check Google Drive API quota
# Visit: https://console.cloud.google.com/
# Check Daily Quota
```

---

### Problem: "Upload progress stuck at 50%"

**Cause**: Upload process interrupted

**Solution**:

```bash
# 1. Check upload status
GET /api/packing/upload-status

# 2. Verify temp files exist
ls /tmp/packing-uploads/ 2>/dev/null

# 3. Check UploadQueue record
# Status should be COMPLETED
# Check uploadError field for details

# 4. Manual retry
// Reset in database:
UPDATE upload_queue
SET status = 'PENDING', attempts = 0
WHERE id = '[upload-id]'

# 5. Clear stuck uploads
DELETE FROM upload_queue
WHERE status = 'UPLOADING'
AND updated_at < NOW() - INTERVAL 1 HOUR
```

---

### Problem: "File too large for upload"

**Cause**: Image exceeds size limits

**Solution**:

```bash
# Check file size limits
// In ImageUploader.vue:
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

# Compress before upload:
// Use sharp or image-optimizer
npm install sharp

// Then resize:
const sharp = require('sharp')
sharp(imagePath)
  .resize(1920, 1440, { fit: 'inside' })
  .toFile(outputPath)
```

---

### Problem: "Google Drive API quota exceeded"

**Cause**: Too many requests in short time

**Solution**:

```bash
# 1. Wait for quota reset (usually 24 hours)

# 2. Implement rate limiting
// In server/utils/google-drive.ts:
const delay = ms => new Promise(r => setTimeout(r, ms))
await delay(100) // Wait 100ms between uploads

# 3. Upgrade Google Drive API quota:
# Visit: https://console.cloud.google.com/
# Quotas section → Request increase

# 4. Implement queue priority
// Prioritize important uploads
// Lower priority for batch uploads
```

---

## Frontend Issues

### Problem: "Barcode scanner not working"

**Cause**: Camera permission denied or library issue

**Solution**:

```bash
# 1. Check camera permission
// In browser console:
navigator.permissions.query({ name: 'camera' })

# 2. Grant permission:
# Browser → Settings → Site settings → Camera
# Allow camera for localhost:3001

# 3. Check html5-qrcode library
npm list html5-qrcode
# Should be 2.3.8+

# 4. Verify scanner component
// BarcodeScanner.vue should have:
import { Html5QrcodeScanner } from "html5-qrcode"

# 5. Test scanner manually
// Visit /packing page
// Look for "Scan Barcode" button
// Click to open camera modal
```

---

### Problem: "Toast notifications not showing"

**Cause**: Composable not initialized or z-index issue

**Solution**:

```bash
# 1. Verify useToast composable
// In component:
const { success, error } = useToast()
success('Message') // Should show

# 2. Check toast CSS
// Verify Tailwind classes applied
// Check z-index in Toast.vue

# 3. Browser console check
// No JavaScript errors?
// Open DevTools → Console tab

# 4. Check Toast.vue z-index
// Should be: class="fixed z-50 top-4 right-4"

# 5. Rebuild Tailwind
npm run build
```

---

### Problem: "DataTable not sorting correctly"

**Cause**: Comparator function issue

**Solution**:

```bash
# 1. Check sortable column config
// DataTable.vue sortable option:
{
  key: 'email',
  label: 'Email',
  sortable: true  // Enable sorting
}

# 2. Verify data types
// Numbers should be numbers
// Dates should be Date objects
// Don't mix types in same column

# 3. Check sort handler
// DataTable.vue @sort event
// Verify sorting logic for each type

# 4. Example for date sorting:
if (column.key === 'packedAt') {
  return new Date(a.packedAt) - new Date(b.packedAt)
}
```

---

### Problem: "Image preview not showing"

**Cause**: File reader issue or image path wrong

**Solution**:

```bash
# 1. Check ImageUploader.vue
// Should use FileReader API:
const reader = new FileReader()
reader.onload = (e) => {
  preview.value = e.target.result
}

# 2. Verify image format
// Supported: JPEG, PNG, WebP
// Check file type validation

# 3. Check browser console
// Any CORS errors?
// Permission errors?

# 4. Test with small image first
// Large images may take time to load
// Check file size limits
```

---

### Problem: "Page stuck loading indefinitely"

**Cause**: API call not returning, network issue

**Solution**:

```bash
# 1. Check Network tab (DevTools)
// See pending requests
// Check response status
// Look for 504 Gateway Timeout

# 2. Check server console
// Is server still running?
// Are there errors?

npm run dev  # Restart if needed

# 3. Add timeout to API call
// In useApi composable:
const timeout = 30000  // 30 seconds
// Throw error if exceeded

# 4. Check browser network
// Try disabling VPN/Proxy
// Check firewall rules
```

---

## Performance & Optimization

### Problem: "Page loads slowly"

**Cause**: Large bundle size, slow database queries, or network latency

**Solution**:

```bash
# 1. Analyze bundle size
npm run build
# Check .nuxt/dist output size

# 2. Check page load time
// Browser DevTools → Performance tab
// Identify bottleneck

# 3. Optimize images
// Use webp format
// Compress before upload
// Lazy load images

# 4. Database optimization
// Add indexes
// Avoid N+1 queries
// Use pagination

# 5. Enable caching
// See DEPLOYMENT.md for caching strategies
```

---

### Problem: "High memory usage"

**Cause**: Memory leak or large dataset in memory

**Solution**:

```bash
# 1. Monitor memory
// Linux: free -h
// Windows: Task Manager

# 2. Check for memory leaks
// Browser DevTools → Memory tab
// Take heap snapshot
// Look for detached DOM nodes

# 3. Implement pagination
// Don't load all records at once
// Fetch in chunks

# 4. Clear cache periodically
// In useApi composable:
const cacheExpiry = 5 * 60 * 1000  // 5 minutes

# 5. Use async/await properly
// Avoid accumulating promises
// Clean up after operations
```

---

## Deployment Issues

### Problem: "Build fails with 'Cannot find module' error"

**Cause**: Dependencies not installed properly

**Solution**:

```bash
# 1. Clean install on production
rm -rf node_modules package-lock.json
npm ci --legacy-peer-deps

# 2. Or use npm install
npm install --legacy-peer-deps --production

# 3. Build again
npm run build

# 4. Check for TypeScript errors
npx tsc --noEmit

# 5. Check production dependencies
package.json should list all needed packages in "dependencies"
```

---

### Problem: "Environment variables not loading in production"

**Cause**: .env file not copied or wrong format

**Solution**:

```bash
# 1. Verify .env.production exists
ls -la .env.production

# 2. Check format
cat .env.production
# Should be: KEY=value (no quotes usually)

# 3. Pass as environment variables
# Option A: Set before start
DATABASE_URL="..." npm start

# Option B: Set in system
export DATABASE_URL="..."
export GOOGLE_DRIVE_API_KEY="..."
npm start

# Option C: Use .env file
# Make sure app reads it on startup
// Check nuxt.config.ts and server routes

# 4. Restart application
pm2 restart app-name
```

---

### Problem: "Application crashes after deploy"

**Cause**: Database migration not applied, missing dependencies, or runtime error

**Solution**:

```bash
# 1. Check application logs
# PM2: pm2 logs app-name
# Docker: docker logs container-id

# 2. Apply pending migrations
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate

# 4. Verify environment variables
echo $DATABASE_URL
env | grep -i database

# 5. Test locally first
npm run build
npm run preview  # Test production build locally

# 6. Rollback if needed
# Keep backup of previous version
# Revert to previous commit
git revert [commit-hash]
```

---

### Problem: "Database connection pool exhausted"

**Cause**: Too many concurrent connections

**Solution**:

```bash
# 1. Check current connections
psql -c "SELECT count(*) as connections FROM pg_stat_activity;"

# 2. Increase connection limit
// In .env:
DATABASE_URL="postgresql://...?connection_limit=20"

# 3. Reduce active connections
// Close idle connections
// Use connection pooling (PgBouncer)

# 4. Kill stuck connections
// In production:
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';"
```

---

## Quick Diagnostics

### Health Check Script

```bash
#!/bin/bash
# Save as: health-check.sh
# Run: bash health-check.sh

echo "=== Health Check ==="

# Check Node.js
echo -n "Node.js: "
node --version

# Check npm
echo -n "npm: "
npm --version

# Check PostgreSQL
echo -n "PostgreSQL: "
pg_isready -h localhost

# Check environment variables
echo "Database URL: ${DATABASE_URL:0:50}..."

# Check dependencies
echo "Checking npm packages..."
npm list --depth=0 | head -20

# Check Prisma
echo -n "Prisma Client: "
npx prisma --version

# Check port availability
echo -n "Port 3001: "
if lsof -i :3001 > /dev/null; then
  echo "In use"
else
  echo "Available"
fi

echo "=== End Health Check ==="
```

### Diagnostic Commands

```bash
# View all logs
npm run dev 2>&1 | tee app.log

# Check database
npx prisma studio

# Validate schema
npx prisma validate

# Check migrations status
npx prisma migrate status

# List all environment variables
env | grep -i database

# Test API endpoint
curl -v http://localhost:3001/api/auth/me

# Check file permissions
ls -la
```

---

## Common Error Messages

| Error                                        | Cause                  | Solution                                    |
| -------------------------------------------- | ---------------------- | ------------------------------------------- |
| `EADDRINUSE: address already in use :::3000` | Port 3000 in use       | Use different port: `PORT=3001 npm run dev` |
| `PrismaClientInitializationError`            | DATABASE_URL not set   | Set env var: `export DATABASE_URL="..."`    |
| `ECONNREFUSED 127.0.0.1:5432`                | PostgreSQL not running | Start: `brew services start postgresql`     |
| `Module not found: @/types`                  | Path alias issue       | Restart dev server                          |
| `Unique constraint failed on email`          | Duplicate user         | Reset: `npx prisma migrate reset --force`   |
| `401 Unauthorized`                           | Invalid token          | Login again to get new token                |
| `403 Forbidden`                              | Insufficient role      | Use admin account                           |
| `400 Bad Request`                            | Invalid data           | Check request body format                   |
| `500 Internal Server Error`                  | Server error           | Check server logs                           |
| `CORS error`                                 | CORS policy blocking   | Add CORS headers in middleware              |

---

## Getting Help

If you encounter an issue not listed here:

1. **Check the logs**

   ```bash
   npm run dev 2>&1 | tee debug.log
   ```

2. **Review documentation**

   - SETUP.md - Installation steps
   - API_REFERENCE.md - API endpoints
   - ARCHITECTURE.md - System design

3. **Test in isolation**

   - Use curl to test APIs
   - Use browser console to test frontend
   - Use Prisma Studio to test database

4. **Search error message**

   - Google the error
   - Check GitHub issues
   - Check Nuxt/Prisma documentation

5. **Create minimal reproduction**
   - Isolate the problem
   - Document steps to reproduce
   - Share code snippet

---

**Last Updated**: December 9, 2025  
**Version**: 1.0.0
