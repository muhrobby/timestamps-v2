import { prisma } from "../../../utils/prisma";
import { requireAuth } from "../../../utils/auth-middleware";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "ID harus diisi",
    });
  }

  const record = await prisma.packingRecord.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      store: {
        select: {
          id: true,
          storeCode: true,
          storeName: true,
        },
      },
      images: true,
    },
  });

  if (!record) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: "Record tidak ditemukan",
    });
  }

  // Check access based on role
  if (user.role === "USER" && record.userId !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
      message: "Anda tidak memiliki akses untuk melihat record ini",
    });
  }

  if (user.role === "OPS" && record.storeId !== user.storeId) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
      message: "Anda tidak memiliki akses untuk melihat record ini",
    });
  }

  return {
    success: true,
    data: record,
  };
});
