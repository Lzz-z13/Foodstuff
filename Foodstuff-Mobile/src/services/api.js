import axios from "axios";
import * as SecureStore from "expo-secure-store";

const api = axios.create({
  baseURL: "http://192.168.1.12:5000/api/foodstuff",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const sheets = {
  // Authentication and users
  postLogin: (user) =>
    api.post("/auth/login", user, { timeout: 15000 }),

  postUser: (user) => api.post("/users", user),

  getCurrentUser: () => api.get("/users/me"),

  patchUserCredentials: (user) => api.patch("/users/me", user),

  patchUserPhoto: (photo) =>
    api.patch("/users/me/photo", { photo }),

  patchUserPassword: (passwords) =>
    api.patch("/users/me/password", passwords),

  // Compatibility with the method name used in main
  updatePassword: (data) =>
    api.patch("/users/me/password", data),

  // Orders
  getPedidos: () => api.get("/pedidos"),

  getPedido: (id) => api.get(`/pedidos/${id}`),

  postSolicitarConta: (id) =>
    api.post(`/pedidos/${id}/conta`),

  patchPedidoStatus: (id, dados) =>
    api.patch(`/pedidos/${id}`, dados),

  // Dashboard
  getDashboard: () => api.get("/dashboard"),

  getDashboardResumo: () => api.get("/dashboard/resumo"),

  getFaturamentoSemanal: () =>
    api.get("/dashboard/faturamento-semanal"),

  getPedidosPorCategoria: () =>
    api.get("/dashboard/pedidos-por-categoria"),

  getMaisVendidos: (limit = 5) =>
    api.get(`/dashboard/mais-vendidos?limit=${limit}`),

  getPedidosRecentes: (limit = 5) =>
    api.get(`/dashboard/pedidos-recentes?limit=${limit}`),

  // Products
  getProducts: (params = {}) => {
    const query = new URLSearchParams();

    if (params.category_id) {
      query.append("category_id", params.category_id);
    }

    if (params.search) {
      query.append("search", params.search);
    }

    if (params.is_available !== undefined) {
      query.append("is_available", params.is_available);
    }

    if (params.include_inactive) {
      query.append("include_inactive", "1");
    }

    const queryString = query.toString();

    return api.get(
      `/products${queryString ? `?${queryString}` : ""}`
    );
  },

  getProductById: (productId) =>
    api.get(`/products/${productId}`),

  createProduct: (data) =>
    api.post("/products", data),

  updateProduct: (productId, data) =>
    api.patch(`/products/${productId}`, data),

  updateProductAvailability: (productId, isAvailable) =>
    api.patch(`/products/${productId}/availability`, {
      is_available: isAvailable,
    }),

  deleteProduct: (productId) =>
    api.delete(`/products/${productId}`),

  // Categories
  getCategories: () => api.get("/categories"),

  createCategory: (data) =>
    api.post("/categories", data),
};

export default sheets;