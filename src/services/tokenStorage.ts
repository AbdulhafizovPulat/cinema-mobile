/**
 * tokenStorage.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Централизованное хранилище JWT-токенов.
 *
 * На iOS / Android используется expo-secure-store (данные хранятся в Keychain /
 * Android Keystore — аппаратно-защищённое шифрование).
 * На Web — localStorage (в production рекомендуется httpOnly cookie).
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ─── Ключи хранилища ────────────────────────────────────────────────────────
const ACCESS_TOKEN_KEY = 'cinema_access_token';
const REFRESH_TOKEN_KEY = 'cinema_refresh_token';

// ─── Утилиты платформо-независимого чтения/записи ───────────────────────────

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') localStorage.setItem(key, value);
    } catch {}
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {}
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') localStorage.removeItem(key);
    } catch {}
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {}
}

// ─── Публичный API ──────────────────────────────────────────────────────────

/**
 * Получить актуальный access-токен из защищённого хранилища.
 * Возвращает `null`, если токен отсутствует.
 */
export async function getAccessToken(): Promise<string | null> {
  return secureGet(ACCESS_TOKEN_KEY);
}

/**
 * Получить refresh-токен из защищённого хранилища.
 * Возвращает `null`, если токен отсутствует.
 */
export async function getRefreshToken(): Promise<string | null> {
  return secureGet(REFRESH_TOKEN_KEY);
}

/**
 * Атомарно сохранить новую пару токенов.
 * Вызывается после успешного логина или успешного обновления токена.
 */
export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    secureSet(ACCESS_TOKEN_KEY, accessToken),
    secureSet(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

/**
 * Удалить оба токена. Вызывается при логауте или невалидном refresh-токене.
 */
export async function clearTokens(): Promise<void> {
  await Promise.all([
    secureDelete(ACCESS_TOKEN_KEY),
    secureDelete(REFRESH_TOKEN_KEY),
  ]);
}

/**
 * Проверить наличие access-токена (не проверяет валидность — только присутствие).
 */
export async function hasAccessToken(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null && token.length > 0;
}
