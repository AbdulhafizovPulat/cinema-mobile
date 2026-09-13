import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Mail,
  Phone,
  CreditCard,
  History,
  Lock,
  Sparkles,
  Heart,
  Trash2,
  Compass,
} from 'lucide-react-native';
import { Header } from '../../components/Header';
import { MovieCard } from '../../components/MovieCard';
import { useAuthStore } from '../../store/useAuthStore';
import { useFavoriteStore } from '../../store/useFavoriteStore';
import { api } from '../../services/api';
import { Movie, PurchaseHistoryItem } from '../../types/cinema';

export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, isGuest, user, subscriptions, logout } = useAuthStore();
  const favorites = useFavoriteStore((state) => state.favorites);
  const clearFavorites = useFavoriteStore((state) => state.clearFavorites);
  const [history, setHistory] = useState<PurchaseHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      setLoadingHistory(true);
      api
        .getPurchaseHistory()
        .then((res) => setHistory(res.items || []))
        .catch((e) => console.warn(e))
        .finally(() => setLoadingHistory(false));
    }
  }, [isAuthenticated, isGuest]);

  const handleSelectMovie = (movie: Movie) => {
    router.push(`/movie/${movie.id}`);
  };

  const handleClearFavorites = () => {
    Alert.alert(
      'Очистить избранное',
      'Вы уверены, что хотите удалить все фильмы из списка избранного?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: () => clearFavorites(user?.id),
        },
      ]
    );
  };

  const activeSub = subscriptions.find(
    (s) => new Date(s.expiresAt).getTime() > new Date().getTime()
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {isAuthenticated && !isGuest ? (
          <>
            {/* Profile Info Header */}
            <View style={styles.profileCard}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarText}>
                  {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
                </Text>
              </View>
              <Text style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={styles.userRole}>Пользователь • Client</Text>

              {/* Active Subscription Badge */}
              {activeSub ? (
                <View style={styles.subBadgeActive}>
                  <ShieldCheck size={14} color="#10B981" />
                  <Text style={styles.subBadgeActiveText}>
                    Подписка активна ({activeSub.subscriptionName || 'Standard'})
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.subBadgeInactive}
                  onPress={() => router.push('/(tabs)/subscribe')}
                >
                  <Sparkles size={14} color="#FFC107" />
                  <Text style={styles.subBadgeInactiveText}>Нет активной подписки (Оформить)</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Details List */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Личные данные</Text>

              <View style={styles.infoRow}>
                <Mail size={16} color="#8A8A9E" />
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>

              <View style={styles.infoRow}>
                <Phone size={16} color="#8A8A9E" />
                <Text style={styles.infoLabel}>Телефон:</Text>
                <Text style={styles.infoValue}>{user?.phoneNumber || '—'}</Text>
              </View>

              <View style={styles.infoRow}>
                <CreditCard size={16} color="#8A8A9E" />
                <Text style={styles.infoLabel}>Карта:</Text>
                <Text style={styles.infoValue}>
                  {user?.cardNumber ? `•••• ${user.cardNumber.slice(-4)}` : 'Не привязана'}
                </Text>
              </View>
            </View>

            {/* Favorites Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.titleWithIcon}>
                  <Heart size={18} color="#E50914" fill="#E50914" />
                  <Text style={styles.sectionTitle}>Избранные фильмы</Text>
                  {favorites.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{favorites.length}</Text>
                    </View>
                  )}
                </View>
                {favorites.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearFavorites}
                    style={styles.clearFavBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={15} color="#8A8A9E" />
                    <Text style={styles.clearFavText}>Очистить</Text>
                  </TouchableOpacity>
                )}
              </View>

              {favorites.length === 0 ? (
                <View style={styles.emptyFavContainer}>
                  <Heart size={36} color="#333348" />
                  <Text style={styles.emptyFavTitle}>Список избранного пуст</Text>
                  <Text style={styles.emptyFavSubtitle}>
                    Нажимайте сердечко на постерах понравившихся фильмов, чтобы не потерять их
                  </Text>
                  <TouchableOpacity
                    style={styles.exploreBtn}
                    onPress={() => router.push('/(tabs)/explore')}
                    activeOpacity={0.8}
                  >
                    <Compass size={16} color="#FFFFFF" />
                    <Text style={styles.exploreBtnText}>Перейти в каталог</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.favScrollContent}
                >
                  {favorites.map((movie) => (
                    <View key={`fav-${movie.id}`} style={styles.favItemWrapper}>
                      <MovieCard movie={movie} onPress={handleSelectMovie} width={120} />
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Payment History */}
            <View style={styles.sectionCard}>
              <View style={styles.historyTitleRow}>
                <History size={18} color="#FFFFFF" />
                <Text style={styles.sectionTitle}>История покупок</Text>
              </View>

              {loadingHistory ? (
                <ActivityIndicator size="small" color="#E50914" style={{ marginVertical: 12 }} />
              ) : history.length === 0 ? (
                <Text style={styles.emptyHistory}>У вас пока нет покупок</Text>
              ) : (
                history.map((item) => (
                  <View key={item.id} style={styles.historyRow}>
                    <View>
                      <Text style={styles.historyName}>
                        {item.movieId ? `Фильм #${item.movieId}` : `Подписка #${item.subscriptionTypeId}`}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                      </Text>
                    </View>
                    <Text style={styles.historyAmount}>${item.amount}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
              <LogOut size={18} color="#FF4D4D" />
              <Text style={styles.logoutText}>Выйти из аккаунта</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Guest View */
          <View style={styles.guestContainer}>
            <View style={styles.guestIcon}>
              <Lock size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.guestTitle}>Войдите в аккаунт</Text>
            <Text style={styles.guestSub}>
              Чтобы покупать фильмы, оформлять подписку и сохранять фильмы в избранное
            </Text>

            <TouchableOpacity
              style={styles.guestLoginBtn}
              onPress={() => router.push('/auth')}
              activeOpacity={0.85}
            >
              <UserIcon size={18} color="#FFFFFF" />
              <Text style={styles.guestLoginText}>Войти / Зарегистрироваться</Text>
            </TouchableOpacity>
          </View>
        )}

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
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#161622',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262638',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  userRole: {
    color: '#8A8A9E',
    fontSize: 13,
    marginBottom: 12,
  },
  subBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  subBadgeActiveText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  subBadgeInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  subBadgeInactiveText: {
    color: '#FFC107',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#161622',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#262638',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F2E',
  },
  infoLabel: {
    color: '#8A8A9E',
    fontSize: 13,
    fontWeight: '500',
    width: 70,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyHistory: {
    color: '#6E6E82',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 10,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F2E',
  },
  historyName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  historyDate: {
    color: '#6E6E82',
    fontSize: 11,
    marginTop: 2,
  },
  historyAmount: {
    color: '#E50914',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    borderWidth: 1,
    borderColor: '#FF4D4D',
    paddingVertical: 14,
    borderRadius: 14,
  },
  logoutText: {
    color: '#FF4D4D',
    fontSize: 14,
    fontWeight: '700',
  },
  guestContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  guestIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#161622',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#262638',
  },
  guestTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  guestSub: {
    color: '#8A8A9E',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  guestLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
    marginTop: 10,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  guestLoginText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.4)',
  },
  countBadgeText: {
    color: '#E50914',
    fontSize: 11,
    fontWeight: '700',
  },
  clearFavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFavText: {
    color: '#8A8A9E',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyFavContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyFavTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyFavSubtitle: {
    color: '#8A8A9E',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  favScrollContent: {
    gap: 12,
    paddingVertical: 4,
  },
  favItemWrapper: {
    marginRight: 4,
  },
});
