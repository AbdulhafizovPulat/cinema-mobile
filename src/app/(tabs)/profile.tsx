import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User as UserIcon, LogOut, ShieldCheck, Mail, Phone, CreditCard, History, Lock, Sparkles } from 'lucide-react-native';
import { Header } from '../../components/Header';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';
import { PurchaseHistoryItem } from '../../types/cinema';

export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, isGuest, user, subscriptions, logout } = useAuthStore();
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
              Чтобы покупать фильмы, оформлять подписку и смотреть истории транзакций
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
});
