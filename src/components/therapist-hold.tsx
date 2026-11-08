import { useState } from 'react';
import { Alert, Image, Text } from 'react-native';

import { Button, Notice, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useApp } from '@/context/store';
import { replace } from '@/lib/nav';
import { pickProfilePhoto } from '@/lib/photo';
import type { Therapist } from '@/types/domain';

export function TherapistHold({ therapist }: { therapist: Therapist }) {
  const { updateTherapist, setRole } = useApp();
  const [validId, setValidId] = useState(therapist.validId);
  const [certificate, setCertificate] = useState(therapist.certificate);
  const [busy, setBusy] = useState(false);
  const status =
    therapist.suspended
      ? 'This account is suspended. Contact Hilotcare.'
      : therapist.verification === 'rejected'
        ? `Application rejected. ${therapist.verificationNote || 'You can upload clearer documents and wait for another review.'}`
        : 'Your application is pending. Hilotcare will review your ID and certificate before you can take bookings.';

  const upload = async (kind: 'id' | 'certificate') => {
    const photo = await pickProfilePhoto();
    if (!photo) return;
    if (kind === 'id') setValidId(photo);
    else setCertificate(photo);
  };

  const save = async () => {
    if (!validId || !certificate) {
      Alert.alert('Documents needed', 'Upload a valid ID and your license or TESDA certificate.');
      return;
    }
    setBusy(true);
    const result = await updateTherapist(therapist.id, {
      validId,
      certificate,
      verification: 'pending',
      verificationNote: '',
    });
    setBusy(false);
    if (!result.ok) {
      Alert.alert('Not saved', result.message);
      return;
    }
    Alert.alert('Sent for review', 'Hilotcare can now see your documents. This screen stays until you are approved.');
  };

  return (
    <Screen>
      <PageTitle title="Therapist status" subtitle={therapist.name} />
      <Notice tone={therapist.verification === 'rejected' || therapist.suspended ? 'warn' : 'info'}>{status}</Notice>
      <Button label="Upload valid ID" variant="secondary" onPress={() => void upload('id')} />
      {validId ? <Image source={{ uri: validId }} style={{ width: '100%', height: 180, borderRadius: 12 }} /> : null}
      <Button label="Upload license or certificate" variant="secondary" onPress={() => void upload('certificate')} />
      {certificate ? <Image source={{ uri: certificate }} style={{ width: '100%', height: 180, borderRadius: 12 }} /> : null}
      <Text style={{ color: palette.muted, lineHeight: 20 }}>
        Bookings stay closed until an admin approves this account.
      </Text>
      <Button label={busy ? 'Saving…' : 'Submit documents'} onPress={() => void save()} disabled={busy} />
      <Button
        label="Sign out"
        variant="ghost"
        onPress={() => {
          setRole(null);
          replace('/');
        }}
      />
    </Screen>
  );
}
