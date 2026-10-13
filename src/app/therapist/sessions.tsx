import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { VisitCard } from '@/components/cards';
import { Chip, Empty, PageTitle, Screen } from '@/components/ui';
import { useApp } from '@/context/store';
import { sessionDate } from '@/lib/format';

export default function TherapistSessions() {
  const { bookings, activeTherapist } = useApp();
  const [done, setDone] = useState(false);
  const mine = bookings
    .filter((booking) => booking.therapistId === activeTherapist?.id)
    .filter((booking) =>
      done
        ? booking.status === 'confirmed' || booking.status === 'completed' || booking.status === 'cancelled'
        : booking.status === 'assigned',
    )
    .sort((a, b) => (sessionDate(a).getTime() - sessionDate(b).getTime()) * (done ? -1 : 1));

  return (
    <Screen tab scroll={false}>
      <FlatList
        data={mine}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageTitle title="Visits" subtitle="A visit appears here only after a customer books. Accept the payment to confirm it." />
            <View style={styles.filters}>
              <Chip label="Open" selected={!done} onPress={() => setDone(false)} />
              <Chip label="Finished" selected={done} onPress={() => setDone(true)} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <Empty
            title={done ? 'No confirmed visits yet.' : 'No bookings yet.'}
            body={done ? 'Confirmed visits show up here after you accept a payment.' : 'A visit is listed only after a customer books a session.'}
          />
        }
        renderItem={({ item }) => <VisitCard booking={item} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 108,
    gap: 14,
  },
  header: {
    gap: 14,
    marginBottom: 14,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
});
