import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Play, Star, Lock } from 'lucide-react-native';
import { Movie } from '../types/cinema';

interface MovieCardProps {
  movie: Movie;
  onPress: (movie: Movie) => void;
  width?: number;
}

const DEFAULT_WIDTH = 135;

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onPress, width = DEFAULT_WIDTH }) => {
  const height = width * 1.45;

  return (
    <TouchableOpacity
      style={[styles.card, { width }]}
      onPress={() => onPress(movie)}
      activeOpacity={0.85}
    >
      <View style={[styles.imageContainer, { height }]}>
        <Image
          source={{ uri: movie.posterUrl || 'https://via.placeholder.com/300x450' }}
          style={styles.poster}
          resizeMode="cover"
        />

        {/* Premium / Free Badge */}
        <View style={styles.badgeContainer}>
          {movie.isPremium ? (
            <View style={styles.premiumBadge}>
              <Lock size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={styles.badgeText}>PREMIUM</Text>
            </View>
          ) : (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          )}
        </View>

        {/* Play Icon Overlay */}
        <View style={styles.playOverlay}>
          <View style={styles.playCircle}>
            <Play size={16} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {movie.title}
      </Text>

      <View style={styles.metaRow}>
        <Text style={styles.categoryName} numberOfLines={1}>
          {movie.category?.name || 'Фильм'}
        </Text>
        <View style={styles.ratingRow}>
          <Star size={11} color="#FFC107" fill="#FFC107" />
          <Text style={styles.ratingText}>
            {movie.averageRating && movie.averageRating > 0 ? `${movie.averageRating.toFixed(1)} ${movie.ratingCount ? `(${movie.ratingCount})` : ''}` : '—'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1C1C28',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#262638',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  freeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(229, 9, 20, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  categoryName: {
    color: '#8A8A9E',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    color: '#FFC107',
    fontSize: 11,
    fontWeight: '700',
  },
});
