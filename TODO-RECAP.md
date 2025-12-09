# 📋 Rekap Todo List - Progress & Planning

**Status**: 4/10 Tasks Selesai ✅  
**Progress**: 40% Complete  
**Last Update**: December 10, 2025

---

## 📊 Overview

| # | Task | Status | Priority | Est. Time |
|---|------|--------|----------|-----------|
| 1 | Google Drive Folder Hierarchy | ✅ Done | P0 | - |
| 2 | Design System & Theme | ✅ Done | P0 | - |
| 3 | Packing Page Flow Improvement | ✅ Done | P0 | - |
| 4 | Dashboard & Navigation | ✅ Done | P0 | - |
| 5 | CRUD Users - Backend API | ⏳ Pending | P1 | 4-6 hrs |
| 6 | CRUD Users - Frontend UI | ⏳ Pending | P1 | 3-4 hrs |
| 7 | CRUD Stores - Backend API | ⏳ Pending | P1 | 3-4 hrs |
| 8 | CRUD Stores - Frontend UI | ⏳ Pending | P1 | 3-4 hrs |
| 9 | Settings Page Redesign | ⏳ Pending | P2 | 2-3 hrs |
| 10 | Testing & QA | ⏳ Pending | P0 | 5-8 hrs |

---

## ✅ Completed Tasks (4)

### 1. Google Drive Folder Hierarchy ✅
**Status**: Completed  
**Description**: Implementasi struktur folder Google Drive dengan auto-increment dan proper naming

**Deliverables**:
- ✅ Folder structure: `[Root]/[StoreCode-StoreName]/[YYYY-MM]/[Invoice_YYYYMMDD_HHMMSS]/`
- ✅ Auto-increment `displayOrder` for each photo
- ✅ Filename format: `before_1.jpg`, `after_2.jpg`, etc.
- ✅ Server utils: `server/utils/google-drive.ts`
- ✅ API integration ready

**GitHub**: Main branch  
**Files Modified**: ~5 files

---

### 2. Design System & Theme ✅
**Status**: Completed  
**Description**: Modernisasi design system dengan CSS variables dan component variants

**Deliverables**:
- ✅ 38 CSS variables (colors, spacing, typography, shadows, animations)
- ✅ 14 UI component types (Button, Input, Modal, DataTable, etc.)
- ✅ 35+ component variants (sizes, colors, states)
- ✅ Gradient backgrounds dan smooth animations
- ✅ Tailwind CSS integration
- ✅ Dark mode ready

**GitHub**: Main branch  
**Files**: `app/assets/css/main.css`, `tailwind.config.ts`

---

### 3. Packing Page Flow Improvement ✅
**Status**: Completed (+ Recent UX Improvements)  
**Description**: 4-step wizard dengan auto-save photos dan simplified buttons

**Deliverables**:
- ✅ 4-step wizard: Invoice → Before → After → Review
- ✅ PhotoGrid component dengan reorder functionality
- ✅ StepWizard progress indicator
- ✅ StatsCards untuk summary
- ✅ **NEW**: Simplified 3-button layout (Batal, Simpan Draft, Upload & Selesaikan)
- ✅ **NEW**: Auto-save photos tanpa modal confirmation
- ✅ **NEW**: Continuous camera sampai 5 foto
- ✅ **NEW**: Auto-reset form setelah upload
- ✅ Live photo counter display
- ✅ Upload progress tracking

**GitHub**: Main branch  
**Files**: `app/pages/packing.vue`, `app/components/packing/*`

---

### 4. Dashboard & Navigation ✅
**Status**: Completed  
**Description**: Modernisasi dashboard dengan sidebar dan enhanced statistics

**Deliverables**:
- ✅ 10+ statistics cards
- ✅ Sidebar navigation dengan role-based menu
- ✅ Breadcrumb navigation
- ✅ User dropdown dengan settings & logout
- ✅ Responsive design (mobile-first)
- ✅ Enhanced layout dengan gradient backgrounds
- ✅ Loading states dan transitions

**GitHub**: Main branch  
**Files**: `app/pages/dashboard.vue`, `app/components/ui/*`

---

## ⏳ Pending Tasks (6)

### 5. CRUD Users - Backend API ⏳
**Status**: Not Started  
**Priority**: P1 (High)  
**Est. Time**: 4-6 hours

**Requirements**:
```
Implementasi API endpoints lengkap untuk user management:

GET /api/users
  - List users dengan pagination
  - Search by name/email
  - Filter by role/store
  - Sorting (createdAt, name, email)
  - Response: { data, pagination, total, filters }

POST /api/users
  - Create user baru
  - Password hashing (bcrypt)
  - Email validation & uniqueness check
  - Default role assignment
  - Response: { id, name, email, role, createdAt }

PUT /api/users/:id
  - Update user info (name, email, role, store)
  - Password update dengan verification lama
  - Validation Zod schemas
  - Response: { message, data }

DELETE /api/users/:id
  - Soft delete (soft_delete_at flag)
  - Preserve historical data
  - Response: { message, deletedAt }

ADDITIONAL ENDPOINTS:
  - POST /api/users/bulk-import (CSV import)
  - GET /api/users/[id] (single user detail)
  - PUT /api/users/[id]/password (password reset)
```

**Tech Stack**:
- Nitro API routes
- Prisma ORM
- Zod validation
- bcryptjs for password hashing

**Database Schema**:
```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  password      String    @db.Text
  role          String    @default("user")
  store         String?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
}
```

**Files to Create**:
- `server/api/users/index.get.ts` - List users
- `server/api/users/index.post.ts` - Create user
- `server/api/users/[id]/index.get.ts` - Get user
- `server/api/users/[id]/index.put.ts` - Update user
- `server/api/users/[id]/index.delete.ts` - Delete user
- `app/schemas/user.ts` - Zod schemas
- `server/utils/user.ts` - User utilities

**Testing Checklist**:
- [ ] GET /api/users - list, pagination, search, filter
- [ ] POST /api/users - create dengan validation
- [ ] PUT /api/users/:id - update semua field
- [ ] DELETE /api/users/:id - soft delete verification
- [ ] Password hashing verification
- [ ] Email uniqueness check
- [ ] Error handling for edge cases

---

### 6. CRUD Users - Frontend UI ⏳
**Status**: Not Started  
**Priority**: P1 (High)  
**Est. Time**: 3-4 hours

**Requirements**:
```
Halaman /users dengan modern data management interface:

FEATURES:
1. Data Table
   - Columns: Name, Email, Role, Store, Status, CreatedAt, Actions
   - Sorting (click column header)
   - Pagination (10, 25, 50 items per page)
   - Row actions: Edit, Delete, View Details

2. Search & Filter
   - Search box by name/email (real-time)
   - Filter dropdowns: Role, Store, Status
   - Clear filters button
   - Active filters badge

3. Modal Forms
   - Create User Modal
     - Name, Email, Password, Role select, Store select
     - Form validation
     - Submit button dengan loading state
   
   - Edit User Modal
     - Pre-fill all fields
     - Optional password change
     - Role reassignment
     - Store reassignment
   
   - Delete Confirmation Dialog
     - Show user details before delete
     - Soft delete warning
     - Confirm button with loading

4. Status Badges
   - Active (green)
   - Inactive (gray)
   - Deleted (red strikethrough)

5. Role Badges
   - Admin (red)
   - Manager (orange)
   - User (blue)
   - Operator (green)

6. Bulk Actions
   - Select multiple users
   - Bulk delete (soft delete)
   - Bulk role change
   - Bulk export (CSV)

RESPONSIVE:
- Desktop: Full table view
- Tablet: Collapsed columns, card view for details
- Mobile: Card-based layout, swipe for actions
```

**Components to Create/Update**:
- `app/pages/users.vue` - Main page
- `app/components/users/UserTable.vue` - Data table
- `app/components/users/UserForm.vue` - Create/Edit form
- `app/components/users/UserFilterBar.vue` - Search & filters
- `app/components/users/DeleteConfirmDialog.vue` - Delete confirmation

**State Management**:
- Users list (reactive)
- Selected user for edit
- Filter state (role, store, status)
- Search query
- Pagination state
- Loading & error states

**Testing Checklist**:
- [ ] Table renders correctly with data
- [ ] Sorting works on all columns
- [ ] Pagination navigates correctly
- [ ] Search filters in real-time
- [ ] Create form submits correctly
- [ ] Edit form updates user
- [ ] Delete confirmation shows
- [ ] Delete removes from list
- [ ] Mobile responsive layout
- [ ] Error messages display

---

### 7. CRUD Stores - Backend API ⏳
**Status**: Not Started  
**Priority**: P1 (High)  
**Est. Time**: 3-4 hours

**Requirements**:
```
Implementasi API endpoints untuk store management:

GET /api/stores
  - List stores dengan pagination
  - Search by storeCode/name
  - Filter by region/status
  - Sorting
  - Response: { data, pagination }

POST /api/stores
  - Create store baru
  - Auto-generate storeCode (format: STR-YYYYMM-001)
  - Address, contact validation
  - Google Drive folder creation
  - Response: { id, storeCode, name, createdAt }

PUT /api/stores/:id
  - Update store info
  - Prevent storeCode change
  - Update Google Drive settings
  - Response: { message, data }

DELETE /api/stores/:id
  - Soft delete dengan check dependency
  - Prevent delete jika ada active users
  - Response: { message, deletedAt }

ADDITIONAL:
  - GET /api/stores/[id] (single store)
  - GET /api/stores/list (simple list without pagination)
  - POST /api/stores/[id]/sync-google-drive (resync folder)
```

**Database Schema**:
```prisma
model Store {
  id            String    @id @default(cuid())
  storeCode     String    @unique
  name          String
  address       String    @db.Text
  city          String
  phone         String
  email         String?
  region        String
  googleDriveFolderId String?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
}
```

**Files to Create**:
- `server/api/stores/index.get.ts` - List stores
- `server/api/stores/index.post.ts` - Create store
- `server/api/stores/[id]/index.get.ts` - Get store
- `server/api/stores/[id]/index.put.ts` - Update store
- `server/api/stores/[id]/index.delete.ts` - Delete store
- `app/schemas/store.ts` - Zod schemas
- `server/utils/store.ts` - Store utilities (storeCode generation, etc)

**Testing Checklist**:
- [ ] GET /api/stores - list with pagination
- [ ] POST /api/stores - create dengan auto storeCode
- [ ] PUT /api/stores/:id - update store
- [ ] DELETE /api/stores/:id - soft delete dengan check
- [ ] StoreCode generation unique
- [ ] Google Drive folder creation
- [ ] Search & filter working
- [ ] Error handling for dependencies

---

### 8. CRUD Stores - Frontend UI ⏳
**Status**: Not Started  
**Priority**: P1 (High)  
**Est. Time**: 3-4 hours

**Requirements**:
```
Halaman /stores dengan store management interface:

FEATURES:
1. Data Table
   - Columns: StoreCode, Name, City, Region, Status, Users, Actions
   - Sorting & pagination
   - Row actions: Edit, Delete, View Details, Assign Users

2. Create Store Modal
   - Generate storeCode button (auto-fill)
   - Name, Address, City, Region inputs
   - Phone, Email fields
   - Google Drive folder picker
   - Manual storeCode input (optional)

3. Edit Store Modal
   - Pre-fill all fields
   - StoreCode non-editable
   - Update Google Drive settings
   - Show active users count

4. Assign Users to Store
   - List available users
   - Multi-select users
   - Remove user assignment
   - Drag-drop to reorder

5. Delete Store
   - Show user count dependency
   - Prevent delete jika ada users
   - Soft delete confirmation

6. Status Badges
   - Active (green)
   - Inactive (gray)

7. User Count Badge
   - Show number of users per store

RESPONSIVE:
- Desktop: Full table view
- Mobile: Card layout with collapsed actions
```

**Components to Create**:
- `app/pages/stores.vue` - Main page
- `app/components/stores/StoreTable.vue` - Data table
- `app/components/stores/StoreForm.vue` - Create/Edit form
- `app/components/stores/StoreCodeGenerator.vue` - Auto-generate storeCode
- `app/components/stores/UserAssignment.vue` - Assign users
- `app/components/stores/DeleteConfirmDialog.vue` - Delete confirmation

**State Management**:
- Stores list (reactive)
- Selected store
- Filter state
- Pagination state
- User assignment state

**Testing Checklist**:
- [ ] List stores dengan data
- [ ] Create store dengan auto storeCode
- [ ] Edit store info
- [ ] Delete store (prevent jika ada users)
- [ ] Assign users to store
- [ ] Search & filter stores
- [ ] Mobile responsive
- [ ] Error handling

---

### 9. Settings Page Redesign ⏳
**Status**: Not Started  
**Priority**: P2 (Medium)  
**Est. Time**: 2-3 hours

**Requirements**:
```
Redesign halaman /settings dengan tabbed interface:

TAB 1: GENERAL
  - Company Name input
  - Company Address textarea
  - Phone, Email inputs
  - Logo upload & preview
  - Save button dengan success toast

TAB 2: GOOGLE DRIVE
  - Service Account JSON upload
  - Root folder picker
  - Test connection button
  - Folder structure preview
  - Reset to default button

TAB 3: DISPLAY
  - Watermark Settings
    - Logo position (top-left, top-right, bottom-left, bottom-right)
    - Company name display toggle
    - Address display toggle
    - Timestamp position
    - Timestamp format dropdown
  - Camera Settings
    - Default camera type (front/back)
    - Quality preset (high/medium/low)
    - Auto-save toggle

TAB 4: SECURITY
  - Change admin password
  - API key management
  - Session timeout setting
  - 2FA toggle
  - Last login info

FEATURES:
- Tabbed navigation
- Form validation
- Success/error toasts
- Auto-save for some fields
- Preview changes before save
- Reset to defaults button
- Responsive design
```

**Components to Create**:
- `app/pages/settings.vue` - Main settings page
- `app/components/settings/GeneralTab.vue`
- `app/components/settings/GoogleDriveTab.vue`
- `app/components/settings/DisplayTab.vue`
- `app/components/settings/SecurityTab.vue`
- `app/components/settings/PreviewWatermark.vue` - Live preview

**API Endpoints** (Backend):
- GET /api/settings - Get all settings
- PUT /api/settings - Update general settings
- POST /api/settings/google-drive - Update Google Drive
- PUT /api/settings/watermark - Update watermark
- POST /api/settings/test-connection - Test Google Drive

**Testing Checklist**:
- [ ] All tabs render correctly
- [ ] Form inputs validate
- [ ] Save settings to database
- [ ] Google Drive test connection
- [ ] Watermark preview updates
- [ ] Settings persist after refresh
- [ ] Mobile responsive
- [ ] Error handling

---

### 10. Testing & QA ⏳
**Status**: Not Started  
**Priority**: P0 (Critical)  
**Est. Time**: 5-8 hours

**Requirements**:
```
Comprehensive testing untuk semua fitur:

E2E TESTS (Playwright):
1. Packing Flow
   - [ ] Navigate to packing page
   - [ ] Scan invoice barcode
   - [ ] Capture BEFORE photos (5 photos)
   - [ ] Capture AFTER photos (5 photos)
   - [ ] Upload photos to Google Drive
   - [ ] Verify folder structure created
   - [ ] Complete packing
   - [ ] Form auto-reset

2. User CRUD
   - [ ] List users with pagination
   - [ ] Create new user
   - [ ] Edit user details
   - [ ] Delete user (soft delete)
   - [ ] Search & filter users
   - [ ] Bulk import users

3. Store CRUD
   - [ ] List stores
   - [ ] Create store with auto storeCode
   - [ ] Edit store
   - [ ] Delete store (with dependency check)
   - [ ] Assign users to store

4. Dashboard
   - [ ] Load dashboard
   - [ ] Check statistics load
   - [ ] Navigation menu works
   - [ ] User dropdown menu
   - [ ] Logout functionality

5. Settings
   - [ ] Update general settings
   - [ ] Update Google Drive config
   - [ ] Change watermark settings
   - [ ] Test Google Drive connection
   - [ ] Settings persist

UNIT TESTS (Vitest):
- [ ] User validation schemas
- [ ] Store code generation
- [ ] Google Drive utility functions
- [ ] Image processing functions
- [ ] Authentication utilities
- [ ] Password hashing functions

INTEGRATION TESTS:
- [ ] User creation with database
- [ ] Store creation with Google Drive folder
- [ ] Photo upload to Google Drive
- [ ] File storage cleanup
- [ ] Pagination logic
- [ ] Search & filter logic

MANUAL TESTS:
- [ ] Mobile responsiveness (iPhone, iPad, Android)
- [ ] Tablet responsiveness
- [ ] Desktop view
- [ ] Camera permission handling
- [ ] Offline mode (with draft save)
- [ ] Network timeout handling
- [ ] Large file uploads
- [ ] Concurrent uploads

PERFORMANCE TESTS:
- [ ] Page load time < 2s
- [ ] API response time < 500ms
- [ ] Lighthouse score > 90
- [ ] Image optimization
- [ ] Bundle size analysis
- [ ] Memory leaks check

SECURITY TESTS:
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] SQL injection prevention
- [ ] Password requirements
- [ ] Authorization checks
- [ ] Rate limiting
- [ ] Dependency vulnerability scan

ACCESSIBILITY (WCAG 2.1 AA):
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color contrast
- [ ] Form labels
- [ ] Error messages
- [ ] Loading states
```

**Test Files to Create**:
- `tests/e2e/packing.spec.ts`
- `tests/e2e/users.spec.ts`
- `tests/e2e/stores.spec.ts`
- `tests/e2e/dashboard.spec.ts`
- `tests/unit/schemas.spec.ts`
- `tests/unit/utils.spec.ts`
- `tests/integration/api.spec.ts`

**Tools & Framework**:
- Playwright untuk E2E
- Vitest untuk Unit
- Supertest untuk API
- Lighthouse untuk Performance
- OWASP ZAP untuk Security

**Test Coverage Target**:
- Line coverage: > 80%
- Branch coverage: > 75%
- Function coverage: > 85%

---

## 🎯 Implementation Order & Strategy

### Phase 1: Backend Foundation (Task 5 & 7)
**Duration**: 8-10 hours  
**Tasks**: CRUD Users API + CRUD Stores API

```
Week 1:
- Monday: Task 5 (Users API) - 4-6 hours
  - API endpoints setup
  - Database schema setup
  - Validation with Zod
  - Testing basic CRUD

- Tuesday: Task 7 (Stores API) - 3-4 hours
  - API endpoints setup
  - Auto-generate storeCode
  - Google Drive integration
  - Testing
```

### Phase 2: Frontend UI (Task 6 & 8)
**Duration**: 6-8 hours  
**Tasks**: CRUD Users UI + CRUD Stores UI

```
Week 2:
- Monday: Task 6 (Users UI) - 3-4 hours
  - Data table component
  - Search & filter
  - Modal forms
  - Integration test

- Tuesday: Task 8 (Stores UI) - 3-4 hours
  - Store table
  - Create/Edit forms
  - User assignment
  - Integration test
```

### Phase 3: Settings & QA (Task 9 & 10)
**Duration**: 7-11 hours  
**Tasks**: Settings redesign + Comprehensive testing

```
Week 2-3:
- Wednesday: Task 9 (Settings) - 2-3 hours
  - Tabbed interface
  - Form components
  - Preview functionality

- Thursday-Friday: Task 10 (Testing & QA) - 5-8 hours
  - E2E tests
  - Unit tests
  - Manual testing
  - Performance & security tests
```

---

## 📋 Pre-Implementation Checklist

- [ ] Review completed tasks (1-4) for consistency
- [ ] Check database schema compatibility
- [ ] Setup testing framework (Vitest, Playwright)
- [ ] Create test fixtures & seed data
- [ ] Prepare API documentation template
- [ ] Setup GitHub actions for CI/CD
- [ ] Create feature branches for each task

---

## 🚀 Execution Checklist

### Task 5 (Users API):
- [ ] Create Zod validation schemas
- [ ] Create database migrations if needed
- [ ] Implement GET /api/users endpoint
- [ ] Implement POST /api/users endpoint
- [ ] Implement PUT /api/users/:id endpoint
- [ ] Implement DELETE /api/users/:id endpoint
- [ ] Add error handling
- [ ] Write unit tests
- [ ] Test all endpoints with Postman/curl
- [ ] Commit & push to GitHub

### Task 6 (Users UI):
- [ ] Create /pages/users.vue
- [ ] Create UserTable component
- [ ] Create UserForm modal
- [ ] Add search & filter
- [ ] Add delete confirmation
- [ ] Test all interactions
- [ ] Mobile responsive
- [ ] Commit & push

### Task 7 (Stores API):
- [ ] Create Zod validation schemas
- [ ] Create migrations if needed
- [ ] Implement GET /api/stores endpoint
- [ ] Implement POST /api/stores endpoint (with auto storeCode)
- [ ] Implement PUT /api/stores/:id endpoint
- [ ] Implement DELETE /api/stores/:id endpoint (with dependency check)
- [ ] Add error handling
- [ ] Write unit tests
- [ ] Test endpoints
- [ ] Commit & push

### Task 8 (Stores UI):
- [ ] Create /pages/stores.vue
- [ ] Create StoreTable component
- [ ] Create StoreForm with code generator
- [ ] Add UserAssignment component
- [ ] Add delete confirmation with dependency warning
- [ ] Test all interactions
- [ ] Mobile responsive
- [ ] Commit & push

### Task 9 (Settings):
- [ ] Create /pages/settings.vue with tabs
- [ ] Create GeneralTab component
- [ ] Create GoogleDriveTab component
- [ ] Create DisplayTab with watermark preview
- [ ] Create SecurityTab component
- [ ] Implement API endpoints for settings
- [ ] Add form validation
- [ ] Test all tabs
- [ ] Mobile responsive
- [ ] Commit & push

### Task 10 (Testing & QA):
- [ ] Setup Playwright tests
- [ ] Write E2E tests for all flows
- [ ] Setup Vitest for unit tests
- [ ] Write unit tests for schemas/utils
- [ ] Manual testing checklist
- [ ] Performance testing
- [ ] Security testing
- [ ] Accessibility testing
- [ ] Create test report
- [ ] Commit & push

---

## 📊 Time Estimation Summary

| Task | Hours | Days | Priority |
|------|-------|------|----------|
| 5 - Users API | 4-6 | 1 | P1 |
| 6 - Users UI | 3-4 | 0.5 | P1 |
| 7 - Stores API | 3-4 | 1 | P1 |
| 8 - Stores UI | 3-4 | 0.5 | P1 |
| 9 - Settings | 2-3 | 0.5 | P2 |
| 10 - Testing & QA | 5-8 | 1.5 | P0 |
| **Total** | **20-29 hrs** | **5 days** | - |

**Timeline**: ~1 week untuk complete semua tasks (dengan intensive work)

---

## 🔄 Continuous Integration

**GitHub Workflow** (to be setup):
```yaml
- Auto-run tests on every push
- Check code coverage
- Lint & format check
- Build verification
- Security scanning
- Performance comparison
```

**Quality Gates**:
- ✅ All tests passing
- ✅ Code coverage > 80%
- ✅ No critical security issues
- ✅ Lighthouse score > 90
- ✅ Code review approval

---

## 📝 Notes & Reminders

1. **Database Migrations**: Ensure all schema changes have migrations before deploying
2. **API Documentation**: Document all new endpoints (parameters, responses, errors)
3. **Component Naming**: Follow existing naming convention (PascalCase for components)
4. **Type Safety**: Keep strict TypeScript throughout
5. **Error Handling**: Every API should have proper error responses
6. **Testing**: No feature without tests (unit + integration + E2E)
7. **Mobile First**: Design with mobile first approach
8. **Accessibility**: Follow WCAG 2.1 AA standards
9. **Performance**: Lazy load, code split, optimize images
10. **Security**: Input validation, sanitization, auth checks

---

## 🎯 Success Criteria for Completion

✅ All 10 tasks completed  
✅ All tests passing (unit, integration, E2E)  
✅ Code coverage > 80%  
✅ No critical bugs or security issues  
✅ Mobile responsive on all pages  
✅ Performance score > 90  
✅ Accessibility score > 90  
✅ Full API documentation  
✅ GitHub repository up to date  
✅ Ready for production deployment  

---

**Next Action**: Start Task 5 (CRUD Users - Backend API) 🚀

Estimated completion: ~1 week with focused development
