import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, Field, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useAdminData } from '@/hooks/use-admin';
import { back } from '@/lib/nav';
import { setSuspended } from '@/services/admin';

export default function AdminPeople() {
  const { customers, therapists, reload } = useAdminData();
  const [kind, setKind] = useState<'customers' | 'therapists'>('customers');
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const source =
      kind === 'customers'
        ? customers.map((person) => ({ id: person.id, name: person.name, email: person.email, suspended: person.suspended }))
        : therapists.map((person) => ({ id: person.id, name: person.name, email: person.email, suspended: person.suspended }));
    const needle = query.trim().toLowerCase();
    return source.filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(needle));
  }, [kind, customers, therapists, query]);

  const toggle = (id: string, suspended: boolean) => {
    void setSuspended(kind, id, !suspended).then(async (message) => {
      if (message) Alert.alert('Not saved', message);
      else await reload();
    });
  };

  return (
    <Screen onBack={back}>
      <PageTitle title="People" subtitle="Suspend or reactivate a customer or therapist." />
      <View style={styles.filters}>
        <Chip label="Customers" selected={kind === 'customers'} onPress={() => setKind('customers')} />
        <Chip label="Therapists" selected={kind === 'therapists'} onPress={() => setKind('therapists')} />
      </View>
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="Name or email" />
      {rows.map((person) => (
        <Pressable key={person.id} accessibilityRole="button" onPress={() => toggle(person.id, person.suspended)} style={styles.row}>
          <Text style={styles.name}>{person.name}</Text>
          <Text style={styles.meta}>
            {person.email} · {person.suspended ? 'Suspended — tap to reactivate' : 'Active — tap to suspend'}
          </Text>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8 },
  row: {
    backgroundColor: '#FFFBF6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
    gap: 4,
  },
  name: { color: palette.ink, fontWeight: '700', fontSize: 16 },
  meta: { color: palette.muted },
});
