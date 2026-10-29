import axios from "axios";
import * as SecureStore from "expo-secure-store";

const api = axios.create({
  baseURL: "http://10.89.240.52:5000/api/foodstuff",
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
  postTable: (table) => api.post("/tables", table),
  deleteTable: (tableId) => api.delete(`/tables/${tableId}`),

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
};

export default sheets;
