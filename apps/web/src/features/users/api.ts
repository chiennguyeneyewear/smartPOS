import { apiClient } from "@/lib/api-client";

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  role: string;
  roleId: string;
  branches: { id: string; name: string; code: string }[];
  defaultBranchId: string | null;
  menuAccess: string[];
}

export interface RoleRow {
  id: string;
  name: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  roleId: string;
  branchIds: string[];
  menuAccess: string[];
}

export interface UpdateUserInput {
  fullName?: string;
  phone?: string;
  isActive?: boolean;
  roleId?: string;
  password?: string;
  menuAccess?: string[];
  branchIds?: string[];
}

export async function fetchUsers(): Promise<UserRow[]> {
  const { data } = await apiClient.get<{ data: UserRow[] }>("/users");
  return data.data;
}

export async function fetchRoles(): Promise<RoleRow[]> {
  const { data } = await apiClient.get<{ data: RoleRow[] }>("/roles");
  return data.data;
}

export async function createUser(input: CreateUserInput) {
  const { data } = await apiClient.post("/users", input);
  return data;
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const { branchIds, ...rest } = input;
  const { data } = await apiClient.patch(`/users/${id}`, rest);
  if (branchIds) {
    await apiClient.patch(`/users/${id}/branches`, { branchIds });
  }
  return data;
}
