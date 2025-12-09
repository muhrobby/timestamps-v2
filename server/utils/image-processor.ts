import sharp from "sharp";

interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  originalSize: number;
  compressedSize: number;
}

interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxSizeBytes?: number; // Max file size in bytes (default 1MB)
  quality?: number; // JPEG quality 1-100
  format?: "jpeg" | "png" | "webp";
}

const DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
  maxWidth: 1920,
  maxHeight: 1440,
  maxSizeBytes: 1024 * 1024, // 1MB
  quality: 85,
  format: "jpeg",
};

/**
 * Compress and optimize image to target size
 * @param inputBuffer - Original image buffer
 * @param options - Processing options
 * @returns Processed image with metadata
 */
export async function compressImage(
  inputBuffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = inputBuffer.length;

  // Get original image metadata
  const metadata = await sharp(inputBuffer).metadata();

  // Calculate target dimensions maintaining aspect ratio
  let targetWidth = metadata.width || opts.maxWidth;
  let targetHeight = metadata.height || opts.maxHeight;

  if (targetWidth > opts.maxWidth || targetHeight > opts.maxHeight) {
    const aspectRatio = targetWidth / targetHeight;

    if (targetWidth > opts.maxWidth) {
      targetWidth = opts.maxWidth;
      targetHeight = Math.round(targetWidth / aspectRatio);
    }

    if (targetHeight > opts.maxHeight) {
      targetHeight = opts.maxHeight;
      targetWidth = Math.round(targetHeight * aspectRatio);
    }
  }

  // Initial compression
  let quality = opts.quality;
  let outputBuffer: Buffer;

  // Process image with progressive quality reduction until target size
  do {
    const processor = sharp(inputBuffer)
      .resize(targetWidth, targetHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .rotate(); // Auto-rotate based on EXIF

    // Apply format and quality
    switch (opts.format) {
      case "jpeg":
        outputBuffer = await processor
          .jpeg({
            quality,
            progressive: true,
            mozjpeg: true,
          })
          .toBuffer();
        break;
      case "png":
        outputBuffer = await processor
          .png({
            compressionLevel: 9,
            progressive: true,
          })
          .toBuffer();
        break;
      case "webp":
        outputBuffer = await processor
          .webp({
            quality,
            effort: 6,
          })
          .toBuffer();
        break;
      default:
        outputBuffer = await processor.jpeg({ quality }).toBuffer();
    }

    // If still too large, reduce quality
    if (outputBuffer.length > opts.maxSizeBytes && quality > 20) {
      quality -= 10;
    } else {
      break;
    }
  } while (outputBuffer.length > opts.maxSizeBytes && quality > 20);

  // If still too large after quality reduction, reduce dimensions
  while (
    outputBuffer.length > opts.maxSizeBytes &&
    targetWidth > 800 &&
    targetHeight > 600
  ) {
    targetWidth = Math.round(targetWidth * 0.8);
    targetHeight = Math.round(targetHeight * 0.8);

    outputBuffer = await sharp(inputBuffer)
      .resize(targetWidth, targetHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .rotate()
      .jpeg({ quality, progressive: true, mozjpeg: true })
      .toBuffer();
  }

  // Get final metadata
  const finalMetadata = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    width: finalMetadata.width || targetWidth,
    height: finalMetadata.height || targetHeight,
    format: opts.format,
    originalSize,
    compressedSize: outputBuffer.length,
  };
}

/**
 * Extract EXIF data from image
 */
export async function extractImageMetadata(inputBuffer: Buffer): Promise<{
  width?: number;
  height?: number;
  format?: string;
  orientation?: number;
  hasAlpha?: boolean;
  space?: string;
  density?: number;
  exif?: Record<string, unknown>;
}> {
  const metadata = await sharp(inputBuffer).metadata();

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    orientation: metadata.orientation,
    hasAlpha: metadata.hasAlpha,
    space: metadata.space,
    density: metadata.density,
    exif: metadata.exif ? parseExif(metadata.exif) : undefined,
  };
}

/**
 * Parse EXIF buffer to object
 */
function parseExif(exifBuffer: Buffer): Record<string, unknown> {
  try {
    // Basic EXIF parsing - in production use exif-reader library
    return {
      raw: exifBuffer.toString("hex").substring(0, 100) + "...",
    };
  } catch {
    return {};
  }
}

/**
 * Generate thumbnail from image
 */
export async function generateThumbnail(
  inputBuffer: Buffer,
  size: number = 200
): Promise<Buffer> {
  return sharp(inputBuffer)
    .resize(size, size, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Add watermark overlay to image (alternative to canvas approach)
 */
export async function addWatermarkOverlay(
  inputBuffer: Buffer,
  watermarkText: string,
  options: {
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    fontSize?: number;
    color?: string;
  } = {}
): Promise<Buffer> {
  const { position = "bottom-right", fontSize = 24, color = "white" } = options;

  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width || 1920;
  const height = metadata.height || 1440;

  // Create SVG overlay
  const padding = 20;
  let x = padding;
  let y = height - padding;

  if (position.includes("right")) {
    x = width - padding;
  }
  if (position.includes("top")) {
    y = padding + fontSize;
  }

  const textAnchor = position.includes("right") ? "end" : "start";

  const svgOverlay = `
    <svg width="${width}" height="${height}">
      <style>
        .text {
          font-family: Arial, sans-serif;
          font-size: ${fontSize}px;
          fill: ${color};
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }
      </style>
      <text x="${x}" y="${y}" text-anchor="${textAnchor}" class="text">${escapeXml(
    watermarkText
  )}</text>
    </svg>
  `;

  return sharp(inputBuffer)
    .composite([
      {
        input: Buffer.from(svgOverlay),
        gravity: "center",
      },
    ])
    .toBuffer();
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Validate image file
 */
export async function validateImage(inputBuffer: Buffer): Promise<{
  isValid: boolean;
  error?: string;
  format?: string;
  width?: number;
  height?: number;
}> {
  try {
    const metadata = await sharp(inputBuffer).metadata();

    if (!metadata.format) {
      return { isValid: false, error: "Format gambar tidak dikenali" };
    }

    const allowedFormats = [
      "jpeg",
      "jpg",
      "png",
      "webp",
      "gif",
      "heif",
      "heic",
    ];
    if (!allowedFormats.includes(metadata.format.toLowerCase())) {
      return {
        isValid: false,
        error: `Format ${metadata.format} tidak didukung`,
      };
    }

    if (!metadata.width || !metadata.height) {
      return { isValid: false, error: "Tidak dapat membaca dimensi gambar" };
    }

    // Max 50MP (approximately 8000x6250)
    if (metadata.width * metadata.height > 50000000) {
      return {
        isValid: false,
        error: "Ukuran gambar terlalu besar (max 50MP)",
      };
    }

    return {
      isValid: true,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    return {
      isValid: false,
      error:
        error instanceof Error ? error.message : "Gagal memvalidasi gambar",
    };
  }
}
