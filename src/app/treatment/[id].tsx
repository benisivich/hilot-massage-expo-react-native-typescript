import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { TherapistRow } from '@/components/cards';
import { Button, Empty, Kicker, Line, Notice, Pill, Screen } from '@/components/ui';
import { font, palette } from '@/constants/theme';
import { getTreatment } from '@/data/catalog';
import { useApp } from '@/context/store';
import { formatDuration, peso } from '@/lib/format';
import { CATEGORY_LABEL, modeSummary } from '@/lib/labels';
import { param, push } from '@/lib/nav';
import { quoted } from '@/lib/rules';

export default function TreatmentScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const treatment = getTreatment(param(rawId) ?? '');
  const { therapists } = useApp();

  if (!treatment) {
    return (
      <Screen title="Treatment" onBack={() => router.back()}>
        <Empty title="This treatment is not in the catalog." />
      </Screen>
    );
  }

  const offeredBy = therapists.filter(
    (therapist) => therapist.treatmentIds.includes(treatment.id) && therapist.verification === 'verified' && !therapist.suspended,
  );

  return (
    <Screen
      title={treatment.name}
      subtitle={CATEGORY_LABEL[treatment.category]}
      onBack={() => router.back()}
      footer={<Button label="Book Now!" onPress={() => push(`/book?treatmentId=${treatment.id}`)} />}>
      <View style={styles.hero}>
        <Image source={treatment.image} contentFit="cover" style={styles.orb} />
        <Text style={styles.mark}>-{treatment.name}-</Text>
        <Text style={styles.body}>
          {peso(quoted(treatment, treatment.durationOptions[0] ?? 60).serviceTotal)} · {formatDuration(treatment.durationOptions[0] ?? 60)}
        </Text>
      </View>
      <Text style={styles.body}>{treatment.description}</Text>
      <Kicker>Includes</Kicker>
      <Text style={styles.body}>Verified therapist</Text>
      <Text style={styles.body}>Home or clinic service</Text>
      {treatment.caution ? <Notice tone="warn">{treatment.caution}</Notice> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {treatment.focus.map((item) => (
          <Pill key={item} label={item} tone="neutral" />
        ))}
      </View>
      <Kicker>Lengths and prices</Kicker>
      {treatment.durationOptions.map((minutes) => (
        <Line key={minutes} label={formatDuration(minutes)} value={peso(quoted(treatment, minutes).serviceTotal)} />
      ))}
      <Kicker>Who offers it</Kicker>
      {offeredBy.length === 0 ? (
        <Text style={styles.body}>No therapist offers this service yet.</Text>
      ) : (
        offeredBy.map((therapist) => (
          <TherapistRow
            key={therapist.id}
            therapist={therapist}
            detail={modeSummary(therapist)}
            onPress={() => push(`/therapists/${therapist.id}`)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 12 },
  orb: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    backgroundColor: palette.paper,
  },
  mark: { fontFamily: font.serif, color: palette.palm, fontSize: 26, textAlign: 'center' },
  body: { color: palette.ink, fontSize: 15, lineHeight: 22 },
});
