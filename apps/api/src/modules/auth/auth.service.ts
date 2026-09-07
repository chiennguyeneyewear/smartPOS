import argon2 from "argon2";
import { loginSchema, type LoginInput } from "@smartpos/shared";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";

class AuthError extends Error {
  statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

async function loadAuthContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: { include: { permissions: true } },
      branches: { include: { branch: true } },
    },
  });

  if (!user || !user.isActive) {
    throw new AuthError("Tài khoản không tồn tại hoặc đã bị khóa");
  }

  return user;
}

function buildTokenPayload(user: Awaited<ReturnType<typeof loadAuthContext>>) {
  return {
    sub: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role.name,
    permissions: user.role.permissions.map((p) => p.id),
    branchIds: user.branches.map((b) => b.branchId),
  };
}

function toCurrentUser(user: Awaited<ReturnType<typeof loadAuthContext>>) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role.name,
    permissions: user.role.permissions.map((p) => p.id),
    branches: user.branches.map((b) => ({
      id: b.branch.id,
      name: b.branch.name,
      code: b.branch.code,
    })),
    defaultBranchId: user.defaultBranchId,
  };
}

export async function login(input: LoginInput) {
  const { email, password } = loginSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: { include: { permissions: true } },
      branches: { include: { branch: true } },
    },
  });

  if (!user || !user.isActive) {
    throw new AuthError("Email hoặc mật khẩu không đúng");
  }

  const passwordValid = await argon2.verify(user.passwordHash, password);
  if (!passwordValid) {
    throw new AuthError("Email hoặc mật khẩu không đúng");
  }

  const accessToken = signAccessToken(buildTokenPayload(user));
  const refreshToken = signRefreshToken(user.id);

  return { accessToken, refreshToken, user: toCurrentUser(user) };
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthError("Refresh token không hợp lệ hoặc đã hết hạn");
  }

  const user = await loadAuthContext(payload.sub);
  const accessToken = signAccessToken(buildTokenPayload(user));
  const newRefreshToken = signRefreshToken(user.id);

  return { accessToken, refreshToken: newRefreshToken, user: toCurrentUser(user) };
}

export async function getCurrentUser(userId: string) {
  const user = await loadAuthContext(userId);
  return toCurrentUser(user);
}

export { AuthError };
