import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Layers, Film } from 'lucide-react-native';
import { api } from '../../services/api';
import { MovieCollection, Movie } from '../../types/cinema';
import { MovieCard } from '../../components/MovieCard';

const FALLBACK_BANNER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80';

export default function CollectionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [collection, setCollection] = useState<MovieCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const numericId = Number(id);
    const fetchPromise = isNaN(numericId)
      ? api.getCollectionBySlug(id)
      : api.getCollectionById(numericId);

    fetchPromise
      .then((data) => {
        setCollection(data);
      })
      .catch((err: any) => {
        console.warn('Error loading collection details:', err);
        setError(err.message || 'Не удалось загрузить подборку');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSelectMovie = (movie: Movie) => {
    router.push(`/movie/${movie.id}`);
  };

  const handleWatchMovie = (movie: Movie) => {
    router.push(`/player?id=${movie.id}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#09090D" />
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>Загрузка подборки...</Text>
      </SafeAreaView>
    );
  }

  if (error || !collection) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#09090D" />
        <TouchableOpacity style={styles.floatingBack} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Film size={48} color="#E50914" style={{ marginBottom: 12 }} />
        <Text style={styles.errorTitle}>Подборка не найдена</Text>
        <Text style={styles.errorSub}>{error || 'Запрошенная коллекция временно недоступна'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Вернуться назад</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const movies = collection.movies || [];
  const bannerImage = movies.length > 0 && movies[0].posterUrl ? movies[0].posterUrl : FALLBACK_BANNER;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#09090D" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Banner Header */}
        <View style={styles.bannerContainer}>
          <Image source={{ uri: bannerImage }} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.overlay} />

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.bannerContent}>
            <View style={styles.badgeRow}>
              <View style={styles.colBadge}>
                <Layers size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.colBadgeText}>ПОДБОРКА</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{movies.length} ФИЛЬМОВ</Text>
              </View>
            </View>

            <Text style={styles.title}>{collection.title}</Text>
            {collection.description ? (
              <Text style={styles.description}>{collection.description}</Text>
            ) : null}
          </View>
        </View>

        {/* Movies Grid */}
        <View style={styles.moviesSection}>
          <Text style={styles.sectionHeader}>Фильмы подборки</Text>
          {movies.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>В этой подборке пока нет фильмов</Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {movies.map((movie) => (
                <View key={movie.id} style={styles.cardWrapper}>
                  <MovieCard
                    movie={movie}
                    onPress={() => handleSelectMovie(movie)}
                    onPlayPress={() => handleWatchMovie(movie)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#09090D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#A0A0B0',
    fontSize: 14,
    marginTop: 12,
  },
  floatingBack: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorSub: {
    color: '#A0A0B0',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#E50914',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  bannerContainer: {
    height: 260,
    width: '100%',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 9, 13, 0.65)',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  bannerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  colBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  colBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  description: {
    color: '#B0B0C0',
    fontSize: 13,
    lineHeight: 18,
  },
  moviesSection: {
    padding: 16,
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#A0A0B0',
    fontSize: 14,
  },
});
