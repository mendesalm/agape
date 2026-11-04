import axios from 'axios';

// Configuração base do Axios para consumir a API FastAPI do e-Sigma Ágape
const defaultBaseUrl =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? '/api'
    : 'http://localhost:8007';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
});

// Interceptor para injetar o Token JWT automaticamente em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bipfy_token') || localStorage.getItem('barix_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
