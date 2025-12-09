import { prisma } from "../../../utils/prisma";
import { requireAdminOrOps } from "../../../utils/auth-middleware";

export default defineEventHandler(async (event) => {
  const authUser = await requireAdminOrOps(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "ID harus diisi",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      store: {
        select: {
          id: true,
          storeCode: true,
          storeName: true,
        },
      },
    },
  });

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: "User tidak ditemukan",
    });
  }

  // If OPS role, only allow viewing users from their store
  if (authUser.role === "OPS" && user.storeId !== authUser.storeId) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
      message: "Anda tidak memiliki akses untuk melihat user ini",
    });
  }

  // Remove password from response
  const { password: _password, ...userData } = user;

  return {
    success: true,
    data: userData,
  };
});
