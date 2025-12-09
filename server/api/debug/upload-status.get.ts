import { prisma } from "../../utils/prisma";

export default defineEventHandler(async (event) => {
  try {
    // Get upload queue status
    const queueStats = await prisma.uploadQueue.groupBy({
      by: ["status"],
      _count: true,
    });

    // Get recent failed uploads
    const failedUploads = await prisma.uploadQueue.findMany({
      where: {
        status: "FAILED",
      },
      include: {
        image: {
          select: {
            id: true,
            fileName: true,
            packingRecordId: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 10,
    });

    // Get recent pending uploads
    const pendingUploads = await prisma.uploadQueue.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        image: {
          select: {
            id: true,
            fileName: true,
            uploadStatus: true,
            uploadError: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 10,
    });

    // Get images upload status
    const imageStats = await prisma.packingImage.groupBy({
      by: ["uploadStatus"],
      _count: true,
    });

    // Get recent failed images
    const failedImages = await prisma.packingImage.findMany({
      where: {
        uploadStatus: "FAILED",
      },
      select: {
        id: true,
        fileName: true,
        uploadError: true,
        uploadProgress: true,
        packingRecordId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    return {
      success: true,
      data: {
        queueStats,
        imageStats,
        failedUploads,
        pendingUploads,
        failedImages,
        summary: {
          totalInQueue: queueStats.reduce((sum, s) => sum + s._count, 0),
          totalImages: imageStats.reduce((sum, s) => sum + s._count, 0),
          failedCount: failedUploads.length,
          pendingCount: pendingUploads.length,
        },
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
});
