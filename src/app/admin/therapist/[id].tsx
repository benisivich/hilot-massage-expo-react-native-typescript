import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Text } from 'react-native';

import { Button, Field, Line, Notice, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useAdminData } from '@/hooks/use-admin';
import { back, param } from '@/lib/nav';
import { reviewTherapist, setSuspended } from '@/services/admin';
import { useLocalSearchParams } from 'expo-router';

export default function AdminTherapistReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const therapistId = param(id);
  const { therapists, loading, reload } = useAdminData();
  const therapist = therapists.find((item) => item.id === therapistId);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (status: 'verified' | 'rejected') => {
    if (!therapist) return;
    if (status === 'rejected' && reason.trim().length < 3) {
      Alert.alert('Reason required', 'Write why this application is rejected.');
      return;
    }
    setBusy(true);
    const message = await reviewTherapist(therapist.id, status, status === 'rejected' ? reason.trim() : '');
    setBusy(false);
    if (message) {
      Alert.alert('Not saved', message);
      return;
    }
    await reload();
    Alert.alert(status === 'verified' ? 'Approved' : 'Rejected', therapist.name);
  };

  if (loading && !therapist) {
    return (
      <Screen onBack={back}>
        <ActivityIndicator color={palette.palm} />
      </Screen>
    );
  }

  if (!therapist) {
    return (
      <Screen onBack={back}>
        <PageTitle title="Applicant" subtitle="This therapist is not in the list." />
      </Screen>
    );
  }

  return (
    <Screen onBack={back}>
      <PageTitle title={therapist.name} subtitle={therapist.email} />
      <Line label="Status" value={therapist.verification === 'verified' ? 'Approved' : therapist.verification === 'rejected' ? 'Rejected' : 'Pending'} />
      <Line label="Service areas" value={therapist.travelZones.length ? therapist.travelZones.join(', ') : 'All supported barangays'} />
      {therapist.verificationNote ? <Notice tone="warn">{therapist.verificationNote}</Notice> : null}
      <Text style={{ color: palette.ink, fontWeight: '700' }}>Valid ID</Text>
      {therapist.validId ? (
        <Image source={{ uri: therapist.validId }} style={{ width: '100%', height: 200, borderRadius: 12 }} />
      ) : (
        <Text style={{ color: palette.muted }}>No ID uploaded yet.</Text>
      )}
      <Text style={{ color: palette.ink, fontWeight: '700' }}>License or certificate</Text>
      {therapist.certificate ? (
        <Image source={{ uri: therapist.certificate }} style={{ width: '100%', height: 200, borderRadius: 12 }} />
      ) : (
        <Text style={{ color: palette.muted }}>No certificate uploaded yet.</Text>
      )}
      <Field label="Rejection reason" value={reason} onChangeText={setReason} placeholder="Required only when rejecting" multiline />
      <Button label={busy ? 'Saving…' : 'Approve'} onPress={() => void act('verified')} disabled={busy} />
      <Button label="Reject" variant="danger" onPress={() => void act('rejected')} disabled={busy} />
      <Button
        label={therapist.suspended ? 'Reactivate account' : 'Suspend account'}
        variant="secondary"
        onPress={() => {
          void setSuspended('therapists', therapist.id, !therapist.suspended).then(async (message) => {
            if (message) Alert.alert('Not saved', message);
            else await reload();
          });
        }}
      />
    </Screen>
  );
}
