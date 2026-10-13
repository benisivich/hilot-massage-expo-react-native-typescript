import { Tabs } from 'expo-router';

import { AppIcon } from '@/components/icons';
import { tabBar } from '@/constants/theme';

export default function TherapistTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFBF6',
        tabBarInactiveTintColor: '#F4E6D0',
        tabBarStyle: tabBar,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <AppIcon name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Visits',
          tabBarIcon: ({ color, size }) => <AppIcon name="visits" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Hours',
          tabBarIcon: ({ color, size }) => <AppIcon name="hours" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => <AppIcon name="reports" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <AppIcon name="account" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
