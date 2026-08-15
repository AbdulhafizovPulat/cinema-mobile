import { create } from 'zustand';
import { api } from '../services/api';
import { Movie, Category, MovieCollection } from '../types/cinema';

interface MovieState {
  movies: Movie[];
  categories: Category[];
  collections: MovieCollection[];
  selectedCategoryId: number | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  fetchCatalog: () => Promise<void>;
  selectCategory: (id: number | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useMovieStore = create<MovieState>((set, get) => ({
  movies: [],
  categories: [],
  collections: [],
  selectedCategoryId: null,
  searchQuery: '',
  isLoading: false,
  error: null,

  fetchCatalog: async () => {
    set({ isLoading: true, error: null });
    try {
      const [catsRes, moviesRes, collectionsRes] = await Promise.all([
        api.getCategories().catch(() => ({ items: [] })),
        api.getMovies().catch(() => ({ items: [] })),
        api.getCollections().catch(() => ({ items: [] })),
      ]);

      const moviesList = moviesRes.items || [];
      const collectionsList = (collectionsRes.items || []).filter((col) => col.isActive !== false);
      const filteredCategories = (catsRes.items || []).filter((cat) =>
        moviesList.some((movie) => movie.category?.id === cat.id)
      );

      set({
        categories: filteredCategories,
        movies: moviesList,
        collections: collectionsList,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message || 'Ошибка загрузки каталога', isLoading: false });
    }
  },

  selectCategory: (id) => {
    set({ selectedCategoryId: id });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },
}));
