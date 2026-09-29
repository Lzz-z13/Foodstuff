import axios from "axios";

const api = axios.create({
  baseURL: "http://10.89.240.58:5000/api/foodstuff",
  headers: {
    accept: "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = token;
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
  postUser: (user) => api.post("/users", user),
};

export default sheets;
