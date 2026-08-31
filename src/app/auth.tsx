import { useRouter } from 'expo-router';
import { ArrowLeft, Film, Lock, LogIn, Mail, User, UserPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { useAuthStore } from '../store/useAuthStore';

export default function AuthScreen() {
  const router = useRouter();
  const { login, register, isLoading, error } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(DEFAULT_UZ_PHONE_PREFIX);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Заполните e-mail и пароль');
      return;
    }

    if (tab === 'login') {
      const success = await login(email, password);
      if (success) {
        router.back();
      }
    } else {
      if (!firstName || !lastName || !phoneNumber || phoneNumber === DEFAULT_UZ_PHONE_PREFIX) {
        setLocalError('Имя, Фамилия и телефон обязательны для регистрации');
        return;
      }
      const success = await register({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
      });
      if (success) {
        router.back();
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoIcon}>
              <Film size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>CINEMA<Text style={styles.brandAccent}>FLIX</Text></Text>
            <Text style={styles.brandSubtitle}>Онлайн-кинотеатр мирового уровня</Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
              onPress={() => {
                setTab('login');
                setLocalError(null);
              }}
            >
              <LogIn size={16} color={tab === 'login' ? '#FFFFFF' : '#8A8A9E'} />
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Вход</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}
              onPress={() => {
                setTab('register');
                setLocalError(null);
              }}
            >
              <UserPlus size={16} color={tab === 'register' ? '#FFFFFF' : '#8A8A9E'} />
              <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>
                Регистрация
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {(localError || error) ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{localError || error}</Text>
            </View>
          ) : null}

          {/* Form inputs */}
          <View style={styles.formContainer}>
            {tab === 'register' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Имя *</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#8A8A9E" />
                    <TextInput
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
                  <PhoneInput
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                  />
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-mail *</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#8A8A9E" />
                <TextInput
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
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#6E6E82"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            {/* Submit Button */}
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
        </ScrollView>
      </KeyboardAvoidingView>
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
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: '#E50914',
  },
  brandSubtitle: {
    color: '#8A8A9E',
    fontSize: 12,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#161622',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#262638',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#E50914',
  },
  tabText: {
    color: '#8A8A9E',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorBanner: {
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
  formContainer: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: '#D0D0E0',
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161622',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#262638',
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  submitBtn: {
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
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
