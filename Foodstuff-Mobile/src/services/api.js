
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
  patchUserPassword: (passwords) =>
    api.patch("/users/me/password", passwords),

  getPedidos: () => api.get("/pedidos"),
  getPedido: (id) => api.get(`/pedidos/${id}`),
  postSolicitarConta: (id) => api.post(`/pedidos/${id}/conta`),
  patchPedidoStatus: (id, dados) => api.patch(`/pedidos/${id}`, dados),

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

  updatePassword: (data) => api.patch("/users/me/password", data),
};

export default sheets;