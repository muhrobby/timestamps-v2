import { prisma } from "../../../utils/prisma";
import { requireAuth } from "../../../utils/auth-middleware";
import { z } from "zod";

const reorderSchema = z.object({
  imageType: z.enum(["BEFORE", "AFTER"]),
  imageIds: z.array(z.string()).min(1).max(5),
});

export default defineEventHandler(async (event) => {
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
  const result = reorderSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: result.error.issues[0]?.message || "Format data tidak valid",
    });
  }

  const { imageType, imageIds } = result.data;

  // Check if record exists and user has access
  const record = await prisma.packingRecord.findUnique({
    where: { id },
    include: {
      images: {
        where: { imageType },
        orderBy: { displayOrder: "asc" },
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
      message: "Anda tidak memiliki akses untuk mengubah urutan foto",
    });
  }

  // Verify all imageIds belong to this record and type
  const existingIds = record.images.map((img) => img.id);
  const invalidIds = imageIds.filter((imgId) => !existingIds.includes(imgId));

  if (invalidIds.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Beberapa ID gambar tidak valid",
    });
  }

  // Update display order for each image
  await prisma.$transaction(
    imageIds.map((imageId, index) =>
      prisma.packingImage.update({
        where: { id: imageId },
        data: { displayOrder: index + 1 },
      })
    )
  );

  // Get updated images
  const updatedImages = await prisma.packingImage.findMany({
    where: {
      packingRecordId: id,
      imageType,
    },
    orderBy: { displayOrder: "asc" },
  });

  return {
    success: true,
    data: updatedImages,
    message: "Urutan foto berhasil diperbarui",
  };
});
