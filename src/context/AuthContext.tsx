
import { router } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import apiClient, { AuthUser, LoginResponse, registerForceLogoutCallback } from '../services/apiClient';
import { clearTokens, getAccessToken, setTokens } from '../services/tokenStorage';

// ─── Типы ────────────────────────────────────────────────────────────────────

interface AuthState {
  /** true — пользователь прошёл аутентификацию (не гость) */
  isAuthenticated: boolean;
  /** true — идёт начальная инициализация или выполняется запрос login/logout */
  isLoading: boolean;
  /** Данные текущего пользователя, null если гость */
  user: AuthUser | null;
  /** Ошибка последней операции (login / register) */
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  cardNumber?: string;
}

// ─── Контекст ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Хук доступа к контексту ─────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used within <AuthProvider>');
  }
  return ctx;
}

// ─── Провайдер ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,  // стартуем в состоянии загрузки — ждём initSession
    user: null,
    error: null,
  });

  // Используем ref для логаута, чтобы не пересоздавать колбэк при каждом рендере
  const logoutRef = useRef<() => Promise<void>>(undefined);

  // ─── Логаут ────────────────────────────────────────────────────────────────

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Уведомляем бэкенд об аннулировании refresh-токена (best-effort)
      await apiClient.post('/auth/logout').catch(() => { });
    } finally {
      await clearTokens();
      // Удаляем дефолтный Authorization-заголовок инстанса
      delete apiClient.defaults.headers.common.Authorization;
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
    }
  }, []);

  // Обновляем ref при каждом изменении logout
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // ─── Регистрация глобального форс-логаута ─────────────────────────────────
  //
  // Эта функция будет вызвана из response interceptor apiClient, когда
  // refresh-токен оказался невалидным / истёкшим.
  //
  useEffect(() => {
    registerForceLogoutCallback(async () => {
      // Сбрасываем состояние
      await logoutRef.current?.();

      // Показываем дружелюбное уведомление
      Alert.alert(
        'Сессия завершена',
        'Срок действия вашей авторизации истёк. Пожалуйста, войдите снова.',
        [
          { text: 'Позже', style: 'cancel' },
          {
            text: 'Войти',
            onPress: () => router.replace('/auth'),
          },
        ],
        { cancelable: true }
      );
    });
  }, []); // пустой массив — выполняется один раз при монтировании провайдера

  // ─── Инициализация сессии (при старте приложения) ─────────────────────────
  //
  // Если в SecureStore уже есть access-токен — считаем пользователя залогиненным
  // и загружаем его профиль. Если профиль не получается загрузить — сессия
  // сбрасывается (interceptor сам попробует refresh, и если не получится —
  // форс-логаут через колбэк).
  //
  useEffect(() => {
    let cancelled = false;

    async function initSession() {
      try {
        const storedToken = await getAccessToken();

        if (!storedToken) {
          // Токена нет → гостевое состояние
          if (!cancelled) setState((s) => ({ ...s, isLoading: false }));
          return;
        }

        // Пробуем загрузить профиль — interceptor автоматически подставит токен
        const profile = await apiClient.get<AuthUser>('/users/profile');

        if (!cancelled) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: profile.data,
            error: null,
          });
        }
      } catch {
        // Ошибка (например, 401 + неудачный refresh) — interceptor уже вызвал forceLogout.
        // Просто снимаем флаг загрузки.
        if (!cancelled) setState((s) => ({ ...s, isLoading: false }));
      }
    }

    initSession();
    return () => { cancelled = true; };
  }, []);

  // ─── Логин ─────────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });

      // Сохраняем оба токена в защищённое хранилище
      await setTokens(data.token, data.refreshToken);

      // Устанавливаем дефолтный заголовок для последующих запросов текущего инстанса
      apiClient.defaults.headers.common.Authorization = `Bearer ${data.token}`;

      setState({
        isAuthenticated: true,
        isLoading: false,
        user: data.user,
        error: null,
      });
      return true;
    } catch (err: any) {
      const message: string =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Ошибка входа';
      setState((s) => ({ ...s, isLoading: false, error: message }));
      return false;
    }
  }, []);

  // ─── Регистрация ───────────────────────────────────────────────────────────

  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      await apiClient.post('/auth/register', data);

      // Авто-логин после успешной регистрации
      const success = await login(data.email, data.password);
      if (!success) {
        // login() уже установил error внутри себя
        setState((s) => ({ ...s, isLoading: false }));
      }
      return success;
    } catch (err: any) {
      const message: string =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Ошибка регистрации';
      setState((s) => ({ ...s, isLoading: false, error: message }));
      return false;
    }
  }, [login]);

  // ─── Сброс ошибки ──────────────────────────────────────────────────────────

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  // ─── Мемоизация значения контекста ────────────────────────────────────────
  // useMemo предотвращает ненужные ре-рендеры всего дерева при неизменённых данных

  const contextValue = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout, clearError }),
    [state, login, register, logout, clearError]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
