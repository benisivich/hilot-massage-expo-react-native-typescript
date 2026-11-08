import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { Button, Field, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useApp } from '@/context/store';
import { back } from '@/lib/nav';
import { fileComplaint } from '@/services/admin';

export default function ComplaintScreen() {
  const { role, customer, activeTherapist } = useApp();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const author =
    role === 'therapist' && activeTherapist
      ? { id: activeTherapist.id, role: 'therapist' as const, name: activeTherapist.name }
      : role === 'customer' && customer.id
        ? { id: customer.id, role: 'customer' as const, name: customer.name }
        : null;

  const send = async () => {
    if (!author) return;
    if (body.trim().length < 8) {
      Alert.alert('Check the form', 'Describe what happened in a sentence or two.');
      return;
    }
    setBusy(true);
    const message = await fileComplaint({
      authorId: author.id,
      authorRole: author.role,
      authorName: author.name,
      body,
    });
    setBusy(false);
    if (message) {
      Alert.alert('Not sent', message);
      return;
    }
    Alert.alert('Sent', 'Hilotcare can review this report from the admin phone.');
    back();
  };

  return (
    <Screen onBack={back} footer={<Button label={busy ? 'Sending…' : 'Send report'} onPress={() => void send()} disabled={busy || !author} />}>
      <PageTitle title="Report a problem" subtitle="Customers and therapists can send this to Hilotcare." />
      <Text style={{ color: palette.muted, lineHeight: 20 }}>
        Include the visit date and the other person’s name if you have them. Check-in code problems belong here too.
      </Text>
      <Field label="What happened" value={body} onChangeText={setBody} placeholder="Write the report" multiline />
    </Screen>
  );
}
