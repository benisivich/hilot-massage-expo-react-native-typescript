import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

const ICONS = {
  home: { ios: 'house.fill', android: 'home' },
  services: { ios: 'leaf.fill', android: 'spa' },
  visits: { ios: 'calendar', android: 'calendar_month' },
  account: { ios: 'person.fill', android: 'person' },
  hours: { ios: 'clock.fill', android: 'schedule' },
  reports: { ios: 'chart.bar.fill', android: 'bar_chart' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  pin: { ios: 'mappin.circle.fill', android: 'location_on' },
  verified: { ios: 'checkmark.seal.fill', android: 'verified' },
  pay: { ios: 'creditcard.fill', android: 'payments' },
  shield: { ios: 'checkmark.shield.fill', android: 'shield' },
  lock: { ios: 'lock.fill', android: 'lock' },
  star: { ios: 'star.fill', android: 'star' },
} satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export function AppIcon({ name, color, size = 22 }: { name: IconName; color: ColorValue; size?: number }) {
  const icon = ICONS[name];
  return (
    <SymbolView
      name={{ ios: icon.ios, android: icon.android, web: icon.android }}
      tintColor={color}
      size={size}
      style={{ width: size, height: size }}
      fallback={null}
    />
  );
}
