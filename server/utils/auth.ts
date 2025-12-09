import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { AuthUser } from "~/types";

const getJwtSecret = () => {
  const config = useRuntimeConfig();
  return new TextEncoder().encode(config.jwtSecret);
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function generateToken(user: AuthUser): Promise<string> {
  const config = useRuntimeConfig();
  const expiresIn = config.jwtExpiresIn || "7d";

  // Parse expires in to seconds
  let expiresInSeconds = 7 * 24 * 60 * 60; // default 7 days
  if (expiresIn.endsWith("d")) {
    expiresInSeconds = parseInt(expiresIn) * 24 * 60 * 60;
  } else if (expiresIn.endsWith("h")) {
    expiresInSeconds = parseInt(expiresIn) * 60 * 60;
  } else if (expiresIn.endsWith("m")) {
    expiresInSeconds = parseInt(expiresIn) * 60;
  }

  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    storeId: user.storeId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(getJwtSecret());

  return token;
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as AuthUser["role"],
      storeId: payload.storeId as string,
    };
  } catch {
    return null;
  }
}

export function getTokenFromHeader(
  authorization: string | undefined
): string | null {
  if (!authorization) return null;

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  return null;
}
