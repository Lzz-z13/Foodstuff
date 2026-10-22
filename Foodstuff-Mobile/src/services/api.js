import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const getBaseUrl = () => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api/foodstuff";
  }

  return "http://10.89.240.6:5000/api/foodstuff";
};

const api = axios.create({
  baseURL: getBaseUrl(),
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
  postLogin: (user) => api.post("/auth/login", user),
  postUser: (user) => api.post("/users", user),
  getCurrentUser: () => api.get("/users/me"),
  patchUserCredentials: (user) => api.patch("/users/me", user),
  patchUserPassword: (passwords) => api.patch("/users/me/password", passwords),

  // Buscar os pedidos salvos no banco
  getPedidos: () => api.get("/pedidos"),

  // Buscar os detalhes de um pedido
  getPedido: (id) => api.get(`/pedidos/${id}`),

  // Solicitar a conta do pedido
  postSolicitarConta: (id) => api.post(`/pedidos/${id}/conta`),

  // Atualizar o status de um pedido
  patchPedidoStatus: (id, dados) => api.patch(`/pedidos/${id}`, dados),
};

export default sheets;
