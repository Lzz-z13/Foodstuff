import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.137.1:5000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default {
  postUser: (data) => api.post("/usuarios", data),
  postLogin: (data) => api.post("/login", data),
  getCargos: () => api.get("/cargos"),
};
