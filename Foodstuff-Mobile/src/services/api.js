import axios from "axios";
import * as SecureStore from "expo-secure-store";

const api = axios.create({
  baseURL:
    process.env.EXPO_PUBLIC_API_URL ||
    "https://foodstuff-production-862333e7.up.railway.app/api/foodstuff",
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

// Compatibilidade com APIs que ainda retornam apenas id e número da mesa.
async function carregarMesasComStatus() {
  const response = await api.get("/tables", { timeout: 15000 });
  const tables = response.data?.data;
  if (!Array.isArray(tables)) throw new Error("Resposta de mesas inválida.");
  const data = await Promise.all(tables.map(async (table) => {
    const status = String(table.status || "").trim().toLowerCase();
    if (["livre", "ocupada"].includes(status)) return { ...table, status };
    let commands = table.active_commands;
    if (!Array.isArray(commands)) {
      const result = await api.get(`/tables/${table.table_id}/commands`, { timeout: 15000 });
      commands = result.data?.data;
      if (!Array.isArray(commands)) throw new Error("Resposta de comandas inválida.");
    }
    const active = commands.filter(command => ["OPEN", "CLOSED"].includes(String(command.status).toUpperCase()));
    return {
      ...table,
      status: active.length ? "ocupada" : "livre",
      active_commands: active,
      open_commands_count: active.filter(command => String(command.status).toUpperCase() === "OPEN").length,
      awaiting_payment_count: active.filter(command => String(command.status).toUpperCase() === "CLOSED").length,
      occupied_since: active.map(command => command.opened_at).filter(Boolean).sort()[0] || null,
    };
  }));
  return { ...response, data: { ...response.data, data } };
}

function erroFechamento(error) {
  const status = error.response?.status;
  const message = error.response?.data?.message;
  if (typeof message === "string" && message.trim()) return new Error(message);
  if (status === 401) return new Error("Sua sessão expirou. Entre novamente para solicitar a conta.");
  if (status === 403) return new Error("Seu usuário não tem permissão para fechar esta comanda.");
  if (status >= 500) return new Error("A API falhou ao fechar a comanda. Verifique os logs do servidor.");
  if (!error.response) return new Error("Não foi possível conectar à API. Confira a conexão e tente novamente.");
  return new Error(`Não foi possível fechar a comanda (HTTP ${status}).`);
}

async function fecharComanda(commandId) {
  try {
    return await api.post(`/commands/${commandId}/close`, {}, { timeout: 15000 });
  } catch (error) {
    if (![404, 405].includes(error.response?.status)) throw erroFechamento(error);
    // Servidores anteriores fechavam a comanda através de um pedido existente.
    // Não cria itens nem pedidos para conseguir solicitar a conta.
    try {
      const current = await api.get(`/commands/${commandId}`, { timeout: 15000 });
      const command = current.data?.data;
      if (!command?.command_id) throw new Error("A API não retornou a comanda solicitada.");
      if (command.status !== "OPEN") return current;
      const result = await api.get("/pedidos", { timeout: 15000 });
      const orders = Array.isArray(result.data) ? result.data : result.data?.data;
      if (!Array.isArray(orders)) throw new Error("A API não retornou os pedidos da comanda.");
      const order = orders.find(item => String(item.command_id) === String(commandId) && !["CANCELLED", "CANCELADO"].includes(String(item.status).trim().toUpperCase()));
      if (!order) throw new Error("A API publicada ainda não permite fechar comandas vazias. Publique a versão atual da API no Railway para habilitar esse fechamento.");
      const orderId = order.order_id ?? order.id;
      if (!orderId) throw new Error("A API não retornou o identificador do pedido.");
      await api.post(`/pedidos/${orderId}/conta`, {}, { timeout: 15000 });
      // A rota antiga pode retornar apenas o pedido: consulta o estado real da comanda.
      const updated = await api.get(`/commands/${commandId}`, { timeout: 15000 });
      if (!["CLOSED", "PAID", "CANCELLED"].includes(updated.data?.data?.status)) {
        throw new Error("A API não confirmou o fechamento. Atualize a lista e confira a comanda antes de tentar novamente.");
      }
      return updated;
    } catch (fallbackError) {
      throw fallbackError.response || fallbackError.request ? erroFechamento(fallbackError) : fallbackError;
    }
  }
}

const sheets = {
  // Authentication and users
  postLogin: (user) => api.post("/auth/login", user, { timeout: 15000 }),

  postUser: (user) => api.post("/users", user),
  postTable: (table) => api.post("/tables", table, { timeout: 15000 }),
  getTables: carregarMesasComStatus,
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

  // Tables

  getTableCommands: (tableId) => api.get(`/tables/${tableId}/commands`),

  // Commands
  closeCommand: fecharComanda,
  getCommand: (commandId) => api.get(`/commands/${commandId}`),
  postCommandOrder: (commandId, items) =>
    api.post(`/commands/${commandId}/orders`, { items }),
  postTableCommand: (tableId, data) =>
    api.post(`/tables/${tableId}/commands`, data),
};

export default sheets;
