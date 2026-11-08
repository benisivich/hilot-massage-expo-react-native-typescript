import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, Field, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useAdminData } from '@/hooks/use-admin';
import { back, push } from '@/lib/nav';
import type { SessionStatus } from '@/types/domain';

const STATUS: { id: 'all' | SessionStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Pending' },
  { id: 'confirmed', label: 'Accepted' },
  { id: 'en_route', label: 'On the way' },
  { id: 'in_session', label: 'In session' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const LABEL: Record<SessionStatus, string> = {
  assigned: 'Pending',
  confirmed: 'Accepted',
  en_route: 'On the way',
  arrived: 'Arrived',
  in_session: 'In session',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function AdminBookings() {
  const { bookings, therapists, treatments } = useAdminData();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<(typeof STATUS)[number]['id']>('all');
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return bookings.filter((booking) => {
      const therapist = therapists.find((item) => item.id === booking.therapistId)?.name ?? '';
      const treatment = treatments.find((item) => item.id === booking.treatmentId)?.name ?? booking.treatmentId;
      const text = `${booking.customerName} ${therapist} ${treatment} ${booking.barangay}`.toLowerCase();
      return (status === 'all' || booking.status === status) && text.includes(needle);
    });
  }, [bookings, therapists, treatments, query, status]);

  return (
    <Screen onBack={back}>
      <PageTitle title="Bookings" subtitle="Open a booking to assign a different therapist." />
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="Customer, therapist, or treatment" />
      <View style={styles.filters}>
        {STATUS.map((item) => (
          <Chip key={item.id} label={item.label} selected={status === item.id} onPress={() => setStatus(item.id)} />
        ))}
      </View>
      {rows.map((booking) => {
        const therapist = therapists.find((item) => item.id === booking.therapistId)?.name ?? 'Unassigned';
        const treatment = treatments.find((item) => item.id === booking.treatmentId)?.name ?? 'Treatment';
        return (
          <Pressable key={booking.id} accessibilityRole="button" onPress={() => push(`/admin/booking/${booking.id}`)} style={styles.row}>
            <Text style={styles.name}>{booking.customerName}</Text>
            <Text style={styles.meta}>
              {therapist} · {treatment}
            </Text>
            <Text style={styles.meta}>
              {booking.date} {booking.time} · {booking.mode === 'clinic' ? 'Clinic' : booking.barangay} · {LABEL[booking.status]}
            </Text>
          </Pressable>
        );
      })}
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
});
