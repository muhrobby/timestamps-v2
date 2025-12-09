import { z } from "zod";

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize HTML - more aggressive, removes all HTML tags
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Validate and sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators
  let sanitized = fileName.replace(/[/\\]/g, "_");

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, "");

  // Remove special characters that could be problematic
  sanitized = sanitized.replace(/[<>:"|?*]/g, "_");

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split(".").pop() || "";
    const name = sanitized.substring(0, 255 - ext.length - 1);
    sanitized = `${name}.${ext}`;
  }

  return sanitized || "unnamed";
}

/**
 * Validate base64 image string
 */
export function validateBase64Image(base64String: string): {
  isValid: boolean;
  mimeType?: string;
  error?: string;
} {
  // Check for data URI format
  const dataUriMatch = base64String.match(
    /^data:(image\/(jpeg|jpg|png|gif|webp|heic|heif));base64,/i
  );

  if (dataUriMatch) {
    const mimeType = dataUriMatch[1];
    const base64Data = base64String.split(",")[1];

    if (!base64Data) {
      return { isValid: false, error: "Data base64 tidak valid" };
    }

    // Check if it's valid base64
    try {
      const buffer = Buffer.from(base64Data, "base64");

      // Check magic bytes for common image formats
      const isValidImage = validateImageMagicBytes(buffer);
      if (!isValidImage) {
        return { isValid: false, error: "File bukan gambar yang valid" };
      }

      return { isValid: true, mimeType };
    } catch {
      return { isValid: false, error: "Format base64 tidak valid" };
    }
  }

  // Try as raw base64
  try {
    const buffer = Buffer.from(base64String, "base64");

    if (buffer.length === 0) {
      return { isValid: false, error: "Data kosong" };
    }

    // Detect mime type from magic bytes
    const mimeType = detectMimeType(buffer);
    if (!mimeType || !mimeType.startsWith("image/")) {
      return { isValid: false, error: "Bukan file gambar" };
    }

    return { isValid: true, mimeType };
  } catch {
    return { isValid: false, error: "Format base64 tidak valid" };
  }
}

/**
 * Validate image magic bytes (file signature)
 */
function validateImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;

  const signatures = [
    { bytes: [0xff, 0xd8, 0xff], type: "jpeg" }, // JPEG
    { bytes: [0x89, 0x50, 0x4e, 0x47], type: "png" }, // PNG
    { bytes: [0x47, 0x49, 0x46], type: "gif" }, // GIF
    { bytes: [0x52, 0x49, 0x46, 0x46], type: "webp" }, // WEBP (RIFF)
  ];

  for (const sig of signatures) {
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }

  return false;
}

/**
 * Detect MIME type from buffer magic bytes
 */
function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return "image/gif";
  }

  // WebP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    if (buffer.length >= 12) {
      if (
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      ) {
        return "image/webp";
      }
    }
  }

  return null;
}

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Zod schemas with security validations
 */
export const secureSchemas = {
  // Safe string that strips HTML
  safeString: z.string().transform(stripHtml),

  // Email with additional checks
  safeEmail: z
    .string()
    .email()
    .max(255)
    .toLowerCase()
    .transform((e) => e.trim()),

  // Password with requirements
  securePassword: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(72, "Password maksimal 72 karakter") // bcrypt limit
    .regex(/[a-z]/, "Password harus mengandung huruf kecil")
    .regex(/[A-Z]/, "Password harus mengandung huruf besar")
    .regex(/[0-9]/, "Password harus mengandung angka"),

  // UUID validation
  uuid: z.string().refine(isValidUUID, { message: "ID tidak valid" }),

  // Safe filename
  safeFileName: z.string().max(255).transform(sanitizeFileName),

  // Invoice number (alphanumeric with dashes)
  invoiceNumber: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-zA-Z0-9\-_]+$/,
      "Nomor invoice hanya boleh huruf, angka, - dan _"
    ),

  // Store code
  storeCode: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9\-_]+$/, "Kode toko hanya boleh huruf, angka, - dan _")
    .toUpperCase(),
};

/**
 * CORS configuration for production
 */
export const corsConfig = {
  origin: process.env.NUXT_PUBLIC_BASE_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Security headers
 */
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), geolocation=(self), microphone=()",
};

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  event: Parameters<typeof setHeader>[0]
): void {
  for (const [header, value] of Object.entries(securityHeaders)) {
    setHeader(event, header, value);
  }
}

/**
 * Validate request origin
 */
export function validateOrigin(
  event: Parameters<typeof getHeader>[0],
  allowedOrigins: string[]
): boolean {
  const origin = getHeader(event, "origin");
  const referer = getHeader(event, "referer");

  // Allow same-origin requests (no origin header)
  if (!origin && !referer) {
    return true;
  }

  // Check origin against allowed list
  if (origin) {
    return allowedOrigins.some(
      (allowed) => allowed === "*" || origin.startsWith(allowed)
    );
  }

  // Check referer as fallback
  if (referer) {
    return allowedOrigins.some(
      (allowed) => allowed === "*" || referer.startsWith(allowed)
    );
  }

  return false;
}

/**
 * Verify CSRF token (if using cookies)
 */
export function verifyCsrfToken(
  event: Parameters<typeof getHeader>[0]
): boolean {
  const csrfToken = getHeader(event, "x-csrf-token");
  const cookieToken = getCookie(event, "csrf-token");

  if (!csrfToken || !cookieToken) {
    return false;
  }

  return csrfToken === cookieToken;
}

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
