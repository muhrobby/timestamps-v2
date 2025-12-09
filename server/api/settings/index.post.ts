import { prisma } from "../../utils/prisma";
import { requireAdmin } from "../../utils/auth-middleware";
import { z } from "zod";

const settingsSchema = z.object({
  logoPosition: z
    .enum([
      "top-left",
      "top-center",
      "top-right",
      "bottom-left",
      "bottom-center",
      "bottom-right",
    ])
    .optional(),
  addressPosition: z
    .enum([
      "top-left",
      "top-center",
      "top-right",
      "bottom-left",
      "bottom-center",
      "bottom-right",
    ])
    .optional(),
  timestampPosition: z
    .enum([
      "top-left",
      "top-center",
      "top-right",
      "bottom-left",
      "bottom-center",
      "bottom-right",
    ])
    .optional(),
  companyName: z.string().optional().nullable(),
  companyAddress: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  googleDriveFolderId: z.string().optional().nullable(),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readBody(event);

  // Validate input
  const result = settingsSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: result.error.issues[0]?.message || "Format data tidak valid",
    });
  }

  const data = result.data;

  // Upsert singleton settings
  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      logoPosition: data.logoPosition || "top-left",
      addressPosition: data.addressPosition || "bottom-left",
      timestampPosition: data.timestampPosition || "bottom-right",
      companyName: data.companyName,
      companyAddress: data.companyAddress,
      logoUrl: data.logoUrl,
      googleDriveFolderId: data.googleDriveFolderId,
    },
    update: {
      ...(data.logoPosition && { logoPosition: data.logoPosition }),
      ...(data.addressPosition && { addressPosition: data.addressPosition }),
      ...(data.timestampPosition && {
        timestampPosition: data.timestampPosition,
      }),
      ...(data.companyName !== undefined && { companyName: data.companyName }),
      ...(data.companyAddress !== undefined && {
        companyAddress: data.companyAddress,
      }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      ...(data.googleDriveFolderId !== undefined && {
        googleDriveFolderId: data.googleDriveFolderId,
      }),
    },
  });

  return settings;
});
