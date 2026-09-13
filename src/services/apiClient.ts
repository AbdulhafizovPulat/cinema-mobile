/**
 * apiClient.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Централизованный Axios-инстанс с автоматическим управлением токенами:
 *
 *  • Request Interceptor  — добавляет `Authorization: Bearer <access_token>`
 *  • Response Interceptor — при 401 пытается обновить токен через refresh-эндпоинт,
 *    ставит параллельные запросы в очередь (failedQueue) и повторяет их после
 *    успешного обновления. При провале refresh — сбрасывает сессию.
 *
 * Паттерн очереди предотвращает "thundering herd" — ситуацию, когда несколько
 * одновременных запросов, получив 401, все одновременно пытаются обновить токен.
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from './tokenStorage';

// ─── Константы ───────────────────────────────────────────────────────────────

export const API_BASE_URL = 'https://cinema-backend.cinema-abdulhafizov.workers.dev/api';

// ─── Типы ответов ─────────────────────────────────────────────────────────────

export interface LoginResponse {
  message: string;
  /** Access-токен (ключ "token" в ответе бэкенда) */
  token: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  /** Новый access-токен */
  token: string;
  refreshToken: string;
}

export interface AuthUser {
  id: number;
  email: string;
  role: 'client' | 'admin';
  firstName: string;
  lastName: string;
  phoneNumber: string;
  cardNumber?: string | null;
  createdAt: string;
}

// ─── Расширение типа AxiosRequestConfig (флаг для защиты от бесконечных циклов) ─

interface RetryableRequest extends InternalAxiosRequestConfig {
  /** true = запрос уже был повторён после рефреша; повторно не пытаемся */
  _retry?: boolean;
}

// ─── Тип элемента очереди заблокированных запросов ───────────────────────────

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

// ─── Глобальный логаут-колбэк (внедряется из AuthContext / AuthStore) ─────────

type LogoutCallback = () => Promise<void> | void;
let onForceLogout: LogoutCallback | null = null;

/**
 * Зарегистрировать функцию принудительного выхода.
 * Вызывается из useAuthStore сразу после его инициализации.
 */
export function registerForceLogoutCallback(cb: LogoutCallback): void {
  onForceLogout = cb;
}

// ─── Состояние машины обновления токена ──────────────────────────────────────

/**
 * Флаг "обновление токена уже идёт".
 * Все новые 401-запросы, пока флаг true, попадают в failedQueue.
 */
let isRefreshing = false;

/**
 * Очередь промисов запросов, ожидающих завершения обновления токена.
 *
 * Когда refresh завершается успешно, каждый элемент resolve-ится с новым токеном,
 * и оригинальный запрос повторяется с обновлённым заголовком.
 *
 * При ошибке refresh весь список reject-ится, чтобы промисы завершились с ошибкой,
 * а не висели вечно.
 */
const failedQueue: QueueItem[] = [];

/**
 * Завершить все запросы из очереди — либо с новым токеном (success),
 * либо с ошибкой (failure).
 */
function processQueue(error: unknown | null, token: string | null = null): void {
  failedQueue.forEach((item) => {
    if (error) {
      item.reject(error);
    } else {
      item.resolve(token as string);
    }
  });
  // Очищаем очередь после обработки
  failedQueue.length = 0;
}

// ─── Создание инстанса ────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── REQUEST INTERCEPTOR ──────────────────────────────────────────────────────
//
// Перед каждым исходящим запросом читаем access-токен из SecureStore и
// подставляем его в заголовок Authorization.
// Если токена нет — запрос уходит без заголовка (анонимный).
//
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── RESPONSE INTERCEPTOR ────────────────────────────────────────────────────
//
// 1. Успешный ответ (2xx) — пропускаем без изменений.
// 2. Ответ 401:
//    a. Если _retry === true — уже повторяли, бесконечный цикл → reject.
//    b. Если isRefreshing === true — добавляем в failedQueue, ждём.
//    c. Иначе:
//       • Устанавливаем isRefreshing = true и _retry = true.
//       • Получаем refresh-токен из SecureStore.
//       • Вызываем POST /auth/refresh.
//       • При успехе: сохраняем новые токены, processQueue(null, newToken),
//         повторяем оригинальный запрос.
//       • При ошибке: clearTokens(), processQueue(err), форсируем logout.
//
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined;

    // Пропускаем ошибки без конфига (например, сетевые ошибки до отправки)
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    // ─── Обрабатываем только 401 Unauthorized ────────────────────────────
    if (status !== 401) {
      return Promise.reject(error);
    }

    // ─── Защита от бесконечного цикла ────────────────────────────────────
    // Если запрос уже был повторён (или это сам refresh-запрос) — дальше не идём
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // ─── Если refresh уже выполняется — встаём в очередь ─────────────────
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        // Помещаем колбэки в очередь; они вызовутся когда processQueue() сработает
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          // Повторяем оригинальный запрос с новым токеном
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        })
        .catch((queueError) => Promise.reject(queueError));
    }

    // ─── Начинаем процесс обновления токена ──────────────────────────────
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        // Нет refresh-токена → нечего обновлять, форсируем выход
        throw new Error('No refresh token available');
      }

      // Используем чистый axios (не apiClient!) чтобы избежать рекурсивного
      // прохождения через этот же interceptor
      const { data } = await axios.post<RefreshResponse>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const newAccessToken = data.token;
      const newRefreshToken = data.refreshToken;

      // Сохраняем оба обновлённых токена в защищённое хранилище
      await setTokens(newAccessToken, newRefreshToken);

      // Обновляем дефолтный заголовок для всех последующих запросов инстанса
      apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

      // Разблокируем очередь — все ждавшие запросы получат новый токен
      processQueue(null, newAccessToken);

      // Повторяем оригинальный запрос с новым токеном
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh провалился: токен истёк/отозван или сервер недоступен
      processQueue(refreshError, null);

      // Очищаем токены из хранилища
      await clearTokens();

      // Убираем дефолтный заголовок инстанса
      delete apiClient.defaults.headers.common.Authorization;

      // Триггерим глобальный логаут (редирект на экран авторизации)
      onForceLogout?.();

      return Promise.reject(refreshError);
    } finally {
      // В любом случае сбрасываем флаг по завершении попытки обновления
      isRefreshing = false;
    }
  }
);

export default apiClient;
