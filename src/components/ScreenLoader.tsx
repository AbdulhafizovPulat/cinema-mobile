/**
 * ScreenLoader.tsx
 * Полноэкранный лоадер с анимированным пульсирующим логотипом.
 * Используется при первичной загрузке данных на любом экране.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface Props {
  /** Подпись под спиннером */
  label?: string;
}

export function ScreenLoader({ label = 'Загрузка...' }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Пульс логотипа
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();

    // Вращение кольца
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      {/* Outer spinning ring */}
      <View style={styles.ringWrap}>
        <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />

        {/* Logo icon */}
        <Animated.View style={[styles.logo, { transform: [{ scale: pulse }] }]}>
          <Text style={styles.logoText}>▶</Text>
        </Animated.View>
      </View>

      <Text style={styles.brand}>
        CINEMA<Text style={styles.accent}>FLIX</Text>
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090D',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  ringWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#E50914',
    borderRightColor: 'rgba(229,9,20,0.3)',
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    marginLeft: 3, // оптически центрировать ▶
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  accent: {
    color: '#E50914',
  },
  label: {
    color: '#6E6E82',
    fontSize: 13,
    fontWeight: '500',
  },
});
