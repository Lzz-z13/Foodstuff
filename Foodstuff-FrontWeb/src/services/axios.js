import axios from "axios";

const api = axios.create({
  baseURL: "http://[IP]:5000/api/foodstuff",
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
  getAllOrders: () => api.get("/orders"),
  getOrderById: (orderId) => api.get(`/orders/${orderId}`),
  getAllProducts: (params) => api.get("/products", { params }),
  getProductById: (productId) => api.get(`/products/${productId}`),
  postProduct: (data) => api.post("/products", data),
  patchProduct: (productId, data) =>
    api.patch(`/products/${productId}`, data),
  patchProductAvailability: (productId, is_available) =>
    api.patch(`/products/${productId}/availability`, { is_available }),
  deleteProduct: (productId) => api.delete(`/products/${productId}`),
  getAllCategories: () => api.get("/categories"),
  postCategory: (data) => api.post("/categories", data),
};

export default sheets;
