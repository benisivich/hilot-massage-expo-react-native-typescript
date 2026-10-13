import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { VerifyPill } from '@/components/status';
import { Button, Chip, Field, Kicker, Notice, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { ISSUING_BODIES, TREATMENTS } from '@/data/catalog';
import { useApp } from '@/context/store';
import { replace } from '@/lib/nav';

export default function TherapistProfile() {
  const { activeTherapist, updateTherapist, submitVerification, approveVerification, setRole, resetDemo } = useApp();
  const [licenseNumber, setLicenseNumber] = useState(activeTherapist?.licenseNumber ?? '');
  const [issuingBody, setIssuingBody] = useState(activeTherapist?.issuingBody ?? '');
  const [licenseValidUntil, setLicenseValidUntil] = useState(activeTherapist?.licenseValidUntil ?? '');
  const [years, setYears] = useState(activeTherapist && activeTherapist.years > 0 ? String(activeTherapist.years) : '');
  const [message, setMessage] = useState<string | null>(null);

  if (!activeTherapist) {
    return (
      <Screen tab>
        <PageTitle title="Profile" subtitle="Create a therapist account from the welcome screen." />
        <Button
          label="Log out"
          variant="secondary"
          onPress={() => {
            setRole(null);
            replace('/');
          }}
        />
      </Screen>
    );
  }

  const therapist = activeTherapist;

  const send = () => {
    const result = submitVerification({ licenseNumber, issuingBody, licenseValidUntil });
    const text = result.message ?? (result.ok ? 'Sent.' : 'Could not submit.');
    setMessage(text);
    Alert.alert(result.ok ? 'License saved' : 'Check the form', text);
  };

  const toggleTreatment = (id: string) => {
    const next = therapist.treatmentIds.includes(id)
      ? therapist.treatmentIds.filter((item) => item !== id)
      : [...therapist.treatmentIds, id];
    updateTherapist(therapist.id, { treatmentIds: next });
  };

  return (
    <Screen tab>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <PageTitle title="Profile" subtitle="These details are what clients see when they book." />
        <VerifyPill status={therapist.verification} />
      </View>
      <Notice tone={therapist.verification === 'verified' ? 'good' : 'warn'}>{therapist.verificationNote}</Notice>
      {therapist.reviewedAt ? <Text style={{ color: palette.muted }}>Last reviewed {therapist.reviewedAt}.</Text> : null}
      <Field label="Email" value={therapist.email} onChangeText={() => undefined} editable={false} />
      <Field
        label="Full name"
        value={therapist.name}
        onChangeText={(name) => updateTherapist(therapist.id, { name })}
        placeholder="Your name"
      />
      <Field
        label="Title"
        value={therapist.title}
        onChangeText={(title) => updateTherapist(therapist.id, { title })}
        placeholder="Hilot therapist"
      />
      <Field
        label="Years in practice"
        value={years}
        onChangeText={(value) => {
          const digits = value.replace(/\D/g, '').slice(0, 2);
          setYears(digits);
          updateTherapist(therapist.id, { years: digits ? Number(digits) : 0 });
        }}
        keyboardType="number-pad"
        placeholder="0"
      />
      <Field
        label="Bio"
        value={therapist.bio}
        onChangeText={(bio) => updateTherapist(therapist.id, { bio })}
        placeholder="Tell clients how you work"
        multiline
      />
      <Kicker>Services you offer</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TREATMENTS.map((treatment) => (
          <Chip
            key={treatment.id}
            label={treatment.name}
            selected={therapist.treatmentIds.includes(treatment.id)}
            onPress={() => toggleTreatment(treatment.id)}
          />
        ))}
      </View>
      <Field label="License number" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="Enter your license number" />
      <Kicker>Issuing body</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ISSUING_BODIES.map((body) => (
          <Chip key={body} label={body.replace(' — ', ' ')} selected={issuingBody === body} onPress={() => setIssuingBody(body)} />
        ))}
      </View>
      <Field
        label="Valid until"
        value={licenseValidUntil}
        onChangeText={setLicenseValidUntil}
        placeholder="YYYY-MM-DD"
        hint="Use the expiry printed on the credential."
      />
      {message ? <Notice tone={message.startsWith('License') ? 'good' : 'bad'}>{message}</Notice> : null}
      <Button
        label="Submit credentials"
        onPress={() => {
          if (therapist.verification === 'verified') {
            Alert.alert(
              'Send this license back to review?',
              'You will not appear for new bookings until it is approved again.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Submit', onPress: send },
              ],
            );
            return;
          }
          send();
        }}
      />
      {therapist.verification === 'pending' ? (
        <Button
          label="Approve license"
          variant="secondary"
          onPress={() => {
            approveVerification();
            setMessage('License approved. Clients can book you.');
          }}
        />
      ) : null}
      <Button
        label="Log out"
        variant="secondary"
        onPress={() => {
          setRole(null);
          replace('/');
        }}
      />
      <Button
        label="Reset demo data"
        variant="danger"
        onPress={() => {
          resetDemo();
          replace('/');
        }}
      />
    </Screen>
  );
}
