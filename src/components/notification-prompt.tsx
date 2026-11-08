import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { Button, Notice } from '@/components/ui';

export function NotificationPrompt() {
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void Notifications.getPermissionsAsync().then((result) => {
      setDenied(result.status === 'denied');
    });
  }, []);

  if (!denied) return null;

  return (
    <>
      <Notice tone="warn">
        Notifications are off. Allow them for Expo Go in the phone settings so this phone can hear about bookings, confirmations, and payments.
      </Notice>
      <Button label="Open notification settings" variant="secondary" onPress={() => void Linking.openSettings()} />
    </>
  );
}
