import { prisma } from "../../utils/prisma";
import { getTokenFromHeader } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const authorization = getHeader(event, "authorization");
  const token = getTokenFromHeader(authorization);

  if (token) {
    // Delete session
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  return {
    success: true,
    message: "Berhasil logout",
  };
});
