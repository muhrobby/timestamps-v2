import { prisma } from "../../../utils/prisma";
import { requireAdmin } from "../../../utils/auth-middleware";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "ID harus diisi",
    });
  }

  // Check if store exists
  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true } },
    },
  });

  if (!store) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: "Store tidak ditemukan",
    });
  }

  // Check if store has users
  if (store._count.users > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Store tidak dapat dihapus karena masih memiliki user",
    });
  }

  // Delete store
  await prisma.store.delete({
    where: { id },
  });

  return {
    success: true,
    message: "Store berhasil dihapus",
  };
});
