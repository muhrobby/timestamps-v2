import { H3Event, createError } from "h3";
import { verifyToken, getTokenFromHeader } from "../utils/auth";
import type { AuthUser, UserRole } from "~/types";

export async function requireAuth(event: H3Event): Promise<AuthUser> {
  const authorization = getHeader(event, "authorization");
  const token = getTokenFromHeader(authorization);

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      message: "Token tidak ditemukan",
    });
  }

  const user = await verifyToken(token);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      message: "Token tidak valid atau sudah expired",
    });
  }

  // Attach user to event context
  event.context.auth = user;

  return user;
}

export async function requireRole(
  event: H3Event,
  allowedRoles: UserRole[]
): Promise<AuthUser> {
  const user = await requireAuth(event);

  if (!allowedRoles.includes(user.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
      message: "Anda tidak memiliki akses untuk melakukan aksi ini",
    });
  }

  return user;
}

export async function requireAdmin(event: H3Event): Promise<AuthUser> {
  return requireRole(event, ["ADMIN"]);
}

export async function requireAdminOrOps(event: H3Event): Promise<AuthUser> {
  return requireRole(event, ["ADMIN", "OPS"]);
}

export function getAuthUser(event: H3Event): AuthUser | null {
  return event.context.auth || null;
}
