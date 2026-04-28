import api from "./axios";

export const authAPI = {
  getCsrfCookie: () => api.get("/sanctum/csrf-cookie", { baseURL: "/" }),
  register: (data) => api.post("/register", data),
  login: (data) => api.post("/login", data),
  logout: () => api.post("/logout"),
  getUser: () => api.get("/user"),
};

export const noteAPI = {
  getAll: (params = {}) => api.get("/notes", { params }),
  getOne: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post("/notes", data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`),
  search: (q) => api.get("/notes/search", { params: { q } }),
  togglePin: (id) => api.patch(`/notes/${id}/pin`),
  setPassword: (id, password) =>
    api.patch(`/notes/${id}/password`, { password }),
  unlock: (id, password) => api.post(`/notes/${id}/unlock`, { password }),
  move: (id, folderId) => api.patch(`/notes/${id}/move`, { folder_id: folderId }),
};

export const labelAPI = {
  getAll: () => api.get("/labels"),
  create: (data) => api.post("/labels", data),
  update: (id, data) => api.put(`/labels/${id}`, data),
  delete: (id) => api.delete(`/labels/${id}`),
};

export const folderAPI = {
  getAll: () => api.get("/folders"),
  create: (data) => api.post("/folders", data),
  update: (id, data) => api.put(`/folders/${id}`, data),
  delete: (id) => api.delete(`/folders/${id}`),
};

export const sharingAPI = {
  share: (noteId, data) => api.post(`/notes/${noteId}/share`, data),
  revoke: (noteId, shareId) =>
    api.delete(`/notes/${noteId}/share/${shareId}`),
  getSharedWithMe: () => api.get("/notes/shared-with-me"),
};

export const preferencesAPI = {
  get: () => api.get("/preferences"),
  update: (data) => api.put("/preferences", data),
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
