import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '@/constants/config';

export const TOKEN_KEY = 'auth_token';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT on every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      // authStore.logout() is called from the store itself via the 401 event
      // We use a simple event emitter pattern to avoid circular imports
      unauthorizedEmitter.emit();
    }
    return Promise.reject(error);
  }
);

// Minimal event emitter to break circular dep between api.ts and authStore.ts
type Listener = () => void;
const unauthorizedEmitter = (() => {
  const listeners = new Set<Listener>();
  return {
    emit: () => listeners.forEach((l) => l()),
    subscribe: (l: Listener) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
})();

export { unauthorizedEmitter };
export default api;
