import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/foodstuff",
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
  getAllTables: () => api.get("/tables"),
  deleteTable: (tableId) => api.delete(`/tables/${tableId}`),
  getQrCodesByTable: (tableId) => api.get(`/tables/${tableId}/qr-codes`),
  postQrCode: (tableId, data) => api.post(`/tables/${tableId}/qr-codes`, data),
  putQrCode: (tableId, qrCodeId) =>
    api.put(`/tables/${tableId}/qr-codes/${qrCodeId}`),

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
