import axios from 'axios';
import { toast } from 'sonner';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3333/api' : '/api')
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexus.token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || 'Não foi possível concluir a operação.';
    if (error.response?.status === 401) {
      localStorage.removeItem('nexus.token');
      if (!location.pathname.includes('/login')) location.href = '/login';
    }
    toast.error(message);
    return Promise.reject(error);
  }
);
