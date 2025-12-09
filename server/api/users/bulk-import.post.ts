import { prisma } from "../../utils/prisma";
import { requireAdmin } from "../../utils/auth-middleware";
import { hashPassword } from "../../utils/auth";
import { bulkUserImportSchema } from "~/schemas";
import type { BulkImportResult } from "~/types";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);

  // Validate input
  const result = bulkUserImportSchema.safeParse(body.users);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Format data tidak valid: " + result.error.issues[0].message,
    });
  }

  const users = result.data;
  const importResult: BulkImportResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  // Get all stores for lookup
  const stores = await prisma.store.findMany();
  const storeMap = new Map(
    stores.map((s: { storeCode: string; id: string }) => [
      s.storeCode.toLowerCase(),
      s.id,
    ])
  );

  // Get all existing emails
  const existingEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map(
      (u: { email: string }) => u.email.toLowerCase()
    )
  );

  // Process each user
  for (let i = 0; i < users.length; i++) {
    const userData = users[i];
    const rowNumber = i + 2; // +2 for header row and 0-index

    try {
      // Check for duplicate email in batch
      if (existingEmails.has(userData.email.toLowerCase())) {
        throw new Error("Email sudah terdaftar");
      }

      // Find store by code
      const storeId = storeMap.get(userData.storeCode.toLowerCase());
      if (!storeId) {
        throw new Error(
          `Store dengan kode "${userData.storeCode}" tidak ditemukan`
        );
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create user
      await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
          storeId,
          isActive: true,
        },
      });

      // Add to existing emails set
      existingEmails.add(userData.email.toLowerCase());
      importResult.success++;
    } catch (error) {
      importResult.failed++;
      importResult.errors.push({
        row: rowNumber,
        email: userData.email,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    success: true,
    data: importResult,
    message: `Import selesai: ${importResult.success} berhasil, ${importResult.failed} gagal`,
  };
});
