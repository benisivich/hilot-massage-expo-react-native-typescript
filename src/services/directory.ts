import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Booking, Customer, Role, Therapist } from '@/types/domain';

const STORAGE_KEY = 'lunas-directory';

export type SavedDirectory = {
  role: Role | null;
  customer: Customer;
  therapists: Therapist[];
  bookings: Booking[];
  activeTherapistId?: string | null;
};

function isDirectory(value: unknown): value is SavedDirectory {
  if (!value || typeof value !== 'object') return false;
  const record = value as SavedDirectory;
  return Boolean(record.customer?.id) && Array.isArray(record.therapists) && Array.isArray(record.bookings);
}

export async function loadDirectory() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isDirectory(parsed)) return null;
    return parsed;
  } catch (error) {
    console.warn('Could not read saved Lunas data.', error);
    return null;
  }
}

export async function saveDirectory(directory: SavedDirectory) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(directory));
  } catch (error) {
    console.warn('Could not save Lunas data.', error);
  }
}

export async function clearDirectory() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Could not clear Lunas data.', error);
  }
}
