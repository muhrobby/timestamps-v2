# Testing Guide - Packing Documentation System

Complete testing guide untuk Packing Documentation System.

## 🧪 Testing Strategy

### Test Pyramid

```
        E2E (Playwright)
       ↗               ↖
    Integration Tests (Supertest)
   ↗                           ↖
Unit Tests (Vitest)
```

**Coverage Goals**:

- Unit Tests: 80%+ coverage
- Integration Tests: 100% API coverage
- E2E Tests: Critical user flows

---

## 🛠️ Setup Testing Environment

### 1. Install Testing Dependencies

```bash
npm install --save-dev vitest @vitest/ui supertest playwright @playwright/test
```

### 2. Create Testing Config

**vitest.config.ts**:

```typescript
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: "happy-dom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", ".nuxt/", "coverage/"],
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./"),
    },
  },
});
```

**playwright.config.ts**:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3. Update package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 🔍 Unit Tests (Vitest)

### 1. Test Composables

**tests/unit/composables/useAuth.spec.ts**:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "~/app/composables/useAuth";

describe("useAuth", () => {
  beforeEach(() => {
    // Reset state before each test
    vi.clearAllMocks();
  });

  it("should initialize with no user", () => {
    const { user, isAuthenticated } = useAuth();
    expect(user.value).toBeNull();
    expect(isAuthenticated.value).toBe(false);
  });

  it("should login successfully", async () => {
    const { login, user } = useAuth();

    // Mock the API call
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              user: { id: "1", email: "test@example.com" },
              token: "token123",
            }),
        })
      )
    );

    await login("test@example.com", "password");
    expect(user.value?.email).toBe("test@example.com");
  });

  it("should logout successfully", async () => {
    const { logout, user } = useAuth();
    user.value = { id: "1", email: "test@example.com" };

    await logout();
    expect(user.value).toBeNull();
  });

  it("should check if user is admin", () => {
    const { user, isAdmin } = useAuth();

    user.value = { id: "1", email: "admin@test.com", role: "ADMIN" };
    expect(isAdmin.value).toBe(true);

    user.value.role = "USER";
    expect(isAdmin.value).toBe(false);
  });
});
```

### 2. Test Utilities

**tests/unit/utils/validation.spec.ts**:

```typescript
import { describe, it, expect } from "vitest";
import { validateEmail, validatePassword } from "~/server/utils/validation";

describe("Validation Utils", () => {
  describe("validateEmail", () => {
    it("should validate correct email", () => {
      expect(validateEmail("user@example.com")).toBe(true);
    });

    it("should reject invalid email", () => {
      expect(validateEmail("invalid-email")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("should validate strong password", () => {
      expect(validatePassword("SecurePassword123!")).toBe(true);
    });

    it("should reject weak password", () => {
      expect(validatePassword("weak")).toBe(false);
      expect(validatePassword("123456")).toBe(false);
    });
  });
});
```

### 3. Run Unit Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test app/composables/useAuth.spec.ts

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

---

## 🔌 Integration Tests (Supertest)

### 1. Setup Supertest

```bash
npm install --save-dev supertest
```

### 2. Test API Routes

**tests/integration/api/auth.spec.ts**:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

const BASE_URL = "http://localhost:3000/api";

describe("Auth API", () => {
  let token: string;
  let userId: string;

  describe("POST /auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const res = await request(BASE_URL).post("/auth/login").send({
        email: "admin@packing.com",
        password: "admin123",
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("user");
      expect(res.body.user.email).toBe("admin@packing.com");

      token = res.body.token;
      userId = res.body.user.id;
    });

    it("should reject invalid password", async () => {
      const res = await request(BASE_URL).post("/auth/login").send({
        email: "admin@packing.com",
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
    });

    it("should reject non-existent user", async () => {
      const res = await request(BASE_URL).post("/auth/login").send({
        email: "nonexistent@example.com",
        password: "password",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /auth/me", () => {
    it("should return current user with valid token", async () => {
      const res = await request(BASE_URL)
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(userId);
      expect(res.body.email).toBe("admin@packing.com");
    });

    it("should reject request without token", async () => {
      const res = await request(BASE_URL).get("/auth/me");

      expect(res.status).toBe(401);
    });

    it("should reject request with invalid token", async () => {
      const res = await request(BASE_URL)
        .get("/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(401);
    });
  });
});
```

**tests/integration/api/users.spec.ts**:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

const BASE_URL = "http://localhost:3000/api";
let adminToken: string;
let createdUserId: string;

beforeAll(async () => {
  // Get admin token
  const loginRes = await request(BASE_URL).post("/auth/login").send({
    email: "admin@packing.com",
    password: "admin123",
  });
  adminToken = loginRes.body.token;
});

describe("Users API", () => {
  describe("POST /users", () => {
    it("should create user with valid data", async () => {
      const res = await request(BASE_URL)
        .post("/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "newuser@example.com",
          password: "SecurePassword123",
          name: "New User",
          role: "USER",
          storeId: "store-id",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.email).toBe("newuser@example.com");

      createdUserId = res.body.id;
    });

    it("should reject duplicate email", async () => {
      const res = await request(BASE_URL)
        .post("/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "newuser@example.com",
          password: "SecurePassword123",
          name: "Another User",
          role: "USER",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /users", () => {
    it("should list users with pagination", async () => {
      const res = await request(BASE_URL)
        .get("/users?page=1&limit=10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("total");
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("GET /users/:id", () => {
    it("should get user by id", async () => {
      const res = await request(BASE_URL)
        .get(`/users/${createdUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdUserId);
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(BASE_URL)
        .get("/users/invalid-id")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /users/:id", () => {
    it("should update user", async () => {
      const res = await request(BASE_URL)
        .put(`/users/${createdUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Updated Name",
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Updated Name");
    });
  });

  describe("DELETE /users/:id", () => {
    it("should delete user", async () => {
      const res = await request(BASE_URL)
        .delete(`/users/${createdUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it("should return 404 for deleted user", async () => {
      const res = await request(BASE_URL)
        .get(`/users/${createdUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
```

### 3. Run Integration Tests

```bash
# Start dev server first (in another terminal)
npm run dev

# Run integration tests
npm run test:api

# Or with Supertest directly
vitest tests/integration
```

---

## 🎭 E2E Tests (Playwright)

### 1. Test Login Flow

**tests/e2e/auth.spec.ts**:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should login successfully", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Fill form
    await page.fill('input[name="email"]', "admin@packing.com");
    await page.fill('input[name="password"]', "admin123");

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL("/dashboard");

    // Verify page content
    expect(await page.locator("h1")).toContainText("Dashboard");
  });

  it("should reject invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "admin@packing.com");
    await page.fill('input[name="password"]', "wrongpassword");

    await page.click('button[type="submit"]');

    // Check for error message
    expect(await page.locator(".toast-error")).toBeVisible();
  });

  it("should logout successfully", async ({ page }) => {
    await page.goto("/login");

    // Login
    await page.fill('input[name="email"]', "admin@packing.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL("/dashboard");

    // Click logout
    await page.click('button[aria-label="Logout"]');

    // Should redirect to login
    await page.waitForURL("/login");
  });
});
```

### 2. Test Packing Documentation Flow

**tests/e2e/packing.spec.ts**:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Packing Documentation", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill('input[name="email"]', "user@packing.com");
    await page.fill('input[name="password"]', "user123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should create packing record with images", async ({ page }) => {
    // Navigate to packing form
    await page.goto("/packing");

    // Fill invoice number
    await page.fill('input[name="invoiceNumber"]', "INV-2025-001");

    // Fill notes
    await page.fill('textarea[name="notes"]', "Test packing record");

    // Upload before images
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles("tests/fixtures/image1.jpg");
    await page.waitForTimeout(500);

    // Submit form
    await page.click('button:has-text("Submit")');

    // Verify success
    expect(await page.locator(".toast-success")).toBeVisible();

    // Verify record appears in history
    await page.goto("/history");
    expect(await page.locator("text=INV-2025-001")).toBeVisible();
  });

  test("should scan barcode", async ({ page }) => {
    await page.goto("/packing");

    // Open barcode scanner
    await page.click('button:has-text("Scan Barcode")');

    // Fill manually (simulation)
    await page.fill('input[name="invoiceNumber"]', "INV-2025-002");

    await page.click('button:has-text("Submit")');

    expect(await page.locator(".toast-success")).toBeVisible();
  });
});
```

### 3. Test User Management

**tests/e2e/users.spec.ts**:

```typescript
import { test, expect } from "@playwright/test";

test.describe("User Management (Admin)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@packing.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should create new user", async ({ page }) => {
    await page.goto("/users");

    // Click "Tambah User"
    await page.click('button:has-text("Tambah User")');

    // Fill form
    await page.fill('input[name="email"]', "testuser@example.com");
    await page.fill('input[name="password"]', "TestPassword123");
    await page.fill('input[name="name"]', "Test User");
    await page.selectOption('select[name="role"]', "USER");

    // Submit
    await page.click('button:has-text("Simpan")');

    // Verify
    expect(await page.locator(".toast-success")).toBeVisible();
    expect(await page.locator("text=testuser@example.com")).toBeVisible();
  });

  test("should bulk import users", async ({ page }) => {
    await page.goto("/users");

    // Click bulk import
    await page.click('button:has-text("Bulk Import")');

    // Upload CSV file
    await page
      .locator('input[type="file"]')
      .setInputFiles("tests/fixtures/users.csv");

    // Submit
    await page.click('button:has-text("Import")');

    // Verify success
    expect(await page.locator(".toast-success")).toBeVisible();
  });
});
```

### 4. Run E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e tests/e2e/auth.spec.ts

# Run in UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

---

## 📊 Test Coverage

### Generate Coverage Report

```bash
npm run test:coverage
```

Coverage report akan generate di `coverage/` folder.

**Coverage Goals**:

- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

---

## 🔄 Continuous Integration

### GitHub Actions

**.github/workflows/test.yml**:

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: "22"
          cache: "npm"

      - run: npm ci --legacy-peer-deps

      - run: npm run test

      - run: npm run test:coverage

      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - run: npm run build
```

---

## 🐛 Debugging Tests

### Debug with VSCode

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:debug"],
  "console": "integratedTerminal"
}
```

### Debug Playwright

```bash
npm run test:e2e:debug
```

---

## ✅ Test Checklist

Before shipping code:

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Coverage at 80%+
- [ ] No console errors
- [ ] No security warnings
- [ ] Performance acceptable
- [ ] Accessibility checks pass

---

**Last Updated**: December 9, 2025  
**Version**: 1.0.0
