import api from "./axios";

export const authAPI = {
  getCsrfCookie: () => api.get("/sanctum/csrf-cookie", { baseURL: "/" }),
  register: (data) => api.post("/register", data),
  login: (data) => api.post("/login", data),
  logout: () => api.post("/logout"),
  getUser: () => api.get("/user"),
  resendVerification: () => api.post("/email/resend"),
  // Link-based password reset
  forgotPassword: (email) => api.post("/forgot-password", { email }),
  resetPassword: (data) => api.post("/reset-password", data),
  // OTP-based password reset
  forgotPasswordOtp: (email) => api.post("/forgot-password-otp", { email }),
  verifyOtp: (data) => api.post("/verify-otp", data),
  resetPasswordOtp: (data) => api.post("/reset-password-otp", data),
};

export const profileAPI = {
  update: (data) => api.put("/user", data),
  uploadAvatar: (formData) =>
    api.post("/user/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteAvatar: () => api.delete("/user/avatar"),
  changePassword: (data) => api.post("/user/password", data),
};

export const noteAPI = {
  getAll: (params = {}) => api.get("/notes", { params }),
  getOne: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post("/notes", data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`),
  search: (q) => api.get("/notes/search", { params: { q } }),
  togglePin: (id) => api.patch(`/notes/${id}/pin`),
  setPassword: (id, payload) => api.patch(`/notes/${id}/password`, payload),
  unlock: (id, password) => api.post(`/notes/${id}/unlock`, { password }),
  typing: (id) => api.post(`/notes/${id}/typing`),
};

export const labelAPI = {
  getAll: () => api.get("/labels"),
  create: (data) => api.post("/labels", data),
  update: (id, data) => api.put(`/labels/${id}`, data),
  delete: (id) => api.delete(`/labels/${id}`),
};

export const sharingAPI = {
  share: (noteId, data) => api.post(`/notes/${noteId}/share`, data),
  updatePermission: (noteId, shareId, permission) =>
    api.patch(`/notes/${noteId}/share/${shareId}`, { permission }),
  revoke: (noteId, shareId) =>
    api.delete(`/notes/${noteId}/share/${shareId}`),
  getSharedWithMe: () => api.get("/notes/shared-with-me"),
};

export const preferencesAPI = {
  get: () => api.get("/preferences"),
  update: (preferences) => api.put("/preferences", { preferences }),
  reset: () => api.delete("/preferences"),
};

export const attachmentAPI = {
  upload: (noteId, formData) =>
    api.post(`/notes/${noteId}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getAll: (noteId) => api.get(`/notes/${noteId}/attachments`),
  delete: (noteId, attachmentId) =>
    api.delete(`/notes/${noteId}/attachments/${attachmentId}`),
};

export const notificationAPI = {
  list: () => api.get("/notifications"),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
};
