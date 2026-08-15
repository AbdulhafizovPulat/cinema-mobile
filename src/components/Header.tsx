import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { User, LogIn, Sparkles, Film } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';

export const Header: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, user, isGuest } = useAuthStore();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.brand} onPress={() => router.push('/')} activeOpacity={0.8}>
        <View style={styles.logoIcon}>
          <Film size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.logoTitle}>CINEMA<Text style={styles.logoAccent}>FLIX</Text></Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        {isAuthenticated && !isGuest ? (
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
              </Text>
            </View>
            <Text style={styles.profileText} numberOfLines={1}>
              {user?.firstName || 'Профиль'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/auth')}
            activeOpacity={0.8}
          >
            <LogIn size={16} color="#FFFFFF" />
            <Text style={styles.loginText}>Войти</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#09090D',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A24',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  logoAccent: {
    color: '#E50914',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#161622',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262638',
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  profileText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 90,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
