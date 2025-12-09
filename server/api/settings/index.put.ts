import { prisma } from "../../utils/prisma";
import { requireAdmin } from "../../utils/auth-middleware";
import { z } from "zod";

const updateSettingsSchema = z.object({
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
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  logoUrl: z.string().optional(),
  googleDriveFolderId: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readBody(event);

  // Validate input
  const result = updateSettingsSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Format data tidak valid",
    });
  }

  // Update singleton settings
  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...result.data,
    },
    update: result.data,
  });

  return settings;
});
