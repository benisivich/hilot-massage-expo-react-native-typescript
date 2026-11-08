import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';

import { Line, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useAdminData } from '@/hooks/use-admin';
import { peso } from '@/lib/format';
import { back, param } from '@/lib/nav';
import { reassignBooking } from '@/services/admin';
import { useLocalSearchParams } from 'expo-router';

export default function AdminBooking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = param(id);
  const { bookings, therapists, treatments, loading, reload } = useAdminData();
  const booking = bookings.find((item) => item.id === bookingId);
  const treatment = treatments.find((item) => item.id === booking?.treatmentId);

  const assign = (therapistId: string, name: string) => {
    if (!booking) return;
    void reassignBooking(booking.id, therapistId).then(async (message) => {
      if (message) Alert.alert('Not saved', message);
      else {
        await reload();
        Alert.alert('Reassigned', name);
      }
    });
  };

  if (loading && !booking) {
    return (
      <Screen onBack={back}>
        <ActivityIndicator color={palette.palm} />
      </Screen>
    );
  }
  if (!booking) {
    return (
      <Screen onBack={back}>
        <PageTitle title="Booking" subtitle="This booking is not in the list." />
      </Screen>
    );
  }

  const current = therapists.find((item) => item.id === booking.therapistId);
  const choices = therapists.filter(
    (therapist) => therapist.verification === 'verified' && !therapist.suspended && therapist.id !== booking.therapistId,
  );

  return (
    <Screen onBack={back}>
      <PageTitle title={booking.customerName} subtitle={treatment?.name ?? 'Treatment'} />
      <Line label="Therapist" value={current?.name ?? 'Unknown'} />
      <Line label="When" value={`${booking.date} ${booking.time}`} />
      <Line label="Where" value={booking.mode === 'clinic' ? 'Clinic' : `${booking.address}, ${booking.barangay}`} />
      <Line label="Status" value={booking.status} />
      <Line label="Paid" value={peso(booking.amountPaid)} />
      <Text style={styles.heading}>Assign another approved therapist</Text>
      {choices.map((therapist) => (
        <Pressable key={therapist.id} accessibilityRole="button" onPress={() => assign(therapist.id, therapist.name)} style={styles.row}>
          <Text style={styles.name}>{therapist.name}</Text>
        </Pressable>
      ))}
      {choices.length === 0 ? <Text style={styles.meta}>No other approved therapist is available to assign.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { color: palette.ink, fontWeight: '700', marginTop: 8 },
  row: {
    backgroundColor: '#FFFBF6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  name: { color: palette.ink, fontWeight: '700' },
  meta: { color: palette.muted },
});
