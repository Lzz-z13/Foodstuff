import axios from "axios";
import * as SecureStore from "expo-secure-store";

const api = axios.create({
  baseURL: "http://10.89.240.37:5000/api/foodstuff",
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
  getCurrentUser: () => api.get("/users/me"),
  patchUserCredentials: (user) => api.patch("/users/me", user),
  patchUserPassword: (passwords) => api.patch("/users/me/password", passwords),
};

export default sheets;
