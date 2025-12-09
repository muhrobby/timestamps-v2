import { prisma } from "../../../utils/prisma";
import { requireAdmin } from "../../../utils/auth-middleware";
import { hashPassword } from "../../../utils/auth";
import { userUpdateSchema } from "~/schemas";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "ID harus diisi",
    });
  }

  // Validate input
  const result = userUpdateSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: result.error.issues[0]?.message || "Format data tidak valid",
    });
  }

  const updateData = result.data;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: "User tidak ditemukan",
    });
  }

  // Check if email is taken by another user
  if (updateData.email && updateData.email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email: updateData.email },
    });

    if (emailExists) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "Email sudah digunakan",
      });
    }
  }

  // Check if store exists
  if (updateData.storeId) {
    const store = await prisma.store.findUnique({
      where: { id: updateData.storeId },
    });

    if (!store) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "Store tidak ditemukan",
      });
    }
  }

  // Hash password if provided
  if (updateData.password) {
    updateData.password = await hashPassword(updateData.password);
  }

  // Update user
  const user = await prisma.user.update({
    where: { id },
    data: updateData,
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
    message: "User berhasil diupdate",
  };
});
