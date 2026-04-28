import { create } from "zustand";
import { authAPI } from "../api/services";

function mapUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    displayName: u.display_name || u.displayName,
    email: u.email,
  };
}

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("auth_token"),
  isLoading: false,
  error: null,
  initialized: false,

  register: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      await authAPI.getCsrfCookie();
      const { data } = await authAPI.register(credentials);
      localStorage.setItem("auth_token", data.access_token);
      set({
        user: mapUser(data.user),
        token: data.access_token,
        isLoading: false,
      });
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message || "Registration failed";
      const errors = err.response?.data?.errors || {};
      set({ isLoading: false, error: { message, errors } });
      return { success: false, errors };
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      await authAPI.getCsrfCookie();
      const { data } = await authAPI.login(credentials);
      localStorage.setItem("auth_token", data.access_token);
      set({
        user: mapUser(data.user),
        token: data.access_token,
        isLoading: false,
      });
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message || "Login failed";
      const errors = err.response?.data?.errors || {};
      set({ isLoading: false, error: { message, errors } });
      return { success: false, errors };
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem("auth_token");
    set({ user: null, token: null, isLoading: false, error: null });
  },

  fetchUser: async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const { data } = await authAPI.getUser();
      set({ user: mapUser(data.data || data), token, initialized: true });
    } catch {
      localStorage.removeItem("auth_token");
      set({ user: null, token: null, initialized: true });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
