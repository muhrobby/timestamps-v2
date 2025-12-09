import { google } from "googleapis";
import { Readable } from "stream";
import { prisma } from "./prisma";

interface UploadResult {
  fileId: string;
  webViewLink: string;
}

let driveClient: ReturnType<typeof google.drive> | null = null;

function getGoogleDriveClient() {
  if (driveClient) return driveClient;

  const config = useRuntimeConfig();

  // Check if using Service Account (recommended)
  if (
    config.googleServiceAccountEmail &&
    config.googleServiceAccountPrivateKey
  ) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.googleServiceAccountEmail,
        private_key: config.googleServiceAccountPrivateKey.replace(
          /\\n/g,
          "\n"
        ),
      },
      // Changed from 'drive.file' to 'drive' to access existing folders
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    driveClient = google.drive({ version: "v3", auth });
    console.log("✅ Service Account authenticated");
    return driveClient;
  }

  // Fallback to OAuth2 (legacy)
  if (
    config.googleClientId &&
    config.googleClientSecret &&
    config.googleRefreshToken
  ) {
    const oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: config.googleRefreshToken,
    });

    driveClient = google.drive({ version: "v3", auth: oauth2Client });
    console.log("✅ OAuth2 authenticated");
    return driveClient;
  }

  throw new Error(
    "Google Drive credentials not configured. Please set Service Account or OAuth2 credentials."
  );
}

export async function uploadToGoogleDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<UploadResult> {
  try {
    const config = useRuntimeConfig();
    console.log("🔄 Starting Google Drive upload:", fileName);

    const drive = getGoogleDriveClient();

    const targetFolderId = folderId || config.googleDriveFolderId;
    console.log("📁 Target folder ID:", targetFolderId || "root");

    if (!targetFolderId) {
      throw new Error(
        "GOOGLE_DRIVE_FOLDER_ID not configured. Please set it in .env.local"
      );
    }

    const fileMetadata: { name: string; parents?: string[] } = {
      name: fileName,
    };

    if (targetFolderId) {
      fileMetadata.parents = [targetFolderId];
    }

    const media = {
      mimeType,
      body: Readable.from(fileBuffer),
    };

    console.log("📤 Uploading file to Google Drive...");
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    if (!response.data.id) {
      throw new Error("Upload failed: No file ID returned");
    }

    console.log("✅ File uploaded:", response.data.id);

    // Make file publicly accessible
    console.log("🔓 Setting public permissions...");
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    console.log("✅ Upload complete:", fileName);

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink!,
    };
  } catch (error: any) {
    console.error("❌ Google Drive upload error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      status: error.status,
      errors: error.errors,
    });

    // Provide user-friendly error messages
    if (
      error.code === 403 ||
      error.message?.includes("Insufficient Permission")
    ) {
      throw new Error(
        `Permission denied. Please share the folder with service account email: ${
          useRuntimeConfig().googleServiceAccountEmail
        }`
      );
    }

    if (error.code === 404 || error.message?.includes("not found")) {
      throw new Error(
        `Folder not found. Please check GOOGLE_DRIVE_FOLDER_ID in .env.local`
      );
    }

    if (error.message?.includes("credentials not configured")) {
      throw error;
    }

    throw new Error(`Google Drive upload failed: ${error.message}`);
  }
}

export async function deleteFromGoogleDrive(fileId: string): Promise<void> {
  const drive = getGoogleDriveClient();
  await drive.files.delete({ fileId });
}

/**
 * Create or get folder in Google Drive
 */
async function createOrGetFolder(
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const drive = getGoogleDriveClient();

  // Search for existing folder
  const query = [
    `name='${folderName}'`,
    "mimeType='application/vnd.google-apps.folder'",
  ];
  if (parentFolderId) {
    query.push(`'${parentFolderId}' in parents`);
  }
  query.push("trashed=false");

  const searchResponse = await drive.files.list({
    q: query.join(" and "),
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id!;
  }

  // Create new folder
  const fileMetadata: { name: string; mimeType: string; parents?: string[] } = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };

  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id",
  });

  return response.data.id!;
}

/**
 * Create hierarchical folder structure for invoice
 * Structure: [Root]/[StoreCode-StoreName]/[YYYY-MM]/[Invoice_YYYYMMDD_HHMMSS]/
 */
export async function createInvoiceFolderStructure(
  storeCode: string,
  storeName: string,
  invoiceNumber: string,
  timestamp: Date = new Date()
): Promise<string> {
  const config = useRuntimeConfig();
  const rootFolderId = config.googleDriveFolderId;

  if (!rootFolderId) {
    throw new Error("Google Drive root folder ID not configured");
  }

  console.log("📁 Creating folder structure...");

  // Sanitize folder names (remove special characters)
  const sanitize = (str: string) => str.replace(/[/\\?*:|"<>]/g, "-").trim();

  // 1. Create/get Store folder: "STORE001-Toko Pusat"
  const storeFolderName = `${sanitize(storeCode)}-${sanitize(storeName)}`;
  console.log(`  ├── Store folder: ${storeFolderName}`);
  const storeFolderId = await createOrGetFolder(storeFolderName, rootFolderId);

  // 2. Create/get Year-Month folder: "2025-12"
  const yearMonth = timestamp.toISOString().substring(0, 7);
  console.log(`  ├── Month folder: ${yearMonth}`);
  const yearMonthFolderId = await createOrGetFolder(yearMonth, storeFolderId);

  // 3. Create invoice folder: "INV001_20251209_231530"
  const dateTimeStr = timestamp
    .toISOString()
    .replace(/[-:T]/g, "")
    .substring(0, 15); // "20251209231530"
  const formattedDateTime = `${dateTimeStr.substring(
    0,
    8
  )}_${dateTimeStr.substring(8, 14)}`;
  const invoiceFolderName = `${sanitize(invoiceNumber)}_${formattedDateTime}`;
  console.log(`  └── Invoice folder: ${invoiceFolderName}`);
  const invoiceFolderId = await createOrGetFolder(
    invoiceFolderName,
    yearMonthFolderId
  );

  return invoiceFolderId;
}

/**
 * Upload metadata.json to invoice folder
 */
export async function uploadMetadataFile(
  folderId: string,
  metadata: Record<string, unknown>
): Promise<UploadResult> {
  const drive = getGoogleDriveClient();

  const fileMetadata = {
    name: "metadata.json",
    parents: [folderId],
  };

  const media = {
    mimeType: "application/json",
    body: Readable.from(Buffer.from(JSON.stringify(metadata, null, 2))),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, webViewLink",
  });

  return {
    fileId: response.data.id!,
    webViewLink: response.data.webViewLink!,
  };
}

// Upload Queue Processing (tanpa Redis/BullMQ)
class UploadQueueProcessor {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  async start() {
    if (this.processingInterval) return;

    // Process queue every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 5000);

    // Initial process
    this.processQueue();
  }

  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Get pending items
      const pendingItems = await prisma.uploadQueue.findMany({
        where: {
          status: "PENDING",
          attempts: { lt: 3 },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: 5, // Process 5 at a time
      });

      for (const item of pendingItems) {
        await this.processItem(item.id, item.imageId);
      }
    } catch (error) {
      console.error("Queue processing error:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processItem(queueId: string, imageId: string) {
    try {
      // Update status to uploading
      await prisma.uploadQueue.update({
        where: { id: queueId },
        data: { status: "UPLOADING" },
      });

      await prisma.packingImage.update({
        where: { id: imageId },
        data: {
          uploadStatus: "UPLOADING",
          uploadProgress: 10,
        },
      });

      // Get image data with packing record and store info
      const image = await prisma.packingImage.findUnique({
        where: { id: imageId },
        include: {
          packingRecord: {
            include: {
              store: true,
            },
          },
        },
      });

      if (!image || !image.localPath) {
        throw new Error("Image not found or no local path");
      }

      if (!image.packingRecord) {
        throw new Error("Packing record not found");
      }

      // Read file from local storage
      const fs = await import("fs").then((m) => m.promises);
      const fileBuffer = await fs.readFile(image.localPath);

      // Update progress
      await prisma.packingImage.update({
        where: { id: imageId },
        data: { uploadProgress: 30 },
      });

      // Create folder hierarchy: [Root]/[StoreCode-StoreName]/[YYYY-MM]/[Invoice_YYYYMMDD_HHMMSS]/
      const store = image.packingRecord.store;
      const storeCode = store?.storeCode || "UNKNOWN";
      const storeName = store?.storeName || "Unknown Store";
      const invoiceNumber = image.packingRecord.invoiceNumber;
      const timestamp =
        image.packingRecord.packedAt || image.packingRecord.createdAt;

      console.log(
        `📁 Creating folder for: ${storeCode}-${storeName}/${invoiceNumber}`
      );

      const invoiceFolderId = await createInvoiceFolderStructure(
        storeCode,
        storeName,
        invoiceNumber,
        timestamp
      );

      // Update progress
      await prisma.packingImage.update({
        where: { id: imageId },
        data: { uploadProgress: 50 },
      });

      // Generate proper filename: before_1.jpg, after_2.jpg
      const imageType = image.imageType.toLowerCase();
      const orderNumber = image.displayOrder || 1;
      const extension = image.fileName.split(".").pop() || "jpg";
      const properFileName = `${imageType}_${orderNumber}.${extension}`;

      console.log(`📤 Uploading: ${properFileName} to invoice folder`);

      // Upload to Google Drive in the invoice folder
      const mimeType = image.fileName.endsWith(".png")
        ? "image/png"
        : "image/jpeg";
      const result = await uploadToGoogleDrive(
        fileBuffer,
        properFileName,
        mimeType,
        invoiceFolderId
      );

      // Update image with drive info
      await prisma.packingImage.update({
        where: { id: imageId },
        data: {
          driveFileId: result.fileId,
          driveUrl: result.webViewLink,
          uploadStatus: "COMPLETED",
          uploadProgress: 100,
        },
      });

      // Update queue status
      await prisma.uploadQueue.update({
        where: { id: queueId },
        data: { status: "COMPLETED" },
      });

      // Delete local file after successful upload
      try {
        await fs.unlink(image.localPath);
        await prisma.packingImage.update({
          where: { id: imageId },
          data: { localPath: null },
        });
      } catch {
        // Ignore delete errors
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error("❌ Upload queue processing failed:", {
        queueId,
        imageId,
        error: errorMessage,
      });

      // Update queue with error
      const queue = await prisma.uploadQueue.findUnique({
        where: { id: queueId },
      });

      if (queue) {
        const newAttempts = queue.attempts + 1;
        const willRetry = newAttempts < queue.maxAttempts;

        console.log(
          `${willRetry ? "🔄" : "❌"} Upload attempt ${newAttempts}/${
            queue.maxAttempts
          }`
        );

        await prisma.uploadQueue.update({
          where: { id: queueId },
          data: {
            attempts: newAttempts,
            lastError: errorMessage,
            status: willRetry ? "PENDING" : "FAILED",
          },
        });
      }

      await prisma.packingImage.update({
        where: { id: imageId },
        data: {
          uploadStatus: "FAILED",
          uploadError: errorMessage,
        },
      });
    }
  }
}

export const uploadQueueProcessor = new UploadQueueProcessor();

// Add image to upload queue
export async function addToUploadQueue(imageId: string, priority: number = 0) {
  await prisma.uploadQueue.create({
    data: {
      imageId,
      priority,
    },
  });
}
