import { prisma } from "../../utils/prisma";
import { requireAdmin } from "../../utils/auth-middleware";
import { hashPassword } from "../../utils/auth";
import { userCreateSchema } from "~/schemas";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);

  // Validate input
  const result = userCreateSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: result.error.issues[0]?.message || "Format data tidak valid",
    });
  }

  const { email, password, name, role, storeId, isActive } = result.data;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Email sudah terdaftar",
    });
  }

  // Check if store exists
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Store tidak ditemukan",
    });
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
      storeId,
      isActive,
    },
    include: {
      store: {
        select: {
          id: true,
          storeCode: true,
          storeName: true,
        },
      },
    },
  });

  // Remove password from response
  const { password: _password, ...userData } = user;

  return {
    success: true,
    data: userData,
    message: "User berhasil dibuat",
  };
});
