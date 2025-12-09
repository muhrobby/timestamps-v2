import { prisma } from "../../utils/prisma";
import { requireAuth } from "../../utils/auth-middleware";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);

  // Get fresh user data
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    include: { store: true },
  });

  if (!userData) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: "User tidak ditemukan",
    });
  }

  return {
    success: true,
    data: {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      storeId: userData.storeId,
      storeName: userData.store.storeName,
      isActive: userData.isActive,
    },
  };
});
