import { create } from "zustand";
import { authAPI, profileAPI, preferencesAPI } from "../api/services";
import offlineStore from "../lib/offlineStore";

function mapUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    displayName: u.display_name ?? u.displayName ?? "",
    email: u.email,
    avatarUrl: u.avatar_url ?? null,
    isVerified: Boolean(u.is_verified ?? u.email_verified_at),
    emailVerifiedAt: u.email_verified_at ?? null,
    preferences: u.preferences || null,
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
      await authAPI.getCsrfCookie().catch(() => {});
      const { data } = await authAPI.register(credentials);
      localStorage.setItem("auth_token", data.access_token);
      const user = mapUser(data.user);
      // Cache user profile for offline cold-start.
      offlineStore.putUser(user).catch(() => {});
      set({ user, token: data.access_token, isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed";
      const errors = err.response?.data?.errors || {};
      set({ isLoading: false, error: { message, errors } });
      return { success: false, errors, message };
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      await authAPI.getCsrfCookie().catch(() => {});
      const { data } = await authAPI.login(credentials);
      localStorage.setItem("auth_token", data.access_token);
      const user = mapUser(data.user);
      // Cache user profile for offline cold-start.
      offlineStore.putUser(user).catch(() => {});
      set({ user, token: data.access_token, isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";
      const errors = err.response?.data?.errors || {};
      set({ isLoading: false, error: { message, errors } });
      return { success: false, errors, message };
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch {
      /* ignore */
    }
    localStorage.removeItem("auth_token");
    // Wipe the local offline cache so stale data isn't visible after logout.
    offlineStore.clearAll().catch(() => {});
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
      const user = mapUser(data.data || data);
      // Keep the cache fresh.
      offlineStore.putUser(user).catch(() => {});
      set({ user, token, initialized: true });
    } catch (err) {
      const isNetworkErr =
        !err.response &&
        (err.code === "ERR_NETWORK" || err.message === "Network Error" || !navigator.onLine);

      if (isNetworkErr) {
        // Offline: hydrate from the cached user so ProtectedRoute lets the user in.
        const cached = await offlineStore.getUser().catch(() => null);
        if (cached) {
          set({ user: cached, token, initialized: true });
          return;
        }
      }

      // Auth error or no cached user – clear token and redirect to login.
      localStorage.removeItem("auth_token");
      set({ user: null, token: null, initialized: true });
    }
  },

  resendVerification: async () => {
    try {
      await authAPI.resendVerification();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed to resend",
      };
    }
  },

  forgotPassword: async (email, mode = "link") => {
    try {
      if (mode === "otp") {
        await authAPI.forgotPasswordOtp(email);
      } else {
        await authAPI.forgotPassword(email);
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        errors: err.response?.data?.errors || {},
        message: err.response?.data?.message || "Failed to send reset",
      };
    }
  },

  resetPassword: async (payload, mode = "link") => {
    try {
      if (mode === "otp") {
        await authAPI.resetPasswordOtp(payload);
      } else {
        await authAPI.resetPassword(payload);
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        errors: err.response?.data?.errors || {},
        message: err.response?.data?.message || "Reset failed",
      };
    }
  },

  verifyOtp: async (email, otp) => {
    try {
      await authAPI.verifyOtp({ email, otp });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        errors: err.response?.data?.errors || {},
        message: err.response?.data?.message || "OTP invalid",
      };
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await profileAPI.update(data);
      const user = mapUser(res.data.data || res.data);
      set({ user });
      return { success: true, user };
    } catch (err) {
      return {
        success: false,
        errors: err.response?.data?.errors || {},
        message: err.response?.data?.message || "Update failed",
      };
    }
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await profileAPI.uploadAvatar(formData);
      const user = mapUser(res.data.data || res.data);
      set({ user });
      return { success: true, user };
    } catch (err) {
      return {
        success: false,
        errors: err.response?.data?.errors || {},
        message: err.response?.data?.message || "Upload failed",
      };
    }
  },

  deleteAvatar: async () => {
    try {
      const res = await profileAPI.deleteAvatar();
      const user = mapUser(res.data.data || res.data);
      set({ user });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message };
    }
  },

  changePassword: async (data) => {
    try {
      await profileAPI.changePassword(data);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        errors: err.response?.data?.errors || {},
        message: err.response?.data?.message || "Failed to change password",
      };
    }
  },

  updatePreferences: async (preferences) => {
    try {
      const res = await preferencesAPI.update(preferences);
      const user = mapUser(res.data.data || res.data);
      set({ user });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        errors: err.response?.data?.errors || {},
        message: err.response?.data?.message,
      };
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
