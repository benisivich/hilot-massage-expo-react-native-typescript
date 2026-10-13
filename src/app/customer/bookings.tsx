import { FlatList, StyleSheet, Text, View } from 'react-native';

import { VisitCard } from '@/components/cards';
import { Empty, Kicker, PageTitle, Screen, Stat } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useApp } from '@/context/store';
import { peso, sessionDate } from '@/lib/format';
import type { Booking } from '@/types/domain';

type Row =
  | { key: string; kind: 'heading'; title: string }
  | { key: string; kind: 'empty'; title: string; body?: string }
  | { key: string; kind: 'note' }
  | { key: string; kind: 'visit'; booking: Booking };

export default function CustomerBookings() {
  const { customer, bookings } = useApp();
  const mine = bookings.filter((booking) => booking.customerId === customer.id);
  const spent = mine.reduce((sum, booking) => sum + booking.amountPaid, 0);
  const completed = mine.filter((booking) => booking.status === 'completed').length;
  const upcoming = mine
    .filter((booking) => booking.status !== 'completed' && booking.status !== 'cancelled')
    .slice()
    .sort((a, b) => sessionDate(a).getTime() - sessionDate(b).getTime());
  const past = mine
    .filter((booking) => booking.status === 'completed' || booking.status === 'cancelled')
    .slice()
    .sort((a, b) => sessionDate(b).getTime() - sessionDate(a).getTime());
  const rows: Row[] = [{ key: 'upcoming', kind: 'heading', title: 'Upcoming' }];
  if (upcoming.length === 0) {
    rows.push({
      key: 'upcoming-empty',
      kind: 'empty',
      title: 'No visit booked.',
      body: 'A new reservation will show up here after payment.',
    });
  }
  upcoming.forEach((booking) => rows.push({ key: booking.id, kind: 'visit', booking }));
  rows.push({ key: 'past', kind: 'heading', title: 'Past' });
  if (past.length === 0) rows.push({ key: 'past-empty', kind: 'note' });
  past.forEach((booking) => rows.push({ key: booking.id, kind: 'visit', booking }));

  return (
    <Screen tab scroll={false}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageTitle title="Booking" subtitle="Upcoming appointments and visits you have already finished." />
            <View style={styles.stats}>
              <Stat label="Upcoming" value={String(upcoming.length)} />
              <Stat label="Completed" value={String(completed)} />
              <Stat label="Paid" value={peso(spent)} />
            </View>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'heading') return <Kicker>{item.title}</Kicker>;
          if (item.kind === 'empty') return <Empty title={item.title} body={item.body} />;
          if (item.kind === 'note') {
            return <Text style={styles.note}>Completed and cancelled visits will collect here.</Text>;
          }
          return <VisitCard booking={item.booking} />;
        }}
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
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  note: {
    color: palette.muted,
  },
});
