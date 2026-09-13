import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from './tokenStorage';
import {
  Category,
  Movie,
  MovieCollection,
  MovieRating,
  PurchaseHistoryItem,
  SubscriptionType,
  User,
  UserSubscription,
} from '../types/cinema';

export const API_BASE_URL = 'https://cinema-backend.cinema-abdulhafizov.workers.dev/api';

/**
 * Расширение конфигурации Axios для отслеживания повторных запросов
 */
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/**
 * Описание элемента очереди неудачных запросов во время обновления токена
 */
interface FailedQueueItem {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}

/**
 * Глобальный слушатель выхода из системы (для AuthContext / Zustand)
 */
type LogoutCallback = (reason?: string) => Promise<void> | void;
let logoutCallback: LogoutCallback | null = null;

export function setLogoutHandler(cb: LogoutCallback) {
  logoutCallback = cb;
}

/**
 * Состояние Mutex и очереди запросов
 */
let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

/**
 * Обработка всех отложенных запросов в очереди
 * @param error - ошибка, если рефреш провалился
 * @param token - новый access token, если рефреш успешен
 */
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Централизованный инстанс Axios
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

/**
 * ----------------------------------------------------
 * REQUEST INTERCEPTOR:
 * Автоматически добавляет Authorization: Bearer <token>
 * ----------------------------------------------------
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const accessToken = await getAccessToken();
      if (accessToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (e) {
      console.warn('[apiClient] Не удалось извлечь токен для запроса:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * ----------------------------------------------------
 * RESPONSE INTERCEPTOR:
 * Обработка 401/403 (устаревший токен) и Mutex-очередь
 * ----------------------------------------------------
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const errorData = error.response?.data;
    const errorMessage = (errorData?.error || errorData?.message || '').toLowerCase();

    // Проверяем, является ли ошибка истечением/недействительностью токена
    const isTokenExpired =
      status === 401 ||
      (status === 403 &&
        (errorMessage.includes('просрочен') ||
          errorMessage.includes('неверный') ||
          errorMessage.includes('устарел') ||
          errorMessage.includes('token')));

    // Не перехватываем запросы к аутентификации (логин, регистрация, сам рефреш)
    const isAuthRoute =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh');

    if (isTokenExpired && !isAuthRoute && !originalRequest._retry) {
      // Если токен уже в процессе обновления другим запросом — встаем в очередь
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newAccessToken) => {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Устанавливаем блокировку Mutex
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();

        if (!refreshToken) {
          throw new Error('Refresh token отсутствует в безопасном хранилище');
        }

        // Выполняем запрос на обновление через чистый axios (без интерцепторов)
        const response = await axios.post<{ token: string; refreshToken?: string }>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
        );

        const newAccessToken = response.data?.token;
        const newRefreshToken = response.data?.refreshToken || refreshToken;

        if (!newAccessToken) {
          throw new Error('Сервер не вернул новый токен доступа');
        }

        // 1. Сохраняем новые токены в безопасное хранилище
        await setTokens(newAccessToken, newRefreshToken);

        // 2. Разблокируем и разрешаем все запросы из очереди failedQueue
        processQueue(null, newAccessToken);

        // 3. Повторяем исходный запрос с новым токеном
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        // Ошибка обновления: токены недействительны или истекли
        processQueue(refreshError, null);
        await clearTokens();

        if (logoutCallback) {
          logoutCallback('Срок действия сессии истек. Пожалуйста, авторизуйтесь заново.');
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Хелпер для определения ошибки истечения токена в вызывающих компонентах
 */
export function isTokenExpiredError(error: any): boolean {
  if (!error) return false;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const msg = (error.response?.data?.error || error.response?.data?.message || '').toLowerCase();
    return (
      status === 401 ||
      (status === 403 &&
        (msg.includes('просрочен') || msg.includes('устарел') || msg.includes('токен')))
    );
  }
  return false;
}

/**
 * Обратная совместимость для колбэков
 */
export function setOnTokenExpiredCallback(cb: (msg?: string) => Promise<void> | void) {
  setLogoutHandler(cb);
}

/**
 * Высокоуровневые типизированные методы API для приложения
 */
export const api = {
  // Auth
  async login(email: string, pass: string) {
    const res = await apiClient.post<{ message: string; token: string; refreshToken?: string; user: User }>(
      '/auth/login',
      { email, password: pass }
    );
    if (res.data?.token) {
      await setTokens(res.data.token, res.data.refreshToken || '');
    }
    return res.data;
  },

  async register(data: { email: string; password: string; firstName: string; lastName: string; phoneNumber: string }) {
    const res = await apiClient.post<{ message: string; user: User }>('/auth/register', data);
    return res.data;
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Игнорируем сетевые ошибки при выходе
    } finally {
      await clearTokens();
    }
  },

  async getProfile() {
    const res = await apiClient.get<User>('/users/profile');
    return res.data;
  },

  async updateProfile(data: Partial<User>) {
    const res = await apiClient.put<User>('/users/profile', data);
    return res.data;
  },

  // Categories & Movies
  async getCategories() {
    const res = await apiClient.get<{ items: Category[] }>('/categories');
    return res.data;
  },

  async getMovies(params?: { categoryId?: number; search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.categoryId) query.append('categoryId', params.categoryId.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient.get<{ items: Movie[]; page: number; pageSize: number; totalPages: number; totalResults: number }>(
      `/movies${queryString}`
    );
    return res.data;
  },

  async getMovieById(id: number) {
    const res = await apiClient.get<{
      movie: Movie;
      ratings?: { averageRating?: number; ratingCount?: number; list?: MovieRating[] };
      userAccess?: { hasAccess: boolean; message: string };
    }>(`/movies/${id}`);

    const data = res.data;
    if (data && data.movie) {
      return {
        ...data.movie,
        averageRating: data.ratings?.averageRating ?? data.movie.averageRating,
        ratingCount: data.ratings?.ratingCount ?? data.movie.ratingCount,
        hasAccess: data.userAccess?.hasAccess,
        ratingsList: data.ratings?.list || [],
      } as Movie & { hasAccess?: boolean; ratingsList?: MovieRating[] };
    }
    return data as unknown as Movie & { hasAccess?: boolean; ratingsList?: MovieRating[] };
  },

  async getMovieStream(id: number) {
    const res = await apiClient.get<{ message: string; videoUrl: string }>(`/movies/${id}/stream`);
    return res.data;
  },

  async rateMovie(id: number, rating: number, comment?: string) {
    const res = await apiClient.post<{ message: string }>(`/movies/${id}/rate`, { rating, comment });
    return res.data;
  },

  // Purchases & Subscriptions
  async getSubscriptionTypes() {
    const res = await apiClient.get<{ items: SubscriptionType[] }>('/purchases/subscription-types');
    return res.data;
  },

  async getUserSubscriptions() {
    const res = await apiClient.get<{ items: UserSubscription[] }>('/purchases/subscriptions');
    return res.data;
  },

  async getPurchaseHistory() {
    const res = await apiClient.get<{ items: PurchaseHistoryItem[] }>('/purchases/history');
    return res.data;
  },

  async buyMovie(movieId: number, cardNumber?: string) {
    const res = await apiClient.post<{ message: string; purchase: PurchaseHistoryItem }>('/purchases/buy-movie', {
      movieId,
      cardNumber: cardNumber || '4444555566667777',
    });
    return res.data;
  },

  async subscribe(subscriptionTypeId: number, cardNumber?: string) {
    const res = await apiClient.post<{ message: string; subscription: UserSubscription }>('/purchases/subscribe', {
      subscriptionTypeId,
      cardNumber: cardNumber || '4444555566667777',
    });
    return res.data;
  },

  // Collections
  async getCollections(params?: { page?: number; pageSize?: number; slug?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params?.slug) query.append('slug', params.slug);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient.get<{ items: MovieCollection[]; page: number; pageSize: number; totalPages: number; totalResults: number }>(
      `/collections${queryString}`
    );
    return res.data;
  },

  async getCollectionBySlug(slug: string) {
    const res = await apiClient.get<MovieCollection>(`/collections/slug/${slug}`);
    return res.data;
  },

  async getCollectionById(id: number) {
    const res = await apiClient.get<MovieCollection>(`/collections/${id}`);
    return res.data;
  },
};
