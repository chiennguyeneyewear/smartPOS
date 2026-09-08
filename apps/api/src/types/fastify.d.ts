import "fastify";

export interface AuthUser {
  id: string;
  username: string;
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
      username: string;
      role: string;
      permissions: string[];
      branchIds: string[];
    };
    user: {
      sub: string;
      username: string;
      role: string;
      permissions: string[];
      branchIds: string[];
    };
  }
}
