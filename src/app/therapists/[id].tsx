import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { TreatmentCard } from '@/components/cards';
import { VerifyPill } from '@/components/status';
import { Button, Card, Empty, Kicker, Notice, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { getTreatment } from '@/data/catalog';
import { useApp } from '@/context/store';
import { modeSummary, ratingLabel, zoneSummary } from '@/lib/labels';
import { param, push } from '@/lib/nav';

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

  const verified = therapist.verification === 'verified';

  return (
    <Screen
      title={therapist.name}
      subtitle={therapist.title}
      onBack={() => router.back()}
      footer={
        verified ? (
          <Button label={`Book with ${therapist.name.split(' ')[0]}`} onPress={() => push(`/book?therapistId=${therapist.id}`)} />
        ) : undefined
      }>
      <VerifyPill status={therapist.verification} />
      <Text style={{ color: palette.ink }}>
        {ratingLabel(therapist)} · {therapist.years} years
      </Text>
      <Text style={{ color: palette.ink, fontSize: 16, lineHeight: 23 }}>{therapist.bio}</Text>
      {!verified ? <Notice tone="warn">Not bookable until the license is verified. {therapist.verificationNote}</Notice> : null}
      <Card>
        <Kicker>Credential</Kicker>
        <Text style={{ color: palette.ink, fontWeight: '700' }}>{therapist.licenseNumber}</Text>
        <Text style={{ color: palette.muted, lineHeight: 20 }}>{therapist.issuingBody}</Text>
        <Text style={{ color: palette.muted }}>Valid until {therapist.licenseValidUntil}</Text>
      </Card>
      <Card>
        <Kicker>Coverage</Kicker>
        <Text style={{ color: palette.ink }}>{modeSummary(therapist)}</Text>
        <Text style={{ color: palette.muted, lineHeight: 20 }}>Travels to {zoneSummary(therapist.travelZones)}.</Text>
        {therapist.clinic ? (
          <Text style={{ color: palette.ink, lineHeight: 20 }}>
            {therapist.clinic.name}, {therapist.clinic.address}, {therapist.clinic.city}
          </Text>
        ) : null}
      </Card>
      <Kicker>Treatments</Kicker>
      {therapist.treatmentIds.map((id) => {
        const treatment = getTreatment(id);
        if (!treatment) return null;
        return <TreatmentCard key={id} treatment={treatment} onPress={() => push(`/treatment/${id}`)} />;
      })}
    </Screen>
  );
}
