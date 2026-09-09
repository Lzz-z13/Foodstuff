import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.100.46:5000/api/foodstuff",
  headers: {
    "Content-Type": "application/json",
  },
});

export default {
  postUser: (data) => api.post("/usuarios", data),
  postLogin: (data) => api.post("/login", data),
  getCargos: () => api.get("/cargos"),
};
