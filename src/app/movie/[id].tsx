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
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Play, Lock, Star, Sparkles, ShoppingCart, User, Tag, MessageSquare } from 'lucide-react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Movie } from '../../types/cinema';

export default function MovieDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isGuest, hasActiveSubscription, subscriptions } = useAuthStore();

  const [movie, setMovie] = useState<Movie & { ratingsList?: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Fetch movie data and find user's own review
  const fetchMovieData = () => {
    if (!id) return;
    setLoading(true);
    api
      .getMovieById(Number(id))
      .then((data) => {
        setMovie(data);
        if (user && data.ratingsList) {
          const myReview = data.ratingsList.find((r: any) => r.userId === user.id);
          if (myReview) {
            setUserRating(myReview.rating);
            setUserComment(myReview.comment || '');
            setRatingSubmitted(true);
          }
        }
      })
      .catch((err) => console.warn('Error loading movie details', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMovieData();
  }, [id, user]);

  const handleWatch = () => {
    if (!movie) return;

    if (!movie.isPremium) {
      router.push(`/player?id=${movie.id}`);
      return;
    }

    if (!isAuthenticated || isGuest) {
      router.push('/auth');
      return;
    }

    if (hasActiveSubscription()) {
      router.push(`/player?id=${movie.id}`);
    } else {
      router.push(`/(tabs)/subscribe?movieId=${movie.id}`);
    }
  };

  const handleRateSelect = (stars: number) => {
    setUserRating(stars);
  };

  const submitReview = async () => {
    if (!movie || userRating === 0) {
      Alert.alert('Внимание', 'Пожалуйста, выберите оценку.');
      return;
    }
    if (!isAuthenticated || isGuest) {
      router.push('/auth');
      return;
    }
    try {
      await api.rateMovie(movie.id, userRating, userComment);
      setRatingSubmitted(true);
      Alert.alert('Успех', 'Ваш отзыв успешно сохранен!');
      fetchMovieData(); // Обновляем список отзывов
    } catch (e: any) {
      console.warn('Rating error', e);
      Alert.alert('Ошибка', e.message || 'Не удалось сохранить отзыв');
    }
  };

  if (loading || !movie) {
    return (
      <SafeAreaView style={styles.loadingArea}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>Загрузка деталей фильма...</Text>
      </SafeAreaView>
    );
  }

  const canWatchDirectly = !movie.isPremium || hasActiveSubscription();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#09090D" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Poster Header */}
        <View style={styles.posterContainer}>
          <Image source={{ uri: movie.posterUrl }} style={styles.poster} resizeMode="cover" />
          <View style={styles.posterOverlay} />

          {/* Top Navbar Back Button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Badge */}
          <View style={styles.badgeTopRight}>
            {movie.isPremium ? (
              <View style={styles.premBadge}>
                <Lock size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.premBadgeText}>PREMIUM</Text>
              </View>
            ) : (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>БЕСПЛАТНО</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content Details */}
        <View style={styles.content}>
          <Text style={styles.title}>{movie.title}</Text>

          {/* Meta Info Row */}
          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Star size={14} color="#FFC107" fill="#FFC107" />
              <Text style={styles.ratingValue}>
                {movie.averageRating && movie.averageRating > 0 ? movie.averageRating.toFixed(1) : '—'}
                {movie.ratingCount && movie.ratingCount > 0 ? ` (${movie.ratingCount})` : ''}
              </Text>
            </View>

            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{movie.category?.name || 'Фильм'}</Text>
            </View>

            {movie.author ? (
              <View style={styles.authorRow}>
                <User size={13} color="#8A8A9E" />
                <Text style={styles.authorText}>{movie.author.trim()}</Text>
              </View>
            ) : null}
          </View>

          {/* Big Action Watch / Buy Button */}
          <TouchableOpacity
            style={[styles.mainActionBtn, !canWatchDirectly && styles.buyActionBtn]}
            onPress={handleWatch}
            activeOpacity={0.85}
          >
            {canWatchDirectly ? (
              <>
                <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.mainActionText}>Смотреть фильм</Text>
              </>
            ) : (
              <>
                <Lock size={20} color="#FFFFFF" />
                <Text style={styles.mainActionText}>Оформить подписку</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Description */}
          <Text style={styles.sectionTitle}>Описание</Text>
          <Text style={styles.description}>{movie.description}</Text>

          {/* Tags */}
          {movie.tags && movie.tags.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>Жанры и теги</Text>
              <View style={styles.tagsContainer}>
                {movie.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagChip}>
                    <Tag size={12} color="#8A8A9E" />
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Rating Widget */}
          <View style={styles.ratingCard}>
            <Text style={styles.ratingCardTitle}>
              {ratingSubmitted ? 'Ваша оценка и отзыв' : 'Оцените фильм'}
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRateSelect(star)}
                >
                  <Star
                    size={24}
                    color={star <= userRating ? '#FFC107' : '#333348'}
                    fill={star <= userRating ? '#FFC107' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Что вы думаете о фильме?"
              placeholderTextColor="#8A8A9E"
              multiline
              value={userComment}
              onChangeText={setUserComment}
            />
            <TouchableOpacity style={styles.submitReviewBtn} onPress={submitReview}>
              <Text style={styles.submitReviewText}>
                {ratingSubmitted ? 'Обновить отзыв' : 'Отправить отзыв'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>Отзывы и оценки</Text>
          
          <View style={styles.reviewsSummaryRow}>
            <Text style={styles.bigRatingText}>
              {movie.averageRating && movie.averageRating > 0 ? movie.averageRating.toFixed(1) : '—'}
            </Text>
            <View>
              <Text style={styles.reviewsCountText}>{movie.ratingCount || 0} оценок</Text>
              <Text style={styles.reviewsSubtitleText}>Средний рейтинг</Text>
            </View>
          </View>
          
          {movie.ratingsList && movie.ratingsList.length > 0 ? (
            movie.ratingsList.slice(0, 3).map((rating) => (
              <View key={rating.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAuthorAvatar}>
                    <User size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.reviewAuthorInfo}>
                    <Text style={styles.reviewAuthorName}>
                      {rating.userFirstName ? `${rating.userFirstName} ${rating.userLastName || ''}`.trim() : (rating.userEmail || 'Пользователь')}
                    </Text>
                    <Text style={styles.reviewDate}>
                      {new Date(rating.createdAt).toLocaleDateString('ru-RU')}
                    </Text>
                  </View>
                  <View style={styles.reviewStars}>
                    <Star size={12} color="#FFC107" fill="#FFC107" style={{ marginRight: 4 }} />
                    <Text style={styles.reviewStarValue}>{rating.rating}/5</Text>
                  </View>
                </View>
                {rating.comment ? (
                  <Text style={styles.reviewText}>{rating.comment}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.noReviewsBox}>
              <MessageSquare size={32} color="#333348" style={{ marginBottom: 8 }} />
              <Text style={styles.noReviewsText}>Пока нет отзывов.</Text>
              <Text style={styles.noReviewsSub}>Будьте первым, кто поделится своим мнением!</Text>
            </View>
          )}
          
          {movie.ratingsList && movie.ratingsList.length > 3 && (
            <TouchableOpacity style={styles.showAllReviewsBtn} onPress={() => Alert.alert('В разработке', 'Открытие всех отзывов')}>
               <Text style={styles.showAllReviewsText}>Показать все отзывы ({movie.ratingsList.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090D',
  },
  loadingArea: {
    flex: 1,
    backgroundColor: '#09090D',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#8A8A9E',
    fontSize: 14,
  },
  container: {
    flex: 1,
  },
  posterContainer: {
    width: '100%',
    height: 320,
    position: 'relative',
    backgroundColor: '#161622',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 9, 13, 0.4)',
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  premBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  premBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  freeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  freeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  content: {
    padding: 20,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#09090D',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#161622',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262638',
  },
  ratingValue: {
    color: '#FFC107',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryChip: {
    backgroundColor: '#161622',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262638',
  },
  categoryChipText: {
    color: '#8A8A9E',
    fontSize: 13,
    fontWeight: '600',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorText: {
    color: '#8A8A9E',
    fontSize: 13,
  },
  mainActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#E50914',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  buyActionBtn: {
    backgroundColor: '#6D28D9',
    shadowColor: '#6D28D9',
  },
  mainActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    color: '#A0A0B0',
    fontSize: 14,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#161622',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262638',
  },
  tagText: {
    color: '#8A8A9E',
    fontSize: 12,
  },
  ratingCard: {
    backgroundColor: '#161622',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#262638',
  },
  ratingCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  commentInput: {
    width: '100%',
    backgroundColor: '#09090D',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333348',
  },
  submitReviewBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitReviewText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  reviewsSection: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  reviewsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  bigRatingText: {
    color: '#FFC107',
    fontSize: 48,
    fontWeight: '900',
  },
  reviewsCountText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  reviewsSubtitleText: {
    color: '#8A8A9E',
    fontSize: 13,
  },
  reviewItem: {
    backgroundColor: '#161622',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewAuthorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333348',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewAuthorInfo: {
    flex: 1,
  },
  reviewAuthorName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewDate: {
    color: '#8A8A9E',
    fontSize: 12,
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewStarValue: {
    color: '#FFC107',
    fontSize: 13,
    fontWeight: '700',
  },
  reviewText: {
    color: '#B0B0C0',
    fontSize: 14,
    lineHeight: 20,
  },
  noReviewsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#161622',
    borderRadius: 16,
  },
  noReviewsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  noReviewsSub: {
    color: '#8A8A9E',
    fontSize: 13,
  },
  showAllReviewsBtn: {
    marginTop: 8,
    paddingVertical: 14,
    backgroundColor: '#161622',
    borderRadius: 12,
    alignItems: 'center',
  },
  showAllReviewsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
