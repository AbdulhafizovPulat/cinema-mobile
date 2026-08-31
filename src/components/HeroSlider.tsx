import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Play, Info, Sparkles, Lock, Layers } from 'lucide-react-native';
import { Movie, MovieCollection } from '../types/cinema';

interface HeroSliderProps {
  movies: Movie[];
  collections?: MovieCollection[];
  onSelectMovie: (movie: Movie) => void;
  onWatchMovie: (movie: Movie) => void;
  onSelectCollection?: (collection: MovieCollection) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const FALLBACK_BANNER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80';

interface SlideItem {
  id: string;
  type: 'movie' | 'collection';
  title: string;
  description: string;
  posterUrl: string;
  movie?: Movie;
  collection?: MovieCollection;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  movies,
  collections = [],
  onSelectMovie,
  onWatchMovie,
  onSelectCollection,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Build slider items from collections & movies
  const slides: SlideItem[] = [];

  // Add promo collections first if available
  collections.slice(0, 3).forEach((col) => {
    const firstMoviePoster = col.movies && col.movies.length > 0 ? col.movies[0].posterUrl : '';
    slides.push({
      id: `col-${col.id}`,
      type: 'collection',
      title: col.title,
      description: col.description || `Эксклюзивная подборка из ${col.movies?.length || 0} фильмов`,
      posterUrl: firstMoviePoster || FALLBACK_BANNER,
      collection: col,
    });
  });

  // Add featured movies
  movies.slice(0, 3).forEach((m) => {
    slides.push({
      id: `mov-${m.id}`,
      type: 'movie',
      title: m.title,
      description: m.description,
      posterUrl: m.posterUrl || FALLBACK_BANNER,
      movie: m,
    });
  });

  const featuredSlides = slides.slice(0, 5);

  useEffect(() => {
    if (featuredSlides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIndex = (prev + 1) % featuredSlides.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * (BANNER_WIDTH + 16),
          animated: true,
        });
        return nextIndex;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [featuredSlides.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== activeIndex && index >= 0 && index < featuredSlides.length) {
      setActiveIndex(index);
    }
  };

  if (!featuredSlides.length) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {featuredSlides.map((slide) => {
          const isCollection = slide.type === 'collection';
          return (
            <TouchableOpacity
              key={slide.id}
              style={styles.bannerCard}
              activeOpacity={0.9}
              onPress={() => {
                if (isCollection && slide.collection && onSelectCollection) {
                  onSelectCollection(slide.collection);
                } else if (slide.movie) {
                  onSelectMovie(slide.movie);
                }
              }}
            >
              <Image
                source={{ uri: slide.posterUrl || FALLBACK_BANNER }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
              {/* Gradient Mask Overlay */}
              <View style={styles.overlay} />

              {/* Badges & Content */}
              <View style={styles.content}>
                <View style={styles.badgeRow}>
                  {isCollection ? (
                    <View style={styles.colBadge}>
                      <Layers size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.colBadgeText}>ПОДБОРКА</Text>
                    </View>
                  ) : (
                    <View style={styles.newBadge}>
                      <Sparkles size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.newBadgeText}>ПРЕМЬЕРА</Text>
                    </View>
                  )}

                  {!isCollection && slide.movie && (
                    slide.movie.isPremium ? (
                      <View style={styles.premBadge}>
                        <Lock size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
                        <Text style={styles.premBadgeText}>PREMIUM</Text>
                      </View>
                    ) : (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>БЕСПЛАТНО</Text>
                      </View>
                    )
                  )}
                </View>

                <Text style={styles.title} numberOfLines={2}>
                  {slide.title}
                </Text>

                <Text style={styles.description} numberOfLines={2}>
                  {slide.description}
                </Text>

                  {/* Action buttons */}
                  <View style={styles.actions}>
                    {isCollection && slide.collection ? (
                      <TouchableOpacity
                        style={styles.watchBtn}
                        onPress={() => onSelectCollection && onSelectCollection(slide.collection!)}
                        activeOpacity={0.8}
                      >
                        <Layers size={16} color="#FFFFFF" />
                        <Text style={styles.watchBtnText}>Смотреть подборку</Text>
                      </TouchableOpacity>
                    ) : slide.movie ? (
                      <>
                        <TouchableOpacity
                          style={styles.watchBtn}
                          onPress={() => onWatchMovie(slide.movie!)}
                          activeOpacity={0.8}
                        >
                          <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                          <Text style={styles.watchBtnText}>Смотреть</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.infoBtn}
                          onPress={() => onSelectMovie(slide.movie!)}
                          activeOpacity={0.8}
                        >
                          <Info size={16} color="#FFFFFF" />
                          <Text style={styles.infoBtnText}>О фильме</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        {featuredSlides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index === activeIndex && styles.activeDot]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  bannerCard: {
    width: BANNER_WIDTH,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 16,
    backgroundColor: '#161622',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 9, 13, 0.4)',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(9, 9, 13, 0.75)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  colBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  colBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  premBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  premBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  },
  freeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  description: {
    color: '#B0B0C0',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  watchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  infoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  infoBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#262638',
  },
  activeDot: {
    width: 18,
    backgroundColor: '#E50914',
  },
});
