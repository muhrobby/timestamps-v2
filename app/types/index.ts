// User & Auth Types
export type UserRole = "ADMIN" | "OPS" | "USER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  storeId: string;
  store?: Store;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends User {
  password: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  user?: User;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  storeId: string;
  storeName?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

// Store Types
export interface Store {
  id: string;
  storeCode: string;
  storeName: string;
  createdAt: Date;
  updatedAt: Date;
  users?: User[];
  packingRecords?: PackingRecord[];
}

export interface StoreCreateInput {
  storeCode: string;
  storeName: string;
}

export interface StoreUpdateInput {
  storeCode?: string;
  storeName?: string;
}

// Packing Types
export type ImageType = "BEFORE" | "AFTER";
export type UploadStatus = "PENDING" | "UPLOADING" | "COMPLETED" | "FAILED";

export interface PackingImage {
  id: string;
  packingRecordId: string;
  imageType: ImageType;
  fileName: string;
  localPath?: string | null;
  driveFileId?: string | null;
  driveUrl?: string | null;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  uploadError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PackingRecord {
  id: string;
  invoiceNumber: string;
  notes?: string | null;
  packedAt: Date;
  userId: string;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  store?: Store;
  images?: PackingImage[];
}

export interface PackingRecordCreateInput {
  invoiceNumber: string;
  notes?: string;
  beforeImages: File[];
  afterImages: File[];
}

export interface PackingRecordWithRelations extends PackingRecord {
  user: User;
  store: Store;
  images: PackingImage[];
}

// Settings Types
export type PositionType =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface Settings {
  id: string;
  logoPosition: PositionType;
  addressPosition: PositionType;
  timestampPosition: PositionType;
  companyName?: string | null;
  companyAddress?: string | null;
  logoUrl?: string | null;
  googleDriveFolderId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  id: string;
  key: string;
  value: string;
  type: "string" | "boolean" | "number" | "json";
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingsConfig {
  logoUrl: string;
  logoPosition: PositionType;
  timestampPosition: PositionType;
  showAddress: boolean;
  address: string;
  timestampFormat: string;
}

// Upload Queue Types
export interface UploadQueueItem {
  id: string;
  imageId: string;
  status: UploadStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Bulk Import Types
export interface BulkUserImportRow {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  storeCode: string;
}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    email?: string;
    error: string;
  }>;
}

// Upload Progress Types
export interface UploadProgress {
  imageId: string;
  fileName: string;
  status: UploadStatus;
  progress: number;
  error?: string;
}

export interface UploadBatch {
  id: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  status: "pending" | "processing" | "completed" | "failed";
  items: UploadProgress[];
}
