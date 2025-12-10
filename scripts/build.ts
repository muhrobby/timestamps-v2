#!/usr/bin/env node
/**
 * Pre-build script untuk memastikan Prisma di-generate dengan benar
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function preBuild() {
  try {
    console.log("📋 Running Prisma generate...");
    await execAsync("npx prisma generate");
    console.log("✅ Prisma generated successfully");
  } catch (error) {
    console.error("❌ Prisma generation failed:", error);
    process.exit(1);
  }
}

preBuild();
