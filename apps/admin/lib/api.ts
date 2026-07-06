import axios from "axios";
import { getSession } from "next-auth/react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: BACKEND,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.user?.accessToken) {
    config.headers.Authorization = `Bearer ${session.user.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const { signOut } = await import("next-auth/react");
      // Sign out clears the session cookie before redirecting,
      // so the proxy won't bounce back to /dashboard.
      await signOut({ callbackUrl: "/login" });
    }
    return Promise.reject(error);
  }
);

export default api;
