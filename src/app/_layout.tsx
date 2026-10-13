import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { font, palette } from '@/constants/theme';
import { AppProvider, useApp } from '@/context/store';

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const { ready } = useApp();

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={palette.palm} />
        <Text style={styles.loadingText}>Loading saved visits…</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }} />;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <AppProvider>
      <StatusBar style="dark" />
      <View style={styles.frame}>
        <View style={styles.column}>
          <AppShell />
        </View>
      </View>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: palette.bg,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: palette.bg,
  },
  loadingText: {
    fontFamily: font.serif,
    color: palette.ink,
    fontSize: 18,
  },
});
