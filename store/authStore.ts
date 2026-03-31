import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import api, { TOKEN_KEY, unauthorizedEmitter } from '@/services/api';
import { registerPushToken, unregisterPushToken } from '@/services/notifications';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  unauthorizedEmitter.subscribe(() => get().logout());

  return {
    user: null,
    token: null,
    isLoading: false,
    isInitialized: false,

    initialize: async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const userJson = await SecureStore.getItemAsync('auth_user');
        if (token && userJson) {
          set({ token, user: JSON.parse(userJson) });
        }
      } catch {
        // ignore
      } finally {
        set({ isInitialized: true });
      }
    },

    login: async (email, password) => {
      set({ isLoading: true });
      try {
        const { data } = await api.post<{ status: boolean; token: string; user: User }>(
          '/api/auth/mobile',
          { email, password }
        );

        if (!data.status) {
          throw new Error('Грешен имейл или парола.');
        }

        await SecureStore.setItemAsync(TOKEN_KEY, data.token);
        await SecureStore.setItemAsync('auth_user', JSON.stringify(data.user));
        set({ token: data.token, user: data.user });
        registerPushToken().catch(console.error);
        router.replace('/(tabs)/orders');
      } finally {
        set({ isLoading: false });
      }
    },

    logout: async () => {
      await unregisterPushToken().catch(console.error);
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync('auth_user');
      set({ token: null, user: null });
      router.replace('/(auth)/login');
    },
  };
});
