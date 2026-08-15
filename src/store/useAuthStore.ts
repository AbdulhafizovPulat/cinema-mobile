import { create } from 'zustand';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { User, UserSubscription } from '../types/cinema';

interface AuthState {
  token: string | null;
  user: User | null;
  subscriptions: UserSubscription[];
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;

  initAuth: () => Promise<void>;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; phoneNumber: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSubscriptions: () => Promise<void>;
  hasActiveSubscription: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  subscriptions: [],
  isAuthenticated: false,
  isGuest: true,
  isLoading: true,
  error: null,

  initAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const storedToken = await storage.getItem('cinema_jwt_token');
      const isGuestStored = await storage.getItem('cinema_is_guest');

      if (storedToken && isGuestStored !== 'true') {
        set({ token: storedToken, isAuthenticated: true, isGuest: false });
        try {
          const profile = await api.getProfile();
          set({ user: profile });
          await get().refreshSubscriptions();
        } catch (e) {
          // Token might be expired, fallback to guest mode
          await storage.removeItem('cinema_jwt_token');
          await get().initAuth();
          return;
        }
      } else {
        // Obtain guest token for seamless browsing
        try {
          const guestLogin = await api.login('guest@cinema.com', 'GuestPassword123!');
          await storage.setItem('cinema_jwt_token', guestLogin.token);
          await storage.setItem('cinema_is_guest', 'true');
          set({
            token: guestLogin.token,
            user: guestLogin.user,
            isAuthenticated: false,
            isGuest: true,
          });
        } catch {
          set({ token: null, isAuthenticated: false, isGuest: true });
        }
      }
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.login(email, password);
      await storage.setItem('cinema_jwt_token', res.token);
      await storage.setItem('cinema_is_guest', 'false');
      set({
        token: res.token,
        user: res.user,
        isAuthenticated: true,
        isGuest: false,
        isLoading: false,
      });
      await get().refreshSubscriptions();
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Ошибка входа', isLoading: false });
      return false;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.register(data);
      // Auto login after registration
      const loginRes = await api.login(data.email, data.password);
      await storage.setItem('cinema_jwt_token', loginRes.token);
      await storage.setItem('cinema_is_guest', 'false');
      set({
        token: loginRes.token,
        user: loginRes.user,
        isAuthenticated: true,
        isGuest: false,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Ошибка регистрации', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await storage.removeItem('cinema_jwt_token');
    await storage.setItem('cinema_is_guest', 'true');
    set({
      token: null,
      user: null,
      subscriptions: [],
      isAuthenticated: false,
      isGuest: true,
      isLoading: false,
    });
    // Re-initialize guest token
    await get().initAuth();
  },

  refreshSubscriptions: async () => {
    if (!get().isAuthenticated) return;
    try {
      const res = await api.getUserSubscriptions();
      set({ subscriptions: res.items || [] });
    } catch (e) {
      console.warn('Failed to load subscriptions', e);
    }
  },

  hasActiveSubscription: () => {
    const { subscriptions } = get();
    if (!subscriptions.length) return false;
    const now = new Date().getTime();
    return subscriptions.some((sub) => new Date(sub.expiresAt).getTime() > now);
  },
}));
