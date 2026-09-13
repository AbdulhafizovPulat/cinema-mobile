import { create } from 'zustand';
import { Movie } from '../types/cinema';
import { storage } from '../utils/storage';

interface FavoriteState {
  favorites: Movie[];
  isLoading: boolean;
  currentUserId: number | null;

  loadFavorites: (userId?: number | null) => Promise<void>;
  toggleFavorite: (movie: Movie, userId?: number | null) => Promise<boolean>;
  removeFavorite: (movieId: number, userId?: number | null) => Promise<void>;
  isFavorite: (movieId: number) => boolean;
  clearFavorites: (userId?: number | null) => Promise<void>;
}

const getStorageKey = (userId?: number | null) => {
  return userId ? `cinema_favorites_user_${userId}` : 'cinema_favorites_guest';
};

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  isLoading: false,
  currentUserId: null,

  loadFavorites: async (userId?: number | null) => {
    const targetUserId = userId !== undefined ? userId : get().currentUserId;
    set({ isLoading: true, currentUserId: targetUserId ?? null });
    try {
      const key = getStorageKey(targetUserId);
      const storedData = await storage.getItem(key);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (Array.isArray(parsed)) {
          set({ favorites: parsed, isLoading: false });
          return;
        }
      }
      set({ favorites: [], isLoading: false });
    } catch (e) {
      console.warn('Failed to load favorites from storage:', e);
      set({ favorites: [], isLoading: false });
    }
  },

  toggleFavorite: async (movie: Movie, userId?: number | null) => {
    const targetUserId = userId !== undefined ? userId : get().currentUserId;
    const currentFavorites = get().favorites;
    const exists = currentFavorites.some((m) => Number(m.id) === Number(movie.id));
    let updatedFavorites: Movie[];

    if (exists) {
      updatedFavorites = currentFavorites.filter((m) => Number(m.id) !== Number(movie.id));
    } else {
      updatedFavorites = [movie, ...currentFavorites];
    }

    set({ favorites: updatedFavorites });

    try {
      const key = getStorageKey(targetUserId);
      await storage.setItem(key, JSON.stringify(updatedFavorites));
    } catch (e) {
      console.warn('Failed to save favorites to storage:', e);
    }

    return !exists; // returns true if added, false if removed
  },

  removeFavorite: async (movieId: number, userId?: number | null) => {
    const targetUserId = userId !== undefined ? userId : get().currentUserId;
    const updatedFavorites = get().favorites.filter((m) => Number(m.id) !== Number(movieId));
    set({ favorites: updatedFavorites });

    try {
      const key = getStorageKey(targetUserId);
      await storage.setItem(key, JSON.stringify(updatedFavorites));
    } catch (e) {
      console.warn('Failed to remove favorite from storage:', e);
    }
  },

  isFavorite: (movieId: number) => {
    return get().favorites.some((m) => Number(m.id) === Number(movieId));
  },

  clearFavorites: async (userId?: number | null) => {
    const targetUserId = userId !== undefined ? userId : get().currentUserId;
    set({ favorites: [] });

    try {
      const key = getStorageKey(targetUserId);
      await storage.removeItem(key);
    } catch (e) {
      console.warn('Failed to clear favorites from storage:', e);
    }
  },
}));
