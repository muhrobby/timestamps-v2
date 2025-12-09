import { prisma } from "../../utils/prisma";
import { requireAuth } from "../../utils/auth-middleware";

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const query = getQuery(event);
  const imageIds = query.ids as string;

  if (!imageIds) {
    return {
      success: true,
      data: [],
    };
  }

  const ids = imageIds.split(",").filter(Boolean);

  if (ids.length === 0) {
    return {
      success: true,
      data: [],
    };
  }

  const images = await prisma.packingImage.findMany({
    where: {
      id: { in: ids },
    },
    select: {
      id: true,
      fileName: true,
      uploadStatus: true,
      uploadProgress: true,
      driveUrl: true,
      uploadError: true,
    },
  });

  return {
    success: true,
    data: images,
  };
});
