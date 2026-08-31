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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Sparkles, CheckCircle2, ShieldCheck, Zap } from 'lucide-react-native';
import { Header } from '../../components/Header';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { SubscriptionType } from '../../types/cinema';

export default function SubscribeScreen() {
  const router = useRouter();
  const { isAuthenticated, isGuest, subscriptions, hasActiveSubscription } = useAuthStore();
  const params = useLocalSearchParams<{ movieId?: string }>() || {};
  const movieId = params.movieId;
  const [plans, setPlans] = useState<SubscriptionType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSubscriptionTypes()
      .then((res) => {
        setPlans(res.items || []);
      })
      .catch((err) => console.warn(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = (planId: number) => {
    if (!isAuthenticated || isGuest) {
      router.push('/auth');
      return;
    }
    router.push(`/checkout?subscriptionTypeId=${planId}${movieId ? `&movieId=${movieId}` : ''}`);
  };

  const activeSub = subscriptions.find(
    (s) => new Date(s.expiresAt).getTime() > new Date().getTime()
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <Sparkles size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Выберите ваш тариф</Text>
          <Text style={styles.heroSub}>
            Безграничный доступ ко всем фильмам, сериалам и новинкам в 4K Ultra HD quality
          </Text>
        </View>

        {/* Active Subscription Status Banner */}
        {activeSub && (
          <View style={styles.activeBanner}>
            <ShieldCheck size={24} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>У вас активна подписка!</Text>
              <Text style={styles.activeDetails}>
                {activeSub.subscriptionName || 'Премиум подписка'} • Действует до{' '}
                {new Date(activeSub.expiresAt).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          </View>
        )}

        {/* Subscription Plans */}
        {loading ? (
          <ActivityIndicator size="large" color="#E50914" style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.plansContainer}>
            {plans.map((plan, index) => {
              const isBestValue = plan.durationDays >= 90;
              return (
                <View
                  key={plan.id}
                  style={[styles.planCard, isBestValue && styles.bestValueCard]}
                >
                  {isBestValue && (
                    <View style={styles.popularBadge}>
                      <Zap size={12} color="#000000" fill="#000000" />
                      <Text style={styles.popularBadgeText}>ВЫГОДНО</Text>
                    </View>
                  )}

                  <Text style={styles.planName}>{plan.name}</Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.priceAmount}>${plan.price}</Text>
                    <Text style={styles.pricePeriod}>/ {plan.durationDays} дней</Text>
                  </View>

                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <CheckCircle2 size={16} color="#E50914" />
                      <Text style={styles.featureText}>Доступ ко всем Премиум фильмам</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <CheckCircle2 size={16} color="#E50914" />
                      <Text style={styles.featureText}>Full HD & 4K Ultra HD качество</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <CheckCircle2 size={16} color="#E50914" />
                      <Text style={styles.featureText}>Без рекламы и ограничений</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <CheckCircle2 size={16} color="#E50914" />
                      <Text style={styles.featureText}>Просмотр на любых устройствах</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.subBtn, isBestValue && styles.bestSubBtn]}
                    onPress={() => handleSubscribe(plan.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.subBtnText}>
                      {activeSub ? 'Продлить подписку' : 'Оформить подписку'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
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
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSub: {
    color: '#8A8A9E',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 20,
  },
  activeTitle: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
  activeDetails: {
    color: '#A0A0B0',
    fontSize: 12,
    marginTop: 2,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: '#161622',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262638',
    position: 'relative',
  },
  bestValueCard: {
    borderColor: '#E50914',
    borderWidth: 2,
    backgroundColor: '#1A1626',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#FFC107',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  priceAmount: {
    color: '#E50914',
    fontSize: 28,
    fontWeight: '800',
  },
  pricePeriod: {
    color: '#8A8A9E',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  featuresList: {
    gap: 10,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    color: '#D0D0E0',
    fontSize: 13,
    fontWeight: '500',
  },
  subBtn: {
    backgroundColor: '#262638',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  bestSubBtn: {
    backgroundColor: '#E50914',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  subBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
