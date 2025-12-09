import { prisma } from "../../utils/prisma";
import { requireAuth } from "../../utils/auth-middleware";

export default defineEventHandler(async (event) => {
  await requireAuth(event);

  // Get singleton settings
  let settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });

  // Create default settings if not exists
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: "default",
        logoPosition: "top-left",
        addressPosition: "bottom-left",
        timestampPosition: "bottom-right",
      },
    });
  }

  return settings;
});
