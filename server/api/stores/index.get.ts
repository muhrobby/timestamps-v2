import { prisma } from "../../utils/prisma";
import { requireAdminOrOps } from "../../utils/auth-middleware";
import { paginationSchema } from "~/schemas";

export default defineEventHandler(async (event) => {
  await requireAdminOrOps(event);
  const query = getQuery(event);

  const params = paginationSchema.parse(query);
  const { page, limit, search, sortBy, sortOrder } = params;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { storeCode: { contains: search, mode: "insensitive" } },
      { storeName: { contains: search, mode: "insensitive" } },
    ];
  }

  // Get total count
  const total = await prisma.store.count({ where });

  // Get stores with user count
  const stores = await prisma.store.findMany({
    where,
    include: {
      _count: {
        select: { users: true, packingRecords: true },
      },
    },
    orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" },
    skip,
    take: limit,
  });

  return {
    success: true,
    data: stores,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
});
