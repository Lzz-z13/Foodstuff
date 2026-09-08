import axios from "axios";

const api = axios.create({
  baseURL: "http://10.89.240.30:5000/api/foodstuff",
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || "";

    if (status === 401) {
      // Só faz logout se for token expirado ou não fornecido (não para 401 do Google Classroom)
      const isTokenError =
        message.includes("Token") ||
        message.includes("token") ||
        message.includes("Expired");

      if (isTokenError) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
      }
    } else if (status === 403) {
      window.location.href = "/home";
    }
    return Promise.reject(error);
  },
);

const sheets = {
  postLogin: (user) => api.post("/auth/login", user),
};

export default sheets;
