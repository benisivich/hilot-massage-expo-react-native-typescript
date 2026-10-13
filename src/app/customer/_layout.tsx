import { Tabs } from 'expo-router';

import { AppIcon } from '@/components/icons';
import { tabBar } from '@/constants/theme';

export default function CustomerTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFBF6',
        tabBarInactiveTintColor: '#F4E6D0',
        tabBarStyle: tabBar,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <AppIcon name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Booking',
          tabBarIcon: ({ color, size }) => <AppIcon name="visits" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, size }) => <AppIcon name="services" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <AppIcon name="account" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
