import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useAdminData } from '@/hooks/use-admin';
import { back } from '@/lib/nav';
import { reviewComplaint, setSuspended, unlockCheckIn } from '@/services/admin';

export default function AdminSafety() {
  const { complaints, bookings, customers, therapists, reload } = useAdminData();
  const locked = bookings.filter((booking) => booking.checkInLocked);

  const suspendAuthor = (authorId: string, role: 'customer' | 'therapist') => {
    void setSuspended(role === 'customer' ? 'customers' : 'therapists', authorId, true).then(async (message) => {
      if (message) Alert.alert('Not saved', message);
      else {
        await reload();
        Alert.alert('Suspended', 'The account can be reactivated from People.');
      }
    });
  };

  return (
    <Screen onBack={back}>
      <PageTitle title="Safety" subtitle="Reports, complaints, and locked check-in codes." />
      <Text style={styles.heading}>Complaints</Text>
      {complaints.map((complaint) => (
        <Pressable
          key={complaint.id}
          accessibilityRole="button"
          onPress={() => {
            Alert.alert(complaint.authorName, complaint.body, [
              { text: 'Close' },
              {
                text: 'Mark reviewed',
                onPress: () => {
                  void reviewComplaint(complaint.id).then(async (message) => {
                    if (message) Alert.alert('Not saved', message);
                    else await reload();
                  });
                },
              },
              {
                text: 'Suspend account',
                style: 'destructive',
                onPress: () => suspendAuthor(complaint.authorId, complaint.authorRole),
              },
            ]);
          }}
          style={styles.row}>
          <Text style={styles.name}>
            {complaint.authorName} · {complaint.authorRole}
          </Text>
          <Text style={styles.meta}>
            {complaint.status === 'reviewed' ? 'Reviewed' : 'Open'} · {complaint.body}
          </Text>
        </Pressable>
      ))}
      {complaints.length === 0 ? <Text style={styles.meta}>No reports yet.</Text> : null}
      <Text style={styles.heading}>Locked check-in codes</Text>
      {locked.map((booking) => {
        const customer = customers.find((item) => item.id === booking.customerId)?.name ?? booking.customerName;
        const therapist = therapists.find((item) => item.id === booking.therapistId)?.name ?? 'Therapist';
        return (
          <Pressable
            key={booking.id}
            accessibilityRole="button"
            onPress={() => {
              Alert.alert(`${customer} and ${therapist}`, 'Unlock the code, or suspend one of the accounts.', [
                { text: 'Close' },
                {
                  text: 'Unlock code',
                  onPress: () => {
                    void unlockCheckIn(booking.id).then(async (message) => {
                      if (message) Alert.alert('Not saved', message);
                      else await reload();
                    });
                  },
                },
                { text: 'Suspend customer', style: 'destructive', onPress: () => suspendAuthor(booking.customerId, 'customer') },
                { text: 'Suspend therapist', style: 'destructive', onPress: () => suspendAuthor(booking.therapistId, 'therapist') },
              ]);
            }}
            style={styles.row}>
            <Text style={styles.name}>{customer}</Text>
            <Text style={styles.meta}>
              {therapist} · {booking.date} {booking.time} · tap to unlock or suspend
            </Text>
          </Pressable>
        );
      })}
      {locked.length === 0 ? <Text style={styles.meta}>No check-in codes are locked.</Text> : null}
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
    gap: 4,
  },
  name: { color: palette.ink, fontWeight: '700', fontSize: 16 },
  meta: { color: palette.muted },
});
