export interface CategoryLocale {
  localeKey: string;
  title: string;
  description: string;
}

export interface CollectionLocale {
  localeKey: string;
  title: string;
  description: string;
}

export interface MovieCollection {
  id: number;
  title: string;
  slug: string;
  description: string;
  locales?: CollectionLocale[];
  order: number;
  isActive: boolean;
  movies: Movie[];
  movieCount?: number;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  locales?: CategoryLocale[];
  createdAt?: string;
}

export interface Movie {
  id: number;
  title: string;
  description: string;
  posterUrl: string;
  videoUrl: string;
  isPremium: boolean;
  price?: number;
  author: string;
  tags?: string[];
  category?: Category;
  averageRating?: number;
  ratingCount?: number;
  createdAt?: string;
}

export interface MovieRating {
  id: number;
  userId: number;
  rating: number;
  comment?: string | null;
  createdAt: string;
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
}

export interface User {
  id: number;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  cardNumber?: string;
  createdAt?: string;
}

export interface SubscriptionType {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  createdAt?: string;
}

export interface UserSubscription {
  id: number;
  userId: number;
  subscriptionTypeId: number;
  subscriptionName?: string;
  expiresAt: string;
  createdAt: string;
  userEmail?: string;
}

export interface PurchaseHistoryItem {
  id: number;
  userId: number;
  movieId?: number;
  subscriptionTypeId?: number;
  amount: number;
  status: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  items?: T[];
  data?: T;
  message?: string;
  error?: string;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  totalResults?: number;
}
