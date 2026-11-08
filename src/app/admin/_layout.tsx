import { Stack } from 'expo-router';

import { useApp } from '@/context/store';

export default function AdminLayout() {
  const { role } = useApp();
  if (role !== 'admin') return null;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F3EC' } }} />;
}
