import type { CurrentUser, LoginInput } from "@smartpos/shared";
import { apiClient } from "@/lib/api-client";

export interface LoginResponse {
  accessToken: string;
  user: CurrentUser;
}

export async function loginRequest(input: LoginInput): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", input);
  return data;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data } = await apiClient.get<CurrentUser>("/auth/me");
  return data;
}
