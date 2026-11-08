import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, Field, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useAdminData } from '@/hooks/use-admin';
import { back, push } from '@/lib/nav';
import type { VerificationStatus } from '@/types/domain';

const FILTERS: { id: 'all' | VerificationStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'verified', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

export default function AdminTherapists() {
  const { therapists, loading } = useAdminData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('pending');
  const rows = useMemo(
    () =>
      therapists.filter((therapist) => {
        const statusOk = filter === 'all' || therapist.verification === filter;
        const text = `${therapist.name} ${therapist.email}`.toLowerCase();
        return statusOk && text.includes(query.trim().toLowerCase());
      }),
    [therapists, filter, query],
  );

  return (
    <Screen onBack={back}>
      <PageTitle title="Therapist applications" subtitle="Open a person to review documents." />
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="Name or email" />
      <View style={styles.filters}>
        {FILTERS.map((item) => (
          <Chip key={item.id} label={item.label} selected={filter === item.id} onPress={() => setFilter(item.id)} />
        ))}
      </View>
      {loading ? <ActivityIndicator color={palette.palm} /> : null}
      {rows.map((therapist) => (
        <Pressable
          key={therapist.id}
          accessibilityRole="button"
          onPress={() => push(`/admin/therapist/${therapist.id}`)}
          style={styles.row}>
          <Text style={styles.name}>{therapist.name}</Text>
          <Text style={styles.meta}>
            {therapist.verification === 'verified' ? 'Approved' : therapist.verification === 'rejected' ? 'Rejected' : 'Pending'}
            {therapist.suspended ? ' · Suspended' : ''}
          </Text>
        </Pressable>
      ))}
      {rows.length === 0 && !loading ? <Text style={styles.meta}>No applicants in this list.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
