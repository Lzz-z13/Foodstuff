import axios from "axios";

const api = axios.create({
  baseURL: "https://forked-nontransient-natisha.ngrok-free.dev/api/foodstuff",
  headers: {
    accept: "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Erro ao acessar o localStorage:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

const sheets = {
  postLogin: (user) => api.post("/auth/login", user),
};

export default sheets;
