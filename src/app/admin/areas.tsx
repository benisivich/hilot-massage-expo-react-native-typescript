import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { Button, Field, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useAdminData } from '@/hooks/use-admin';
import { back } from '@/lib/nav';
import { setAreaActive } from '@/services/admin';

export default function AdminAreas() {
  const { areas, reload } = useAdminData();
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const rows = useMemo(
    () => areas.filter((area) => area.name.toLowerCase().includes(query.trim().toLowerCase())),
    [areas, query],
  );

  const save = async (areaName: string, active: boolean) => {
    const message = await setAreaActive(areaName, active);
    if (message) Alert.alert('Not saved', message);
    else await reload();
  };

  return (
    <Screen onBack={back}>
      <PageTitle title="Service areas" subtitle="Customers can book only in active barangays." />
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="Barangay" />
      <Field label="New area" value={name} onChangeText={setName} placeholder="Barangay name" />
      <Button
        label="Add area"
        onPress={() => {
          const next = name.trim();
          if (next.length < 2) return;
          setName('');
          void save(next, true);
        }}
      />
      {rows.map((area) => (
        <Pressable key={area.name} accessibilityRole="button" onPress={() => void save(area.name, !area.active)} style={styles.row}>
          <Text style={styles.name}>{area.name}</Text>
          <Text style={styles.meta}>{area.active ? 'Active — tap to turn off' : 'Off — tap to turn on'}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
