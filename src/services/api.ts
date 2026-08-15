import { storage } from '../utils/storage';
import { Movie, Category, User, SubscriptionType, UserSubscription, PurchaseHistoryItem, MovieCollection, MovieRating } from '../types/cinema';

export const API_BASE_URL = 'https://cinema-backend.cinema-abdulhafizov.workers.dev';

export async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await storage.getItem('cinema_jwt_token');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Ошибка сервера (неверный формат)');
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Ошибка HTTP: ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    return apiFetch<{ message: string; token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(data: { email: string; password: string; firstName: string; lastName: string; phoneNumber: string }) {
    return apiFetch<{ message: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getProfile() {
    return apiFetch<User>('/api/users/profile');
  },

  async updateProfile(data: Partial<User>) {
    return apiFetch<User>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Categories & Movies
  async getCategories() {
    return apiFetch<{ items: Category[] }>('/api/categories');
  },

  async getMovies(params?: { categoryId?: number; search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.categoryId) query.append('categoryId', params.categoryId.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<{ items: Movie[]; page: number; pageSize: number; totalPages: number; totalResults: number }>(`/api/movies${queryString}`);
  },

  async getMovieById(id: number) {
    const res = await apiFetch<{ 
      movie: Movie; 
      ratings?: { averageRating?: number; ratingCount?: number; list?: MovieRating[] }; 
      userAccess?: { hasAccess: boolean; message: string } 
    }>(`/api/movies/${id}`);
    
    if (res && res.movie) {
      return {
        ...res.movie,
        averageRating: res.ratings?.averageRating ?? res.movie.averageRating,
        ratingCount: res.ratings?.ratingCount ?? res.movie.ratingCount,
        hasAccess: res.userAccess?.hasAccess,
        ratingsList: res.ratings?.list || [],
      } as Movie & { hasAccess?: boolean; ratingsList?: MovieRating[] };
    }
    return res as unknown as Movie & { hasAccess?: boolean; ratingsList?: MovieRating[] };
  },

  async getMovieStream(id: number) {
    return apiFetch<{ message: string; videoUrl: string }>(`/api/movies/${id}/stream`);
  },

  async rateMovie(id: number, rating: number, comment?: string) {
    return apiFetch<{ message: string }>(`/api/movies/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
  },

  // Purchases & Subscriptions
  async getSubscriptionTypes() {
    return apiFetch<{ items: SubscriptionType[] }>('/api/purchases/subscription-types');
  },

  async getUserSubscriptions() {
    return apiFetch<{ items: UserSubscription[] }>('/api/purchases/subscriptions');
  },

  async getPurchaseHistory() {
    return apiFetch<{ items: PurchaseHistoryItem[] }>('/api/purchases/history');
  },

  async buyMovie(movieId: number, cardNumber?: string) {
    return apiFetch<{ message: string; purchase: PurchaseHistoryItem }>('/api/purchases/buy-movie', {
      method: 'POST',
      body: JSON.stringify({ movieId, cardNumber: cardNumber || '4444555566667777' }),
    });
  },

  async subscribe(subscriptionTypeId: number, cardNumber?: string) {
    return apiFetch<{ message: string; subscription: UserSubscription }>('/api/purchases/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscriptionTypeId, cardNumber: cardNumber || '4444555566667777' }),
    });
  },

  // Collections
  async getCollections(params?: { page?: number; pageSize?: number; slug?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params?.slug) query.append('slug', params.slug);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<{ items: MovieCollection[]; page: number; pageSize: number; totalPages: number; totalResults: number }>(`/api/collections${queryString}`);
  },

  async getCollectionBySlug(slug: string) {
    return apiFetch<MovieCollection>(`/api/collections/slug/${slug}`);
  },

  async getCollectionById(id: number) {
    return apiFetch<MovieCollection>(`/api/collections/${id}`);
  },
};
