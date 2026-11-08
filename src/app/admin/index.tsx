import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, PageTitle, Screen } from '@/components/ui';
import { font, palette } from '@/constants/theme';
import { useApp } from '@/context/store';
import { useAdminData } from '@/hooks/use-admin';
import { peso, toISODate } from '@/lib/format';
import { replace, push } from '@/lib/nav';

const LINKS = [
  ['Therapist applications', '/admin/therapists'],
  ['Customers and therapists', '/admin/people'],
  ['Treatments', '/admin/services'],
  ['Service areas', '/admin/areas'],
  ['Bookings', '/admin/bookings'],
  ['Payments', '/admin/payments'],
  ['Reports', '/admin/reports'],
  ['Safety and complaints', '/admin/safety'],
] as const;

export default function AdminHome() {
  const { setRole } = useApp();
  const { therapists, bookings, error, loading } = useAdminData();
  const today = toISODate(new Date());
  const pending = therapists.filter((therapist) => therapist.verification === 'pending').length;
  const todayCount = bookings.filter((booking) => booking.date === today && booking.status !== 'cancelled').length;
  const earnings = bookings
    .filter((booking) => booking.paymentStatus === 'paid')
    .reduce((sum, booking) => sum + booking.amountPaid, 0);

  return (
    <Screen>
      <PageTitle title="Hilotcare admin" subtitle="Phone panel for clinic staff only." />
      {loading ? <ActivityIndicator color={palette.palm} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.counts}>
        <Count label="Pending therapists" value={String(pending)} />
        <Count label="Today's bookings" value={String(todayCount)} />
        <Count label="Total earnings" value={peso(earnings)} />
      </View>
      {LINKS.map(([label, href]) => (
        <Pressable key={href} accessibilityRole="button" onPress={() => push(href)} style={styles.link}>
          <Text style={styles.linkText}>{label}</Text>
        </Pressable>
      ))}
      <Button
        label="Sign out"
        variant="ghost"
        onPress={() => {
          setRole(null);
          replace('/');
        }}
      />
    </Screen>
  );
}

function Count({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.count}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  counts: { gap: 8 },
  count: { backgroundColor: palette.paper, borderRadius: 14, padding: 14 },
  countValue: { fontFamily: font.serif, color: palette.palm, fontSize: 26 },
  countLabel: { color: palette.muted, marginTop: 2 },
  link: {
    backgroundColor: '#FFFBF6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  linkText: { color: palette.ink, fontWeight: '700', fontSize: 16 },
  error: { color: palette.clay, lineHeight: 20 },
});
