import { prisma } from "../utils/prisma";
import bcrypt from "bcryptjs";

export default defineEventHandler(async (event) => {
  // Check if data already seeded
  const adminExists = await prisma.user.findUnique({
    where: { email: "admin@packing.com" },
  });

  if (adminExists) {
    return {
      success: false,
      message: "Database sudah ter-seed dengan data default",
    };
  }

  try {
    console.log("🌱 Seeding database...");

    // Create default store
    const defaultStore = await prisma.store.upsert({
      where: { storeCode: "HQ" },
      update: {},
      create: {
        storeCode: "HQ",
        storeName: "Headquarters",
      },
    });
    console.log("✅ Default store created:", defaultStore.storeName);

    // Create additional stores
    const stores = [
      { storeCode: "JKT-01", storeName: "Jakarta Store 1" },
      { storeCode: "JKT-02", storeName: "Jakarta Store 2" },
      { storeCode: "SBY-01", storeName: "Surabaya Store 1" },
    ];

    for (const store of stores) {
      await prisma.store.upsert({
        where: { storeCode: store.storeCode },
        update: {},
        create: store,
      });
      console.log("✅ Store created:", store.storeName);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const adminUser = await prisma.user.upsert({
      where: { email: "admin@packing.com" },
      update: {},
      create: {
        email: "admin@packing.com",
        password: hashedPassword,
        name: "Administrator",
        role: "ADMIN",
        storeId: defaultStore.id,
        isActive: true,
      },
    });
    console.log("✅ Admin user created:", adminUser.email);

    // Create OPS user
    const opsPassword = await bcrypt.hash("ops123", 12);
    const opsUser = await prisma.user.upsert({
      where: { email: "ops@packing.com" },
      update: {},
      create: {
        email: "ops@packing.com",
        password: opsPassword,
        name: "Operator",
        role: "OPS",
        storeId: defaultStore.id,
        isActive: true,
      },
    });
    console.log("✅ OPS user created:", opsUser.email);

    // Create regular user
    const userPassword = await bcrypt.hash("user123", 12);
    const regularUser = await prisma.user.upsert({
      where: { email: "user@packing.com" },
      update: {},
      create: {
        email: "user@packing.com",
        password: userPassword,
        name: "Regular User",
        role: "USER",
        storeId: defaultStore.id,
        isActive: true,
      },
    });
    console.log("✅ Regular user created:", regularUser.email);

    // Create default settings
    const defaultSettings = [
      { key: "logoUrl", value: "", type: "string" },
      { key: "logoPosition", value: "top-right", type: "string" },
      { key: "timestampPosition", value: "bottom-right", type: "string" },
      { key: "showAddress", value: "true", type: "boolean" },
      {
        key: "address",
        value: "Jl. Contoh Alamat No. 123, Jakarta",
        type: "string",
      },
      { key: "timestampFormat", value: "DD/MM/YYYY HH:mm:ss", type: "string" },
    ];

    for (const setting of defaultSettings) {
      await prisma.appSettings.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      });
    }
    console.log("✅ Default app settings created");

    // Create default watermark settings (singleton)
    await prisma.settings.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        logoPosition: "top-left",
        addressPosition: "bottom-left",
        timestampPosition: "bottom-right",
        companyName: "PT. Contoh Indonesia",
        companyAddress: "Jl. Contoh Alamat No. 123, Jakarta 12345",
        logoUrl: "",
        googleDriveFolderId: "",
      },
    });
    console.log("✅ Default watermark settings created");

    console.log("🎉 Seeding completed!");

    return {
      success: true,
      message: "Database berhasil di-seed dengan data default",
      credentials: {
        admin: { email: "admin@packing.com", password: "admin123" },
        ops: { email: "ops@packing.com", password: "ops123" },
        user: { email: "user@packing.com", password: "user123" },
      },
    };
  } catch (error) {
    console.error("Seeding error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      message: "Terjadi kesalahan saat seeding database",
    });
  }
});
