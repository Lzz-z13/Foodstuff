import axios from "axios";
import * as SecureStore from "expo-secure-store";


// API local do ambiente de demonstração (mesma usada pelo script qr:cliente
// e pelo FrontWeb). O QR Code da mesa precisa ser resolvido na mesma API em
// que foi criado.
// Produção: https://foodstuff-production-862333e7.up.railway.app/api/foodstuff
const BASE_URL = "https://foodstuff-production-862333e7.up.railway.app/api/foodstuff";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const publicApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
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
  postLogin: (user) => api.post("/auth/login", user, { timeout: 15000 }),

  postUser: (user) => api.post("/users", user),
  postTable: (table) => api.post("/tables", table, { timeout: 15000 }),
  getTables: () => api.get("/tables", { timeout: 15000 }),
  deleteTable: (tableId) =>
    api.delete(`/tables/${tableId}`, { timeout: 15000 }),

  getCurrentUser: () => api.get("/users/me"),

  patchUserCredentials: (user) => api.patch("/users/me", user),

  patchUserPhoto: (photo) => api.patch("/users/me/photo", { photo }),

  patchUserPassword: (passwords) => api.patch("/users/me/password", passwords),

  requestPasswordReset: (data) =>
    api.post("/auth/password-reset/request", data, { timeout: 15000 }),

  verifyPasswordReset: (data) =>
    api.post("/auth/password-reset/verify", data, { timeout: 15000 }),

  confirmPasswordReset: (data) =>
    api.post("/auth/password-reset/confirm", data, { timeout: 15000 }),

  // Compatibility with the method name used in main
  updatePassword: (data) => api.patch("/users/me/password", data),

  // Orders
  getAllOrders: () => api.get("/orders"),

  getPedidos: () => api.get("/pedidos"),

  getPedido: (id) => api.get(`/pedidos/${id}`),

  postSolicitarConta: (id) => api.post(`/pedidos/${id}/conta`),

  patchPedidoStatus: (id, dados) => api.patch(`/pedidos/${id}`, dados),

  // Dashboard
  getDashboard: () => api.get("/dashboard"),

  getDashboardResumo: () => api.get("/dashboard/resumo"),

  getFaturamentoSemanal: () => api.get("/dashboard/faturamento-semanal"),

  getPedidosPorCategoria: () => api.get("/dashboard/pedidos-por-categoria"),

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

    return api.get(`/products${queryString ? `?${queryString}` : ""}`);
  },

  getProductById: (productId) => api.get(`/products/${productId}`),

  createProduct: (data) => api.post("/products", data),

  updateProduct: (productId, data) => api.patch(`/products/${productId}`, data),

  updateProductAvailability: (productId, isAvailable) =>
    api.patch(`/products/${productId}/availability`, {
      is_available: isAvailable,
    }),

  deleteProduct: (productId) => api.delete(`/products/${productId}`),

  // Categories
  getCategories: () => api.get("/categories"),

  createCategory: (data) => api.post("/categories", data),

  // Public client routes (no authentication required)
  getPublicProducts: (params = {}) => {
    const query = new URLSearchParams();

    if (params.category_id) {
      query.append("category_id", params.category_id);
    }

    if (params.search) {
      query.append("search", params.search);
    }

    const queryString = query.toString();

    return publicApi.get(
      `/public/products${queryString ? `?${queryString}` : ""}`,
    );
  },

  getPublicProductById: (productId) =>
    publicApi.get(`/public/products/${productId}`),

  getPublicCategories: () => publicApi.get("/public/categories"),

  getPublicCommandBySession: (sessionToken) =>
    publicApi.get(`/public/commands/${sessionToken}`),

  postPublicOrder: (sessionToken, data) =>
    publicApi.post(`/public/commands/${sessionToken}/orders`, data),

  resolveQrCodeByToken: (token) => publicApi.get(`/qr-codes/token/${token}`),

  postCommandByQr: (token, data) =>
    publicApi.post(`/qr-codes/token/${token}/commands`, data),

  // Tables
  getTables: () => api.get("/tables"),
  getTableCommands: (tableId) => api.get(`/tables/${tableId}/commands`),

  // Commands
  getCommand: (commandId) => api.get(`/commands/${commandId}`),
  postCommandOrder: (commandId, items) =>
    api.post(`/commands/${commandId}/orders`, { items }),
  postTableCommand: (tableId, data) =>
    api.post(`/tables/${tableId}/commands`, data),
};

export default sheets;
