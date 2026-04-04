import axios from "axios";
import { env } from "../config/env";
import { storage } from "./storage";

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type LoginResponse = {
  token: string;
  user: {
    _id?: string;
    id?: string;
    name?: string;
    email: string;
    phone?: string;
    role: string;
    avatar?: string;
    hospitalId?:
      | string
      | {
          _id?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
  };
};

export async function login(email: string, password: string) {
  const response = await api.post<LoginResponse>("/auth/login", { email, password });
  await storage.setToken(response.data.token);
  return response.data;
}
