import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useMovieStore } from '../../store/useMovieStore';
import { Header } from '../../components/Header';
import { HeroSlider } from '../../components/HeroSlider';
import { CategorySelector } from '../../components/CategorySelector';
import { MovieSection } from '../../components/MovieSection';
import { Movie, MovieCollection } from '../../types/cinema';

export default function HomeScreen() {
  const router = useRouter();
  const { initAuth, isAuthenticated, isGuest, hasActiveSubscription } = useAuthStore();
  const { movies, categories, collections, selectedCategoryId, isLoading, fetchCatalog, selectCategory } =
    useMovieStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initAuth().then(() => {
      fetchCatalog();
    });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCatalog();
    setRefreshing(false);
  };

  const handleSelectMovie = (movie: Movie) => {
    router.push(`/movie/${movie.id}`);
  };

  const handleSelectCollection = (col: MovieCollection) => {
    router.push(`/collection/${col.id}`);
  };

  const handleWatchMovie = (movie: Movie) => {
    if (!movie.isPremium) {
      // Free movie - watch immediately
      router.push(`/player?id=${movie.id}`);
      return;
    }

    // Premium movie - check auth & subscription
    if (!isAuthenticated || isGuest) {
      router.push('/auth');
      return;
    }

    if (hasActiveSubscription()) {
      router.push(`/player?id=${movie.id}`);
    } else {
      router.push('/(tabs)/subscribe');
    }
  };

  const filteredMovies = selectedCategoryId
    ? movies.filter((m) => m.category?.id === selectedCategoryId)
    : movies;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#09090D" />
      <Header />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#E50914"
            colors={['#E50914']}
          />
        }
      >
        {isLoading && !movies.length ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#E50914" />
            <Text style={styles.loaderText}>Загрузка кинематографа...</Text>
          </View>
        ) : (
          <>
            {/* Hero Featured Slider with Collections */}
            {!selectedCategoryId && (
              <HeroSlider
                movies={movies}
                collections={collections}
                onSelectMovie={handleSelectMovie}
                onWatchMovie={handleWatchMovie}
                onSelectCollection={handleSelectCollection}
              />
            )}

            {/* Horizontal Category Selector */}
            <CategorySelector
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={selectCategory}
            />

            {/* Filtered view if category is selected */}
            {selectedCategoryId ? (
              <MovieSection
                title={categories.find((c) => c.id === selectedCategoryId)?.name || 'Фильмы'}
                movies={filteredMovies}
                onSelectMovie={handleSelectMovie}
              />
            ) : (
              <>
                {/* Dynamic Collections from API */}
                {collections.map((col) => {
                  if (!col.movies || !col.movies.length) return null;
                  return (
                    <MovieSection
                      key={`collection-${col.id}`}
                      title={col.title}
                      movies={col.movies}
                      onSelectMovie={handleSelectMovie}
                      onSeeAll={() => handleSelectCollection(col)}
                    />
                  );
                })}
              </>
            )}

            <View style={{ height: 40 }} />
          </>
        )}
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
    backgroundColor: '#09090D',
  },
  loaderContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#8A8A9E',
    fontSize: 14,
    fontWeight: '500',
  },
});
