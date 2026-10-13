import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { TherapistRow, TreatmentCard } from '@/components/cards';
import { Chip, Empty, Kicker, PageTitle, Screen } from '@/components/ui';
import { TREATMENTS } from '@/data/catalog';
import { useApp } from '@/context/store';
import { modeSummary, zoneSummary } from '@/lib/labels';
import { push } from '@/lib/nav';
import type { TreatmentCategory } from '@/types/domain';

const FILTERS: { id: 'all' | TreatmentCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'hilot', label: 'Hilot' },
  { id: 'massage', label: 'Massage' },
  { id: 'combo', label: 'Combination' },
];

export default function CatalogScreen() {
  const { therapists } = useApp();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const treatments = useMemo(
    () => TREATMENTS.filter((treatment) => filter === 'all' || treatment.category === filter),
    [filter],
  );

  return (
    <Screen tab scroll={false}>
      <FlatList
        data={therapists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageTitle title="Services" subtitle="Choose a treatment, then view the price and length." />
            <View style={styles.filters}>
              {FILTERS.map((item) => (
                <Chip key={item.id} label={item.label} selected={filter === item.id} onPress={() => setFilter(item.id)} />
              ))}
            </View>
            <View style={styles.grid}>
              {treatments.map((treatment) => (
                <View key={treatment.id} style={styles.cell}>
                  <TreatmentCard
                    treatment={treatment}
                    layout="circle"
                    onPress={() => push(`/treatment/${treatment.id}`)}
                  />
                </View>
              ))}
            </View>
            <Kicker>Available therapists</Kicker>
          </View>
        }
        ListEmptyComponent={<Empty title="No therapists yet." body="A therapist appears here after they create an account and enter their details." />}
        renderItem={({ item }) => (
          <TherapistRow
            therapist={item}
            detail={`${modeSummary(item)} · ${zoneSummary(item.travelZones)}`}
            onPress={() => push(`/therapists/${item.id}`)}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 108,
    gap: 14,
  },
  header: { gap: 14, marginBottom: 14 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%' },
});
