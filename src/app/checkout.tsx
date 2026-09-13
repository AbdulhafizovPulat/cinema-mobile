import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CreditCard, ShieldCheck, CheckCircle2, Lock, Sparkles } from 'lucide-react-native';
import { api, isTokenExpiredError } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Movie, SubscriptionType } from '../types/cinema';

export default function CheckoutScreen() {
  const params = useLocalSearchParams<{
    movieId?: string;
    subscriptionTypeId?: string;
  }>() || {};
  const movieId = params.movieId;
  const subscriptionTypeId = params.subscriptionTypeId;
  const router = useRouter();
  const { refreshSubscriptions } = useAuthStore();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [subType, setSubType] = useState<SubscriptionType | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  // Form
  const [cardNumber, setCardNumber] = useState('4444 5555 6666 7777');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('888');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoadingDetails(true);

    const loadData = async () => {
      try {
        // 1. Always load official subscription plans from the server
        const subTypesRes = await api.getSubscriptionTypes().catch(() => ({ items: [] }));
        const plans = subTypesRes.items || [];

        let targetSub: SubscriptionType | null = null;
        if (subscriptionTypeId) {
          targetSub = plans.find((s) => Number(s.id) === Number(subscriptionTypeId)) || null;
        }

        // If specific plan not found or not passed, default to first server plan (e.g. Standard $10)
        if (!targetSub && plans.length > 0) {
          targetSub = plans[0];
        }

        if (isMounted && targetSub) {
          setSubType(targetSub);
        }

        // 2. If movieId is provided, load movie info for context and post-checkout redirect
        if (movieId) {
          const movieData = await api.getMovieById(Number(movieId)).catch(() => null);
          if (isMounted && movieData) {
            setMovie(movieData);
          }
        }
      } catch (e) {
        console.warn('Error loading checkout details:', e);
      } finally {
        if (isMounted) {
          setLoadingDetails(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [movieId, subscriptionTypeId]);

  const handlePay = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const cleanCard = cardNumber.replace(/\s+/g, '');
      const planToSubscribeId = subType?.id || (subscriptionTypeId ? Number(subscriptionTypeId) : null);

      if (planToSubscribeId) {
        const res = await api.subscribe(planToSubscribeId, cleanCard);
        setSuccessMsg(res.message || 'Подписка успешно оформлена!');
        await refreshSubscriptions();
      } else {
        setError('Не удалось определить тариф подписки. Пожалуйста, выберите тариф заново.');
      }
    } catch (err: any) {
      if (!isTokenExpiredError(err)) {
        setError(err.message || 'Ошибка обработки платежа');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    if (movieId) {
      router.replace(`/player?id=${movieId}`);
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  const itemTitle = subType ? `Тариф: «${subType.name}»` : 'Оформление подписки';
  const amount = subType ? `$${subType.price}` : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {successMsg ? (
          /* Success Screen */
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={48} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Оплата прошла успешно!</Text>
            <Text style={styles.successSub}>{successMsg}</Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleDone} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>
                {movieId ? 'Начать просмотр' : 'Перейти в профиль'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Payment Form */
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Sparkles size={20} color="#E50914" />
                <Text style={styles.summaryTitle}>Детали заказа</Text>
              </View>

              {loadingDetails ? (
                <ActivityIndicator size="small" color="#E50914" style={{ marginVertical: 10 }} />
              ) : (
                <View style={styles.summaryDetails}>
                  <Text style={styles.itemTitle}>{itemTitle}</Text>
                  {movie && (
                    <Text style={styles.movieSubTitle}>Для доступа к фильму: «{movie.title}»</Text>
                  )}
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>К оплате:</Text>
                    <Text style={styles.summaryAmount}>{amount}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Error message */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Simulated Card Form */}
            <View style={styles.cardForm}>
              <View style={styles.cardFormHeader}>
                <CreditCard size={20} color="#FFFFFF" />
                <Text style={styles.cardFormTitle}>Банковская карта (Симуляция)</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Номер карты</Text>
                <TextInput
                  style={styles.input}
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  keyboardType="numeric"
                  placeholder="4444 5555 6666 7777"
                  placeholderTextColor="#6E6E82"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Срок действия</Text>
                  <TextInput
                    style={styles.input}
                    value={expiry}
                    onChangeText={setExpiry}
                    placeholder="MM/YY"
                    placeholderTextColor="#6E6E82"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CVC / CVV</Text>
                  <TextInput
                    style={styles.input}
                    value={cvc}
                    onChangeText={setCvc}
                    keyboardType="numeric"
                    secureTextEntry
                    placeholder="123"
                    placeholderTextColor="#6E6E82"
                  />
                </View>
              </View>

              <View style={styles.securityRow}>
                <Lock size={14} color="#10B981" />
                <Text style={styles.securityText}>Шифрованное безопасное соединение 256-bit</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.payBtn,
                  (submitting || loadingDetails || !subType) && styles.payBtnDisabled,
                ]}
                onPress={handlePay}
                disabled={submitting || loadingDetails || !subType}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.payBtnText}>
                    {loadingDetails ? 'Загрузка тарифа...' : `Оплатить ${amount}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
    padding: 20,
    flexGrow: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161622',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262638',
  },
  summaryCard: {
    backgroundColor: '#161622',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#262638',
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  summaryDetails: {
    gap: 8,
  },
  itemTitle: {
    color: '#D0D0E0',
    fontSize: 15,
    fontWeight: '700',
  },
  movieSubTitle: {
    color: '#8A8A9E',
    fontSize: 13,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#262638',
  },
  summaryLabel: {
    color: '#8A8A9E',
    fontSize: 13,
  },
  summaryAmount: {
    color: '#E50914',
    fontSize: 20,
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 77, 77, 0.15)',
    borderWidth: 1,
    borderColor: '#FF4D4D',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF4D4D',
    fontSize: 13,
    textAlign: 'center',
  },
  cardForm: {
    backgroundColor: '#161622',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#262638',
    gap: 14,
  },
  cardFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardFormTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: '#8A8A9E',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#09090D',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#262638',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  securityText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  payBtn: {
    backgroundColor: '#E50914',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  payBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  successCard: {
    backgroundColor: '#161622',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262638',
    marginTop: 20,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  successSub: {
    color: '#8A8A9E',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: '#E50914',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
