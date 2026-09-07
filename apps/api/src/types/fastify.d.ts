import "fastify";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  branchIds: string[];
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
    activeBranchId?: string;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      fullName: string;
      role: string;
      permissions: string[];
      branchIds: string[];
    };
    user: {
      sub: string;
      email: string;
      fullName: string;
      role: string;
      permissions: string[];
      branchIds: string[];
    };
  }
}
