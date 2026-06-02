/**
 * ==========================================
 * CLIENTE DE API (AXIOS)
 * ==========================================
 * Centraliza todas as chamadas HTTP do frontend para o backend.
 * 
 * RESPONSABILIDADES:
 * 1. Configurar a URL base (`/api` em produção, via Proxy no Vite em modo local).
 * 2. Injetar automaticamente o Token de Autenticação (JWT) no cabeçalho `Authorization` de TODAS as requisições.
 * 3. Interceptar erros 401 (Não Autorizado) para deslogar o usuário caso o token tenha expirado.
 * 
 * GUIA PARA A IA E DESENVOLVEDORES:
 * - NUNCA use `fetch` diretamente nas páginas. Sempre importe este `client` (ex: `import client from '../api/client'`).
 * - Exemplo de uso: `const res = await client.get('/projects');`
 */
import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto logout if 401 response returned from api
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
