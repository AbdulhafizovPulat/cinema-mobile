import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle,
  Film,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  User,
  UserPlus,
} from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_UZ_PHONE_PREFIX, PhoneInput } from '../components/PhoneInput';
import apiClient from '../services/apiClient';
import { useAuthStore } from '../store/useAuthStore';

// ─── Типы экранов ─────────────────────────────────────────────────────────────
type Screen = 'login' | 'register' | 'forgot' | 'reset' | 'success';

export default function AuthScreen() {
  const router = useRouter();
  const { login, register, isLoading, error } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [screen, setScreen] = useState<Screen>('login');

  // ─── Общие поля ───────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(DEFAULT_UZ_PHONE_PREFIX);
  const [localError, setLocalError] = useState<string | null>(null);

  // ─── Состояние сброса пароля ──────────────────────────────────────────────
  /**
   * Токен сброса — приходит автоматически из ответа POST /auth/forgot-password
   * ({ resetToken: "eyJ..." }).
   * Пользователь его никогда не видит и не вводит вручную.
   */
  const [pendingResetToken, setPendingResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // ─── Анимация успеха ─────────────────────────────────────────────────────
  const successScale = useRef(new Animated.Value(0)).current;

  const playSuccessAnim = () => {
    successScale.setValue(0);
    Animated.spring(successScale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const resetPasswordFields = () => {
    setNewPassword('');
    setConfirmPassword('');
    setPendingResetToken(null);
  };

  const goTo = (s: Screen) => {
    setLocalError(null);
    setScreen(s);
    if (s === 'login' || s === 'register') setTab(s as 'login' | 'register');
  };

  // ─── LOGIN / REGISTER ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Заполните e-mail и пароль');
      return;
    }
    if (tab === 'login') {
      const success = await login(email, password);
      if (success) router.back();
    } else {
      if (!firstName || !lastName || !phoneNumber || phoneNumber === DEFAULT_UZ_PHONE_PREFIX) {
        setLocalError('Имя, Фамилия и телефон обязательны для регистрации');
        return;
      }
      const success = await register({ email, password, firstName, lastName, phoneNumber });
      if (success) router.back();
    }
  };

  // ─── FORGOT PASSWORD (шаг 1) ─────────────────────────────────────────────
  /**
   * Запрашиваем сброс пароля.
   * Бэкенд возвращает { message, resetToken, resetLink }.
   * Мы сохраняем resetToken в состоянии и автоматически переходим к шагу 2.
   * Пользователь только вводил email — больше ничего лишнего.
   */
  const handleForgot = async () => {
    setLocalError(null);
    if (!email.trim()) {
      setLocalError('Введите e-mail вашего аккаунта');
      return;
    }
    setResetLoading(true);
    try {
      const { data } = await apiClient.post<{ message: string; resetToken: string; resetLink?: string }>(
        '/auth/forgot-password',
        { email: email.trim() }
      );

      if (!data.resetToken) {
        throw new Error('Сервер не вернул токен сброса');
      }

      // Сохраняем токен «за кулисами» — пользователь его никогда не видит
      setPendingResetToken(data.resetToken);
      resetPasswordFields();

      // Переходим к форме ввода нового пароля
      goTo('reset');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Ошибка запроса сброса пароля';
      setLocalError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  // ─── RESET PASSWORD (шаг 2) ──────────────────────────────────────────────
  /**
   * Устанавливаем новый пароль, используя токен, полученный на шаге 1.
   * Пользователь вводит только новый пароль и его подтверждение.
   */
  const handleReset = async () => {
    setLocalError(null);
    if (!newPassword || newPassword.length < 6) {
      setLocalError('Новый пароль должен быть не менее 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Пароли не совпадают');
      return;
    }
    if (!pendingResetToken) {
      // На случай если состояние потерялось — отправляем обратно к шагу 1
      setLocalError('Токен сброса недействителен. Начните заново.');
      goTo('forgot');
      return;
    }
    setResetLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        token: pendingResetToken,
        newPassword,
      });

      // Сбрасываем чувствительные данные из памяти
      const savedPassword = newPassword;
      setPendingResetToken(null);
      setNewPassword('');
      setConfirmPassword('');

      // Показываем экран успеха на 1.2 сек, затем автологин и редирект на главную
      goTo('success');
      playSuccessAnim();

      setTimeout(async () => {
        const ok = await login(email, savedPassword);
        if (ok) {
          // replace чтобы нельзя было вернуться обратно на экран авторизации
          router.replace('/(tabs)');
        } else {
          // Логин не удался — отправляем на экран входа (редкий случай)
          goTo('login');
        }
      }, 1400);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Не удалось изменить пароль. Попробуйте заново.';
      setLocalError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* Назад — контекстная кнопка */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (screen === 'forgot')  { goTo('login');  return; }
              if (screen === 'reset')   { goTo('forgot'); return; }
              if (screen === 'success') { goTo('login');  return; }
              router.back();
            }}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Логотип */}
          <View style={styles.logoSection}>
            <View style={styles.logoIcon}>
              <Film size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>
              CINEMA<Text style={styles.brandAccent}>FLIX</Text>
            </Text>
            <Text style={styles.brandSubtitle}>Онлайн-кинотеатр мирового уровня</Text>
          </View>

          {/* ══════════════ SUCCESS ══════════════════════════════════════════ */}
          {screen === 'success' && (
            <View style={styles.successContainer}>
              <Animated.View
                style={[styles.successIconWrap, { transform: [{ scale: successScale }] }]}
              >
                <CheckCircle size={56} color="#22C55E" />
              </Animated.View>
              <Text style={styles.successTitle}>Пароль изменён!</Text>
              <Text style={styles.successSubtitle}>
                Вы можете войти в аккаунт с новым паролем.
              </Text>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => { setLocalError(null); goTo('login'); }}
              >
                <LogIn size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Войти</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════ FORGOT — шаг 1: вводим email ════════════════════ */}
          {screen === 'forgot' && (
            <View>
              <View style={styles.pageHeader}>
                <KeyRound size={20} color="#E50914" />
                <Text style={styles.pageTitle}>Забыли пароль?</Text>
              </View>
              <Text style={styles.pageDesc}>
                Введите e-mail вашего аккаунта — мы автоматически подготовим сброс пароля.
              </Text>

              {localError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{localError}</Text>
                </View>
              )}

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>E-mail *</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color="#8A8A9E" />
                    <TextInput
                      id="forgot-email"
                      style={styles.input}
                      placeholder="user@example.com"
                      placeholderTextColor="#6E6E82"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleForgot}
                  disabled={resetLoading}
                  activeOpacity={0.85}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Продолжить</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ══════════════ RESET — шаг 2: вводим новый пароль ══════════════ */}
          {screen === 'reset' && (
            <View>
              <View style={styles.pageHeader}>
                <Lock size={20} color="#E50914" />
                <Text style={styles.pageTitle}>Новый пароль</Text>
              </View>
              <Text style={styles.pageDesc}>
                Придумайте новый пароль для аккаунта{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>

              {localError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{localError}</Text>
                </View>
              )}

              <View style={styles.formContainer}>
                {/* Новый пароль */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Новый пароль *</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color="#8A8A9E" />
                    <TextInput
                      id="reset-new-password"
                      style={styles.input}
                      placeholder="Минимум 6 символов"
                      placeholderTextColor="#6E6E82"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Подтверждение пароля с индикатором несовпадения */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Повторите пароль *</Text>
                  <View style={[
                    styles.inputWrapper,
                    confirmPassword.length > 0 && confirmPassword !== newPassword
                      && styles.inputWrapperError,
                  ]}>
                    <Lock
                      size={18}
                      color={
                        confirmPassword.length > 0 && confirmPassword !== newPassword
                          ? '#FF4D4D'
                          : '#8A8A9E'
                      }
                    />
                    <TextInput
                      id="reset-confirm-password"
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#6E6E82"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />
                    {/* Inline-индикатор совпадения */}
                    {confirmPassword.length > 0 && (
                      <View style={[
                        styles.matchDot,
                        { backgroundColor: confirmPassword === newPassword ? '#22C55E' : '#FF4D4D' },
                      ]} />
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleReset}
                  disabled={resetLoading}
                  activeOpacity={0.85}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Сохранить пароль</Text>
                  )}
                </TouchableOpacity>

                {/* Возврат к шагу 1 */}
                <TouchableOpacity style={styles.linkBtn} onPress={() => goTo('forgot')}>
                  <Text style={styles.linkBtnText}>← Другой e-mail</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ══════════════ LOGIN / REGISTER ═════════════════════════════════ */}
          {(screen === 'login' || screen === 'register') && (
            <>
              {/* Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
                  onPress={() => { setTab('login'); setScreen('login'); setLocalError(null); }}
                >
                  <LogIn size={16} color={tab === 'login' ? '#FFFFFF' : '#8A8A9E'} />
                  <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Вход</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}
                  onPress={() => { setTab('register'); setScreen('register'); setLocalError(null); }}
                >
                  <UserPlus size={16} color={tab === 'register' ? '#FFFFFF' : '#8A8A9E'} />
                  <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>
                    Регистрация
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Error */}
              {(localError || error) ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{localError || error}</Text>
                </View>
              ) : null}

              {/* Form */}
              <View style={styles.formContainer}>
                {tab === 'register' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Имя *</Text>
                      <View style={styles.inputWrapper}>
                        <User size={18} color="#8A8A9E" />
                        <TextInput
                          id="register-first-name"
                          style={styles.input}
                          placeholder="Иван"
                          placeholderTextColor="#6E6E82"
                          value={firstName}
                          onChangeText={setFirstName}
                        />
                      </View>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Фамилия *</Text>
                      <View style={styles.inputWrapper}>
                        <User size={18} color="#8A8A9E" />
                        <TextInput
                          id="register-last-name"
                          style={styles.input}
                          placeholder="Иванов"
                          placeholderTextColor="#6E6E82"
                          value={lastName}
                          onChangeText={setLastName}
                        />
                      </View>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Номер телефона *</Text>
                      <PhoneInput value={phoneNumber} onChangeText={setPhoneNumber} />
                    </View>
                  </>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>E-mail *</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color="#8A8A9E" />
                    <TextInput
                      id="auth-email"
                      style={styles.input}
                      placeholder="user@example.com"
                      placeholderTextColor="#6E6E82"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Пароль *</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color="#8A8A9E" />
                    <TextInput
                      id="auth-password"
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#6E6E82"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                </View>




                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSubmit}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {tab === 'login' ? 'Войти' : 'Зарегистрироваться'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Стили ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#09090D' },
  container: { padding: 20, flexGrow: 1 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#161622',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: '#262638',
  },

  // ── Лого ──
  logoSection: { alignItems: 'center', marginBottom: 24 },
  logoIcon: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: '#E50914',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#E50914', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  brandTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  brandAccent: { color: '#E50914' },
  brandSubtitle: { color: '#8A8A9E', fontSize: 12, marginTop: 2 },

  // ── Страничный заголовок ──
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pageTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  pageDesc: { color: '#8A8A9E', fontSize: 13, lineHeight: 19, marginBottom: 20 },
  emailHighlight: { color: '#FFFFFF', fontWeight: '600' },

  // ── Tabs ──
  tabContainer: {
    flexDirection: 'row', backgroundColor: '#161622',
    borderRadius: 14, padding: 4, marginBottom: 20,
    borderWidth: 1, borderColor: '#262638',
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabBtnActive: { backgroundColor: '#E50914' },
  tabText: { color: '#8A8A9E', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },

  // ── Error ──
  errorBanner: {
    backgroundColor: 'rgba(255, 77, 77, 0.15)',
    borderWidth: 1, borderColor: '#FF4D4D',
    padding: 12, borderRadius: 12, marginBottom: 16,
  },
  errorText: { color: '#FF4D4D', fontSize: 13, textAlign: 'center' },

  // ── Form ──
  formContainer: { gap: 14 },
  inputGroup: { gap: 6 },
  inputLabel: { color: '#D0D0E0', fontSize: 13, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161622', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#262638', gap: 10,
  },
  inputWrapperError: { borderColor: '#FF4D4D' },
  input: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  matchDot: { width: 8, height: 8, borderRadius: 4 },

  // ── Forgot link ──
  forgotLink: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, alignSelf: 'flex-end', marginTop: -4,
  },
  forgotLinkText: { color: '#E50914', fontSize: 13, fontWeight: '600' },

  // ── Submit ──
  submitBtn: {
    backgroundColor: '#E50914', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, marginTop: 10,
    shadowColor: '#E50914', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // ── Link ──
  linkBtn: { alignItems: 'center', paddingVertical: 4 },
  linkBtnText: { color: '#8A8A9E', fontSize: 13, fontWeight: '500' },

  // ── Success ──
  successContainer: { alignItems: 'center', paddingVertical: 20, gap: 14 },
  successIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  successTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  successSubtitle: {
    color: '#8A8A9E', fontSize: 14, textAlign: 'center',
    lineHeight: 20, maxWidth: 260,
  },
});
