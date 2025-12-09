import { prisma } from "../../../utils/prisma";
import { requireAdmin } from "../../../utils/auth-middleware";
import { storeUpdateSchema } from "~/schemas";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

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
  const result = storeUpdateSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: result.error.issues[0].message,
    });
  }

  const updateData = result.data;

  // Check if store exists
  const existingStore = await prisma.store.findUnique({
    where: { id },
  });

  if (!existingStore) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: "Store tidak ditemukan",
    });
  }

  // Check if store code is taken by another store
  if (
    updateData.storeCode &&
    updateData.storeCode !== existingStore.storeCode
  ) {
    const codeExists = await prisma.store.findUnique({
      where: { storeCode: updateData.storeCode },
    });

    if (codeExists) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "Store code sudah digunakan",
      });
    }
  }

  // Update store
  const store = await prisma.store.update({
    where: { id },
    data: updateData,
  });

  return {
    success: true,
    data: store,
    message: "Store berhasil diupdate",
  };
});
