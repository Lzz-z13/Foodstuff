import axios from "axios";
import config from "../config.json"

const api = axios.create({
  baseURL: config.API_URL,
  headers: {
    accept: "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

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

const sheets = {
  postLogin: (user) => api.post("/auth/login", user),
  postPasswordResetRequest: (data) =>
    api.post("/auth/password-reset/request", data),
  postPasswordResetVerify: (data) =>
    api.post("/auth/password-reset/verify", data),
  postPasswordResetConfirm: (data) =>
    api.post("/auth/password-reset/confirm", data),
  
  getCashierCommands: () => api.get('/commands'),
  getCashierSummary: () => api.get('/cashier/summary'),
  getCommandCheckout: (commandId, config) => api.get(`/commands/${commandId}/checkout`, config),
  postCommandPayment: (commandId, data) => api.post(`/commands/${commandId}/payments`, data),
  patchCommandServiceFee: (commandId, apply) =>
    api.patch(`/commands/${commandId}/service-fee`, { apply_service_fee: apply }),
  postPixPayment: (commandId) => api.post('/payments/pix', { command_id: commandId }, { timeout: 15000 }),
  getPixPayment: (paymentId, config) => api.get(`/payments/${paymentId}`, config),
  cancelPixPayment: (paymentId) => api.post(`/payments/${paymentId}/cancel`, {}, { timeout: 30000 }),
  
  postUser: (user) => api.post("/users", user),
  getCurrentUser: () => api.get("/users/me"),
  patchMe: (data) => api.patch("/users/me", data),
  patchMePhoto: (photo) => api.patch("/users/me/photo", { photo }),
  patchMePassword: (data) => api.patch("/users/me/password", data),
  getAllUsers: () => api.get("/users"),
  patchUserById: (userId, data) => api.patch(`/users/${userId}`, data),

  postTable: (table) => api.post("/tables", table),
  getAllTables: carregarMesasComStatus,
  deleteTable: (tableId) => api.delete(`/tables/${tableId}`),
  getQrCodesByTable: (tableId) => api.get(`/tables/${tableId}/qr-codes`),
  postQrCode: (tableId, data) => api.post(`/tables/${tableId}/qr-codes`, data),
  putQrCode: (tableId, qrCodeId) =>
    api.put(`/tables/${tableId}/qr-codes/${qrCodeId}`),
  deleteQrCode: (qrCodeId) => api.delete(`/qr-codes/${qrCodeId}`),

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
  patchCategory: (categoryId, data) =>
    api.patch(`/categories/${categoryId}`, data),
  deleteCategory: (categoryId) => api.delete(`/categories/${categoryId}`),

  patchOrderStatus: (orderId, status) =>
    api.patch(`/orders/${orderId}/status`, { status }),

  // Dashboard
  getDashboard: () => api.get("/dashboard"),
  getDashboardResumo: () => api.get("/dashboard/resumo"),
  getDashboardFaturamentoSemanal: () => api.get("/dashboard/faturamento-semanal"),
  getDashboardPedidosPorCategoria: () => api.get("/dashboard/pedidos-por-categoria"),
  getDashboardMaisVendidos: (limit) => api.get("/dashboard/mais-vendidos", { params: { limit } }),
  getDashboardPedidosRecentes: (limit) => api.get("/dashboard/pedidos-recentes", { params: { limit } }),
};

export default sheets;
