import { prisma } from "../../utils/prisma";
import { requireAuth } from "../../utils/auth-middleware";
import { packingRecordCreateSchema } from "~/schemas";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const body = await readBody(event);

  // Validate input
  const result = packingRecordCreateSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: result.error.issues[0].message,
    });
  }

  const { invoiceNumber, notes } = result.data;

  // Create packing record
  const packingRecord = await prisma.packingRecord.create({
    data: {
      invoiceNumber,
      notes,
      userId: user.id,
      storeId: user.storeId,
    },
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
    },
  });

  return {
    success: true,
    data: packingRecord,
    message: "Record packing berhasil dibuat",
  };
});
