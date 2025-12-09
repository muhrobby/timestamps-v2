import { z } from "zod";

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const registerSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  role: z.enum(["ADMIN", "OPS", "USER"]).default("USER"),
  storeId: z.string().min(1, "Store harus dipilih"),
});

// User Schemas
export const userCreateSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  role: z.enum(["ADMIN", "OPS", "USER"]).default("USER"),
  storeId: z.string().min(1, "Store harus dipilih"),
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = z.object({
  email: z.string().email("Email tidak valid").optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  name: z.string().min(2, "Nama minimal 2 karakter").optional(),
  role: z.enum(["ADMIN", "OPS", "USER"]).optional(),
  storeId: z.string().min(1, "Store harus dipilih").optional(),
  isActive: z.boolean().optional(),
});

export const bulkUserImportSchema = z.array(
  z.object({
    email: z.string().email("Email tidak valid"),
    name: z.string().min(2, "Nama minimal 2 karakter"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    role: z.enum(["ADMIN", "OPS", "USER"]),
    storeCode: z.string().min(1, "Store code harus diisi"),
  })
);

// Store Schemas
export const storeCreateSchema = z.object({
  storeCode: z
    .string()
    .min(1, "Store code harus diisi")
    .max(20, "Store code maksimal 20 karakter"),
  storeName: z.string().min(2, "Store name minimal 2 karakter"),
});

export const storeUpdateSchema = z.object({
  storeCode: z
    .string()
    .min(1, "Store code harus diisi")
    .max(20, "Store code maksimal 20 karakter")
    .optional(),
  storeName: z.string().min(2, "Store name minimal 2 karakter").optional(),
});

// Packing Record Schemas
export const packingRecordCreateSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number harus diisi"),
  notes: z.string().optional(),
});

export const packingRecordUpdateSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number harus diisi").optional(),
  notes: z.string().optional(),
});

// Settings Schemas
export const settingsUpdateSchema = z.object({
  key: z.string().min(1, "Key harus diisi"),
  value: z.string(),
  type: z.enum(["string", "boolean", "number", "json"]).default("string"),
});

export const settingsConfigSchema = z.object({
  logoUrl: z.string().optional(),
  logoPosition: z
    .enum(["top-left", "top-right", "bottom-left", "bottom-right"])
    .default("top-right"),
  timestampPosition: z
    .enum(["top-left", "top-right", "bottom-left", "bottom-right"])
    .default("bottom-right"),
  showAddress: z.boolean().default(true),
  address: z.string().default(""),
  timestampFormat: z.string().default("DD/MM/YYYY HH:mm:ss"),
});

// Pagination Schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type BulkUserImportInput = z.infer<typeof bulkUserImportSchema>;
export type StoreCreateInput = z.infer<typeof storeCreateSchema>;
export type StoreUpdateInput = z.infer<typeof storeUpdateSchema>;
export type PackingRecordCreateInput = z.infer<
  typeof packingRecordCreateSchema
>;
export type PackingRecordUpdateInput = z.infer<
  typeof packingRecordUpdateSchema
>;
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
export type SettingsConfigInput = z.infer<typeof settingsConfigSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
