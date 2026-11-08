import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, Field, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useAdminData } from '@/hooks/use-admin';
import { peso } from '@/lib/format';
import { back, push } from '@/lib/nav';

export default function AdminServices() {
  const { treatments } = useAdminData();
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const rows = useMemo(
    () =>
      treatments.filter((treatment) => {
        const visible = showInactive || treatment.active !== false;
        return visible && treatment.name.toLowerCase().includes(query.trim().toLowerCase());
      }),
    [treatments, query, showInactive],
  );

  return (
    <Screen onBack={back}>
      <PageTitle title="Treatments" subtitle="These are the services customers can book." />
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="Treatment name" />
      <View style={styles.filters}>
        <Chip label="Active" selected={!showInactive} onPress={() => setShowInactive(false)} />
        <Chip label="Include inactive" selected={showInactive} onPress={() => setShowInactive(true)} />
      </View>
      <Pressable accessibilityRole="button" onPress={() => push('/admin/service/new')} style={styles.add}>
        <Text style={styles.addText}>Add treatment</Text>
      </Pressable>
      {rows.map((treatment) => {
        const price = Object.values(treatment.packagePrices)[0] ?? treatment.hourlyRate;
        const place =
          treatment.offersHome !== false && treatment.offersClinic !== false
            ? 'Home and clinic'
            : treatment.offersHome === false
              ? 'Clinic'
              : 'Home';
        return (
          <Pressable
            key={treatment.id}
            accessibilityRole="button"
            onPress={() => push(`/admin/service/${treatment.id}`)}
            style={styles.row}>
            <Text style={styles.name}>{treatment.name}</Text>
            <Text style={styles.meta}>
              {peso(price)} · {treatment.durationOptions.join(', ')} min · {place}
              {treatment.active === false ? ' · Inactive' : ''}
            </Text>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8 },
  add: { backgroundColor: palette.palm, borderRadius: 12, padding: 14 },
  addText: { color: '#FFFBF6', fontWeight: '700', textAlign: 'center' },
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
