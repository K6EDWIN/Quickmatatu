import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getItem(key) {
  const secureValue = await SecureStore.getItemAsync(key);
  if (secureValue || key !== 'userSession') return secureValue;

  await AsyncStorage.removeItem(key);
  return null;
}
export const setItem = (key, value) => SecureStore.setItemAsync(key, value);
export async function removeItem(key) {
  await Promise.all([
    SecureStore.deleteItemAsync(key),
    key === 'userSession' ? AsyncStorage.removeItem(key) : Promise.resolve(),
  ]);
}
