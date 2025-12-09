import { prisma } from "../../utils/prisma";
import { requireAdmin } from "../../utils/auth-middleware";
import { storeCreateSchema } from "~/schemas";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);

  // Validate input
  const result = storeCreateSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: result.error.issues[0].message,
    });
  }

  const { storeCode, storeName } = result.data;

  // Check if store code already exists
  const existingStore = await prisma.store.findUnique({
    where: { storeCode },
  });

  if (existingStore) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Store code sudah digunakan",
    });
  }

  // Create store
  const store = await prisma.store.create({
    data: {
      storeCode,
      storeName,
    },
  });

  return {
    success: true,
    data: store,
    message: "Store berhasil dibuat",
  };
});
