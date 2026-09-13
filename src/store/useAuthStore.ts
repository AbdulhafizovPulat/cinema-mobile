/**
 * useAuthStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Zustand-стор авторизации.
 *
 * Мигрирован на новый стек:
 *  - Хранение токенов: services/tokenStorage (expo-secure-store + refresh token)
 *  - HTTP-клиент: services/apiClient (axios + interceptors с авто-refresh)
 *
 * Гостевой режим сохранён для обратной совместимости с существующими экранами.
 */

import { Alert } from 'react-native';
import { router } from 'expo-router';
import { create } from 'zustand';
import { User, UserSubscription } from '../types/cinema';
import { useFavoriteStore } from './useFavoriteStore';
import apiClient, { LoginResponse, registerForceLogoutCallback } from '../services/apiClient';
import { getAccessToken, setTokens, clearTokens } from '../services/tokenStorage';

// ─── Флаг дебаунса для форс-логаута (предотвращает множественные диалоги) ────
let isHandlingExpiry = false;

// ─── Интерфейс стора ─────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  subscriptions: UserSubscription[];
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;

  initAuth: () => Promise<void>;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  handleTokenExpired: (reason?: string) => Promise<void>;
  refreshSubscriptions: () => Promise<void>;
  hasActiveSubscription: () => boolean;
}

// ─── Хелпер для получения профиля через apiClient ────────────────────────────

async function fetchProfile(): Promise<User> {
  const { data } = await apiClient.get<User>('/users/profile');
  return data;
}

// ─── Zustand стор ────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  subscriptions: [],
  isAuthenticated: false,
  isGuest: true,
  isLoading: true,
  error: null,

  // ── Инициализация при старте приложения ─────────────────────────────────

  initAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const storedToken = await getAccessToken();

      if (storedToken) {
        // Есть сохранённый токен — считаем пользователя залогиненным
        set({ isAuthenticated: true, isGuest: false });
        try {
          const profile = await fetchProfile();
          set({ user: profile });
          await Promise.all([
            get().refreshSubscriptions(),
            useFavoriteStore.getState().loadFavorites(profile.id),
          ]);
        } catch {
          // Токен устарел, а interceptor не смог обновить — resetим сессию
          await clearTokens();
          set({ user: null, subscriptions: [], isAuthenticated: false, isGuest: true });
          await useFavoriteStore.getState().loadFavorites(null);
        }
      } else {
        // Нет токена — гостевой режим (авто-логин гостя для просмотра каталога)
        try {
          const { data } = await apiClient.post<LoginResponse>('/auth/login', {
            email: 'guest@cinema.com',
            password: 'GuestPassword123!',
          });
          // Гостевые токены сохраняем только в памяти инстанса (не в SecureStore)
          apiClient.defaults.headers.common.Authorization = `Bearer ${data.token}`;
          set({ user: data.user as any, isAuthenticated: false, isGuest: true });
          await useFavoriteStore.getState().loadFavorites(null);
        } catch {
          set({ isAuthenticated: false, isGuest: true });
          await useFavoriteStore.getState().loadFavorites(null);
        }
      }
    } catch (err: any) {
      set({ error: err.message });
      await useFavoriteStore.getState().loadFavorites(null);
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Логин ────────────────────────────────────────────────────────────────

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });

      // Сохраняем оба токена в SecureStore
      await setTokens(data.token, data.refreshToken);
      apiClient.defaults.headers.common.Authorization = `Bearer ${data.token}`;

      set({
        user: data.user as any,
        isAuthenticated: true,
        isGuest: false,
        isLoading: false,
      });
      await Promise.all([
        get().refreshSubscriptions(),
        useFavoriteStore.getState().loadFavorites((data.user as any)?.id),
      ]);
      return true;
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Ошибка входа';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  // ── Регистрация ──────────────────────────────────────────────────────────

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/auth/register', data);
      // Авто-логин после успешной регистрации
      const success = await get().login(data.email, data.password);
      if (!success) set({ isLoading: false });
      return success;
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Ошибка регистрации';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  // ── Логаут ───────────────────────────────────────────────────────────────

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiClient.post('/auth/logout').catch(() => {});
    } finally {
      await clearTokens();
      delete apiClient.defaults.headers.common.Authorization;
      set({
        user: null,
        subscriptions: [],
        isAuthenticated: false,
        isGuest: true,
        isLoading: false,
      });
      await useFavoriteStore.getState().loadFavorites(null);
      // Переинициализируем гостевой токен
      await get().initAuth();
    }
  },

  // ── Обработчик форс-выхода (вызывается interceptor-ом при невалидном refresh) ─

  handleTokenExpired: async (_reason?: string) => {
    if (isHandlingExpiry) return;
    isHandlingExpiry = true;

    try {
      await clearTokens();
      delete apiClient.defaults.headers.common.Authorization;
      set({
        user: null,
        subscriptions: [],
        isAuthenticated: false,
        isGuest: true,
        isLoading: false,
        error: null,
      });
      await useFavoriteStore.getState().loadFavorites(null);

      // Восстанавливаем гостевой токен (best-effort)
      try {
        const { data } = await apiClient.post<LoginResponse>('/auth/login', {
          email: 'guest@cinema.com',
          password: 'GuestPassword123!',
        });
        apiClient.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        set({ user: data.user as any });
      } catch {}

      Alert.alert(
        'Сессия завершена',
        'Срок действия вашей авторизации истёк. Пожалуйста, войдите в аккаунт заново.',
        [
          { text: 'Позже', style: 'cancel' },
          { text: 'Войти', onPress: () => router.push('/auth') },
        ],
        { cancelable: true }
      );
    } finally {
      setTimeout(() => { isHandlingExpiry = false; }, 2000);
    }
  },

  // ── Загрузка подписок ────────────────────────────────────────────────────

  refreshSubscriptions: async () => {
    if (!get().isAuthenticated) return;
    try {
      const { data } = await apiClient.get<{ items: UserSubscription[] }>('/purchases/subscriptions');
      set({ subscriptions: data.items || [] });
    } catch (e) {
      console.warn('Failed to load subscriptions', e);
    }
  },

  // ── Проверка активной подписки ───────────────────────────────────────────

  hasActiveSubscription: () => {
    const { subscriptions } = get();
    if (!subscriptions.length) return false;
    const now = Date.now();
    return subscriptions.some((sub) => new Date(sub.expiresAt).getTime() > now);
  },
}));

// ─── Подключаем глобальный форс-логаут к стору ───────────────────────────────
// interceptor apiClient вызовет эту функцию при провале обновления токена
registerForceLogoutCallback(() => {
  useAuthStore.getState().handleTokenExpired();
});
