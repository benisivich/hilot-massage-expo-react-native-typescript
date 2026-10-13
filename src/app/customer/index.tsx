import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { TherapistRow, TreatmentCard, VisitCard } from '@/components/cards';
import { Button, Kicker, Notice, Screen } from '@/components/ui';
import { font, palette } from '@/constants/theme';
import { TREATMENTS } from '@/data/catalog';
import { useApp } from '@/context/store';
import { sessionDate } from '@/lib/format';
import { modeSummary, zoneSummary } from '@/lib/labels';
import { push } from '@/lib/nav';

export default function CustomerHome() {
  const { customer, therapists, bookings } = useApp();
  const first = customer.name.split(' ')[0] ?? customer.name;
  const mine = bookings.filter((booking) => booking.customerId === customer.id);
  const next = mine
    .filter((booking) => booking.status !== 'completed' && booking.status !== 'cancelled')
    .sort((a, b) => sessionDate(a).getTime() - sessionDate(b).getTime())[0];
  const nearby = (status: 'verified' | 'pending') =>
    therapists.filter(
      (therapist) =>
        therapist.verification === status &&
        (therapist.travelZones.includes(customer.city) || therapist.clinic?.city === customer.city),
    );

  return (
    <Screen tab>
      <Text style={styles.hello}>Good day{first ? ',' : ''}</Text>
      {first ? <Text style={styles.name}>{first}</Text> : null}
      <Text style={styles.ask}>What service do you need?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {TREATMENTS.slice(0, 4).map((treatment) => (
          <View key={treatment.id} style={styles.circleSlot}>
            <TreatmentCard
              treatment={treatment}
              layout="circle"
              actionLabel="Book"
              onPress={() => push(`/book?treatmentId=${treatment.id}`)}
            />
          </View>
        ))}
      </ScrollView>
      {next ? <VisitCard booking={next} highlight /> : <Text style={styles.empty}>No upcoming visit yet.</Text>}
      <Button label="Book a session" onPress={() => push('/book')} />
      <Notice tone="info">After you book, your therapist accepts the payment and confirms the visit.</Notice>
      <Kicker>Verified near you</Kicker>
      {therapists.length === 0 ? (
        <Text style={styles.empty}>Therapists show up here after they register and add their details.</Text>
      ) : null}
      {nearby('verified').map((therapist) => (
        <TherapistRow
          key={therapist.id}
          therapist={therapist}
          detail={`${modeSummary(therapist)} · ${zoneSummary(therapist.travelZones)}`}
          onPress={() => push(`/therapists/${therapist.id}`)}
        />
      ))}
      <Kicker>Waiting on review</Kicker>
      {nearby('pending').length === 0 ? (
        <Text style={styles.empty}>No pending therapist covers {customer.city}.</Text>
      ) : (
        nearby('pending').map((therapist) => (
          <TherapistRow
            key={therapist.id}
            therapist={therapist}
            detail={therapist.verificationNote}
            onPress={() => push(`/therapists/${therapist.id}`)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hello: { color: palette.muted, fontSize: 16 },
  name: { fontFamily: font.serif, color: palette.palm, fontSize: 36, lineHeight: 40, marginTop: -8 },
  ask: { color: palette.ink, fontSize: 16, marginTop: 8 },
  row: { gap: 8, paddingRight: 8 },
  circleSlot: { width: 150 },
  empty: { color: palette.muted },
});
