import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Empty, Kicker, Pill, Screen } from '@/components/ui';
import { font, lift, palette } from '@/constants/theme';
import { CITY_NAME, CLINIC, activeTreatments } from '@/data/catalog';
import { useApp } from '@/context/store';
import { modeSummary } from '@/lib/labels';
import { param, push } from '@/lib/nav';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

export default function TherapistProfileScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const { therapists } = useApp();
  const therapist = therapists.find((item) => item.id === param(rawId));

  if (!therapist) {
    return (
      <Screen title="Therapist" onBack={() => router.back()}>
        <Empty title="This therapist is not on Hilotcare." />
      </Screen>
    );
  }

  const initials = therapist.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  const services = activeTreatments().filter((treatment) => therapist.treatmentIds.includes(treatment.id));
  const firstName = therapist.name.split(' ')[0] || therapist.name;
  const years = therapist.years > 0 ? `${therapist.years} years` : 'Not added yet';
  const homeArea =
    therapist.travelZones.length === 0 ? `All 44 ${CITY_NAME} barangays` : therapist.travelZones.join(', ');

  return (
    <Screen
      title="Therapist"
      onBack={() => router.back()}
      footer={<Button label={`Book with ${firstName}`} onPress={() => push(`/book?therapistId=${therapist.id}`)} />}>
      <View style={styles.hero}>
        <View style={styles.ring}>
          {therapist.photo ? (
            <Image source={therapist.photo} contentFit="cover" style={styles.photo} />
          ) : (
            <View style={styles.photo}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{therapist.name}</Text>
        <Text style={styles.title}>{therapist.title.trim() || 'Hilotcare therapist'}</Text>
        {therapist.verification === 'verified' ? <Pill label="Verified Hilotcare therapist" tone="good" /> : null}
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{years}</Text>
          <Text style={styles.statLabel}>Experience</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{modeSummary(therapist)}</Text>
          <Text style={styles.statLabel}>Available for</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Kicker>About</Kicker>
        <Card>
          <Text style={styles.bio}>{therapist.bio.trim() || 'This therapist has not written a bio yet.'}</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <Kicker>Services</Kicker>
        {services.length > 0 ? (
          <View style={styles.pills}>
            {services.map((treatment) => (
              <Pill key={treatment.id} label={treatment.name} tone="neutral" />
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No services selected yet.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Kicker>Where they work</Kicker>
        <Card>
          <Fact label="Home visits" value={homeArea} />
          <View style={styles.divider} />
          <Fact label="Clinic" value={`${CLINIC.name}, ${CLINIC.address}, ${CLINIC.city}, ${CITY_NAME}`} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingTop: 4 },
  ring: {
    padding: 4,
    borderRadius: 84,
    backgroundColor: palette.paper,
    ...lift,
  },
  photo: {
    width: 148,
    height: 148,
    borderRadius: 74,
    overflow: 'hidden',
    backgroundColor: '#E4D5BE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: font.serif, color: palette.palm, fontSize: 40 },
  name: { fontFamily: font.serif, color: palette.palm, fontSize: 30, lineHeight: 36, textAlign: 'center', marginTop: 6 },
  title: { color: palette.muted, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: palette.paper,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 4,
    ...lift,
  },
  statValue: { color: palette.ink, fontWeight: '700', fontSize: 16, lineHeight: 22 },
  statLabel: { color: palette.muted, fontSize: 13 },
  section: { gap: 10 },
  bio: { color: palette.ink, fontSize: 16, lineHeight: 24 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muted: { color: palette.muted, fontSize: 15, lineHeight: 22 },
  fact: { gap: 4 },
  factLabel: { color: palette.muted, fontSize: 13, fontWeight: '700' },
  factValue: { color: palette.ink, fontSize: 16, lineHeight: 23 },
  divider: { height: 1, backgroundColor: palette.line, marginVertical: 4 },
});
