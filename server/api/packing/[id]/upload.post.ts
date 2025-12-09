import { prisma } from "../../../utils/prisma";
import { requireAuth } from "../../../utils/auth-middleware";
import { addToUploadQueue } from "../../../utils/google-drive";
import { compressImage, validateImage } from "../../../utils/image-processor";
import { applyRateLimit, uploadRateLimit } from "../../../utils/rate-limit";
import {
  sanitizeFileName,
  validateBase64Image,
  applySecurityHeaders,
} from "../../../utils/security";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { z } from "zod";

const uploadSchema = z.object({
  imageType: z.enum(["BEFORE", "AFTER"]),
  fileName: z.string().min(1).max(255),
  base64Data: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  // Apply security headers
  applySecurityHeaders(event);

  // Apply rate limiting (30 uploads per minute per IP)
  applyRateLimit(event, uploadRateLimit);

  const user = await requireAuth(event);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "ID harus diisi",
    });
  }

  // Validate input
  const result = uploadSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: result.error.issues[0].message,
    });
  }

  const { imageType, fileName, base64Data } = result.data;

  // Check if record exists and user has access
  const record = await prisma.packingRecord.findUnique({
    where: { id },
    include: {
      images: {
        where: { imageType },
      },
    },
  });

  if (!record) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: "Record tidak ditemukan",
    });
  }

  // Check access
  if (record.userId !== user.id && user.role === "USER") {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
      message: "Anda tidak memiliki akses untuk mengupload ke record ini",
    });
  }

  // Check max images (5 per type)
  if (record.images.length >= 5) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: `Maksimal 5 foto ${imageType.toLowerCase()} sudah tercapai`,
    });
  }

  // Validate base64 image
  const base64Validation = validateBase64Image(base64Data);
  if (!base64Validation.isValid) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: base64Validation.error || "Format gambar tidak valid",
    });
  }

  // Save file locally first
  const config = useRuntimeConfig();
  const uploadDir = config.uploadTempDir || "./uploads/temp";
  const safeFileName = sanitizeFileName(fileName);
  const uniqueFileName = `${Date.now()}-${safeFileName}`;
  const localPath = join(uploadDir, id, uniqueFileName);

  try {
    // Create directory if not exists
    await mkdir(join(uploadDir, id), { recursive: true });

    // Decode base64
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
    let buffer = Buffer.from(base64Content, "base64");

    // Validate image content
    const imageValidation = await validateImage(buffer);
    if (!imageValidation.isValid) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: imageValidation.error || "Gambar tidak valid",
      });
    }

    // Compress image to max 1MB
    const compressed = await compressImage(buffer, {
      maxWidth: 1920,
      maxHeight: 1440,
      maxSizeBytes: 1024 * 1024, // 1MB
      quality: 85,
      format: "jpeg",
    });

    console.log(
      `Image compressed: ${compressed.originalSize} -> ${
        compressed.compressedSize
      } bytes (${Math.round(
        (1 - compressed.compressedSize / compressed.originalSize) * 100
      )}% reduction)`
    );

    // Use compressed buffer
    buffer = compressed.buffer;
    await writeFile(localPath, buffer);

    // Calculate displayOrder (auto-increment per type)
    const maxOrder = await prisma.packingImage.findFirst({
      where: {
        packingRecordId: id,
        imageType,
      },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });
    const displayOrder = (maxOrder?.displayOrder || 0) + 1;

    // Create image record with compression metadata
    const image = await prisma.packingImage.create({
      data: {
        packingRecordId: id,
        imageType,
        fileName: uniqueFileName.replace(/\.[^/.]+$/, ".jpg"), // Ensure .jpg extension
        localPath,
        uploadStatus: "PENDING",
        uploadProgress: 0,
        displayOrder,
      },
    });

    // Add to upload queue
    await addToUploadQueue(image.id);

    return {
      success: true,
      data: {
        ...image,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        dimensions: `${compressed.width}x${compressed.height}`,
      },
      message: "Foto berhasil diupload dan masuk antrian",
    };
  } catch (error) {
    console.error("Upload error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      message: "Gagal menyimpan foto",
    });
  }
});
