import axios from "axios";
import * as SecureStore from "expo-secure-store";

const api = axios.create({
  baseURL: "http://10.89.240.104:5000/api/foodstuff",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");

  if (token) {
    config.headers.Authorization = token;
  }

  return config;
});

const sheets = {
  postLogin: (user) => api.post("/auth/login", user),
  postUser: (user) => api.post("/users", user),

  getUser: async () => {
    const storedUser = await SecureStore.getItemAsync("user");

    if (!storedUser) {
      throw new Error("Usuário não encontrado no armazenamento local.");
    }

    const parsedUser = JSON.parse(storedUser);

    return {
      data: {
        data: parsedUser,
      },
    };
  },

  updateUser: async (user) => {
    const response = await api.patch("/users/me", user);

    return {
      ...response,
      data: {
        ...response.data,
        data: response.data?.data ?? user,
      },
    };
  },

  updatePassword: (data) =>
    api.patch("/users/me/password", data),

  // Dashboard
  getDashboard: () =>
    api.get("/dashboard"),

  getDashboardResumo: () =>
    api.get("/dashboard/resumo"),

  getFaturamentoSemanal: () =>
    api.get("/dashboard/faturamento-semanal"),

  getPedidosPorCategoria: () =>
    api.get("/dashboard/pedidos-por-categoria"),

  getMaisVendidos: (limit = 5) =>
    api.get(`/dashboard/mais-vendidos?limit=${limit}`),

  getPedidosRecentes: (limit = 5) =>
    api.get(`/dashboard/pedidos-recentes?limit=${limit}`),

  // Produtos
  getProducts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.category_id) query.append("category_id", params.category_id);
    if (params.search)      query.append("search", params.search);
    if (params.is_available !== undefined) query.append("is_available", params.is_available);
    if (params.include_inactive) query.append("include_inactive", "1");
    const qs = query.toString();
    return api.get(`/products${qs ? `?${qs}` : ""}`);
  },

  getProductById: (product_id) =>
    api.get(`/products/${product_id}`),

  createProduct: (data) =>
    api.post("/products", data),

  updateProduct: (product_id, data) =>
    api.patch(`/products/${product_id}`, data),

  updateProductAvailability: (product_id, is_available) =>
    api.patch(`/products/${product_id}/availability`, { is_available }),

  deleteProduct: (product_id) =>
    api.delete(`/products/${product_id}`),

  // Categorias
  getCategories: () =>
    api.get("/categories"),

  createCategory: (data) =>
    api.post("/categories", data),
};

export default sheets;