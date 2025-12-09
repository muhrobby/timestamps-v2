import { prisma } from "../../utils/prisma";
import { requireAdminOrOps } from "../../utils/auth-middleware";
import { paginationSchema } from "~/schemas";

export default defineEventHandler(async (event) => {
  const user = await requireAdminOrOps(event);
  const query = getQuery(event);

  const params = paginationSchema.parse(query);
  const { page, limit, search, sortBy, sortOrder } = params;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { store: { storeName: { contains: search, mode: "insensitive" } } },
    ];
  }

  // If OPS role, only show users from their store
  if (user.role === "OPS") {
    where.storeId = user.storeId;
  }

  // Get total count
  const total = await prisma.user.count({ where });

  // Get users
  const users = await prisma.user.findMany({
    where,
    include: {
      store: {
        select: {
          id: true,
          storeCode: true,
          storeName: true,
        },
      },
    },
    orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" },
    skip,
    take: limit,
  });

  // Remove password from response
  const sanitizedUsers = users.map(
    ({ password: _password, ...userData }) => userData
  );

  return {
    success: true,
    data: sanitizedUsers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
});
