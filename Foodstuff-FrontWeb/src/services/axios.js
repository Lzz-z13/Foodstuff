import axios from "axios";

const api = axios.create({
  baseURL: "http://{IP}:5000/api/foodstuff",
  headers: {
    accept: "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = token;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

const sheets = {
  postLogin: (user) => api.post("/auth/login", user),
  postPasswordResetRequest: (data) =>
    api.post("/auth/password-reset/request", data),
  postPasswordResetVerify: (data) =>
    api.post("/auth/password-reset/verify", data),
  postPasswordResetConfirm: (data) =>
    api.post("/auth/password-reset/confirm", data),
  postUser: (user) => api.post("/users", user),
  postTable: (table) => api.post("/tables", table),
  getAllTables: () => api.get("/tables"),
  deleteTable: (tableId) => api.delete(`/tables/${tableId}`),
  patchMe: (data) => api.patch("/users/me", data),
  patchMePassword: (data) => api.patch("/users/me/password", data),
  getAllUsers: () => api.get("/users"),
  patchUserById: (userId, data) => api.patch(`/users/${userId}`, data),
};

export default sheets;
