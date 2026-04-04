import { api, LoginResponse } from "../lib/api";
import { storage } from "../lib/storage";

export async function login(email: string, password: string) {
  const response = await api.post<LoginResponse>("/auth/login", { email, password });
  await storage.setToken(response.data.token);
  return response.data;
}

export async function getCurrentUser() {
  const token = await storage.getToken();
  if (!token) {
    return null;
  }

  try {
    const response = await api.get<{ user: LoginResponse["user"] }>("/auth/me");
    return response.data.user;
  } catch {
    await storage.clearToken();
    return null;
  }
}

export async function logout() {
  await storage.clearToken();
}
