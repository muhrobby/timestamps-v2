import { prisma } from "../../../utils/prisma";
import { requireAdminOrOps } from "../../../utils/auth-middleware";

export default defineEventHandler(async (event) => {
  await requireAdminOrOps(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "ID harus diisi",
    });
  }

  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      _count: {
        select: { users: true, packingRecords: true },
      },
    },
  });

  if (!store) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: "Store tidak ditemukan",
    });
  }

  return {
    success: true,
    data: store,
  };
});
