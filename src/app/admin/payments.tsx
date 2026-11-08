import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, Field, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useAdminData } from '@/hooks/use-admin';
import { peso } from '@/lib/format';
import { back } from '@/lib/nav';
import { refundBooking } from '@/services/admin';
import type { PaymentStatus } from '@/types/domain';

const FILTERS: { id: 'all' | PaymentStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'reserved', label: 'Pending' },
  { id: 'refunded', label: 'Refunded' },
];

export default function AdminPayments() {
  const { bookings, therapists, reload } = useAdminData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return bookings.filter((booking) => {
      const therapist = therapists.find((item) => item.id === booking.therapistId)?.name ?? '';
      const text = `${booking.customerName} ${therapist}`.toLowerCase();
      return (filter === 'all' || booking.paymentStatus === filter) && text.includes(needle);
    });
  }, [bookings, therapists, query, filter]);

  const earnings = useMemo(() => {
    const totals = new Map<string, number>();
    for (const booking of bookings) {
      if (booking.paymentStatus !== 'paid') continue;
      totals.set(booking.therapistId, (totals.get(booking.therapistId) ?? 0) + booking.amountPaid);
    }
    return [...totals.entries()]
      .map(([id, amount]) => ({ name: therapists.find((item) => item.id === id)?.name ?? 'Therapist', amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [bookings, therapists]);

  return (
    <Screen onBack={back}>
      <PageTitle title="Payments" subtitle="Refund a cancelled booking from its row." />
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="Customer or therapist" />
      <View style={styles.filters}>
        {FILTERS.map((item) => (
          <Chip key={item.id} label={item.label} selected={filter === item.id} onPress={() => setFilter(item.id)} />
        ))}
      </View>
      {rows.map((booking) => {
        const label = booking.paymentStatus === 'paid' ? 'Paid' : booking.paymentStatus === 'refunded' ? 'Refunded' : 'Pending';
        const canRefund = booking.status === 'cancelled' && booking.paymentStatus !== 'refunded';
        return (
          <Pressable
            key={booking.id}
            accessibilityRole="button"
            disabled={!canRefund}
            onPress={() => {
              void refundBooking(booking.id).then(async (message) => {
                if (message) Alert.alert('Not saved', message);
                else {
                  await reload();
                  Alert.alert('Refund recorded', booking.customerName);
                }
              });
            }}
            style={styles.row}>
            <Text style={styles.name}>
              {booking.customerName} · {peso(booking.amountPaid)}
            </Text>
            <Text style={styles.meta}>
              {label} · {booking.date}
              {canRefund ? ' · Tap to refund' : ''}
            </Text>
          </Pressable>
        );
      })}
      <Text style={styles.heading}>Therapist earnings</Text>
      {earnings.map((row) => (
        <Text key={row.name} style={styles.meta}>
          {row.name}: {peso(row.amount)}
        </Text>
      ))}
      {earnings.length === 0 ? <Text style={styles.meta}>No paid bookings yet.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: {
    backgroundColor: '#FFFBF6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
    gap: 4,
  },
  name: { color: palette.ink, fontWeight: '700', fontSize: 16 },
  meta: { color: palette.muted },
  heading: { color: palette.ink, fontWeight: '700', marginTop: 8 },
});
