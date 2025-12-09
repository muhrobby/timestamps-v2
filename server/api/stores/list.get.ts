import { prisma } from "../../utils/prisma";
import { requireAuth } from "../../utils/auth-middleware";

export default defineEventHandler(async (event) => {
  await requireAuth(event);

  const stores = await prisma.store.findMany({
    select: {
      id: true,
      storeCode: true,
      storeName: true,
    },
    orderBy: { storeName: "asc" },
  });

  return {
    success: true,
    data: stores,
  };
});
