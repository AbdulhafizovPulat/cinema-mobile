import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, X, Filter } from 'lucide-react-native';
import { Header } from '../../components/Header';
import { MovieCard } from '../../components/MovieCard';
import { useMovieStore } from '../../store/useMovieStore';
import { Movie } from '../../types/cinema';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function ExploreScreen() {
  const router = useRouter();
  const { movies } = useMovieStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'free' | 'premium'>('all');

  const filteredMovies = movies.filter((movie) => {
    const matchesSearch =
      movie.title.toLowerCase().includes(search.toLowerCase()) ||
      movie.author?.toLowerCase().includes(search.toLowerCase()) ||
      movie.category?.name.toLowerCase().includes(search.toLowerCase()) ||
      (movie.tags && movie.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));

    if (!matchesSearch) return false;

    if (filterType === 'free') return !movie.isPremium;
    if (filterType === 'premium') return movie.isPremium;
    return true;
  });

  const handleSelectMovie = (movie: Movie) => {
    router.push(`/movie/${movie.id}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header />
      <View style={styles.container}>
        <Text style={styles.pageTitle}>Каталог и поиск</Text>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color="#8A8A9E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по названию, тегам или автору..."
            placeholderTextColor="#6E6E82"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={18} color="#8A8A9E" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
              Все ({movies.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'free' && styles.filterChipActive]}
            onPress={() => setFilterType('free')}
          >
            <Text style={[styles.filterChipText, filterType === 'free' && styles.filterChipTextActive]}>
              🟢 Бесплатные
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'premium' && styles.filterChipActive]}
            onPress={() => setFilterType('premium')}
          >
            <Text style={[styles.filterChipText, filterType === 'premium' && styles.filterChipTextActive]}>
              👑 Премиум
            </Text>
          </TouchableOpacity>
        </View>

        {/* Grid List */}
        <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
          {filteredMovies.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Ничего не найдено</Text>
              <Text style={styles.emptySubtext}>Попробуйте изменить поисковый запрос</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filteredMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onPress={handleSelectMovie}
                  width={CARD_WIDTH}
                />
              ))}
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090D',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161622',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#262638',
    gap: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#161622',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262638',
  },
  filterChipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  filterChipText: {
    color: '#8A8A9E',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  gridContainer: {
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtext: {
    color: '#6E6E82',
    fontSize: 13,
  },
});
