import { prisma } from "../../utils/prisma";
import { requireAuth } from "../../utils/auth-middleware";
import { paginationSchema } from "~/schemas";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const query = getQuery(event);

  const params = paginationSchema.parse(query);
  const { page, limit, search, sortBy, sortOrder } = params;

  const skip = (page - 1) * limit;

  // Build where clause based on role
  const where: Record<string, unknown> = {};

  // USER role can only see their own records
  if (user.role === "USER") {
    where.userId = user.id;
  } else if (user.role === "OPS") {
    // OPS can see all records from their store
    where.storeId = user.storeId;
  }
  // ADMIN can see all records

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  // Get total count
  const total = await prisma.packingRecord.count({ where });

  // Get packing records
  const records = await prisma.packingRecord.findMany({
    where,
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
      images: {
        select: {
          id: true,
          imageType: true,
          fileName: true,
          driveUrl: true,
          uploadStatus: true,
          uploadProgress: true,
        },
      },
    },
    orderBy: sortBy ? { [sortBy]: sortOrder } : { packedAt: "desc" },
    skip,
    take: limit,
  });

  return {
    success: true,
    data: records,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
});
