import axios from "axios";
import * as SecureStore from "expo-secure-store";

const api = axios.create({
  baseURL: "http://192.168.100.46:5000/api/foodstuff",
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
};

export default sheets;
