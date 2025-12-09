import { prisma } from "../../../utils/prisma";
import { requireAdmin } from "../../../utils/auth-middleware";

export default defineEventHandler(async (event) => {
  const authUser = await requireAdmin(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "ID harus diisi",
    });
  }

  // Prevent self-deletion
  if (id === authUser.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Tidak dapat menghapus akun sendiri",
    });
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: "User tidak ditemukan",
    });
  }

  // Delete user
  await prisma.user.delete({
    where: { id },
  });

  return {
    success: true,
    message: "User berhasil dihapus",
  };
});
