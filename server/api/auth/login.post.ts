import { prisma } from "../../utils/prisma";
import { hashPassword, verifyPassword, generateToken } from "../../utils/auth";
import { loginSchema } from "~/schemas";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Validate input
  const result = loginSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: result.error.issues[0]?.message || "Format data tidak valid",
    });
  }

  const { email, password } = result.data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    include: { store: true },
  });

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      message: "Email atau password salah",
    });
  }

  if (!user.isActive) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      message: "Akun Anda tidak aktif. Hubungi administrator.",
    });
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      message: "Email atau password salah",
    });
  }

  // Generate token
  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    storeId: user.storeId,
    storeName: user.store.storeName,
  };

  const token = await generateToken(authUser);

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  return {
    success: true,
    data: {
      user: authUser,
      token,
    },
  };
});
