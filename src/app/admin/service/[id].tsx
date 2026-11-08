import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { Button, Chip, Field, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useAdminData } from '@/hooks/use-admin';
import { back, param } from '@/lib/nav';
import { saveTreatment } from '@/services/admin';
import type { Treatment, TreatmentCategory } from '@/types/domain';
import { useLocalSearchParams } from 'expo-router';

export default function AdminServiceForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const serviceId = param(id) ?? '';
  const creating = serviceId === 'new';
  const { treatments, loading, reload } = useAdminData();
  const existing = treatments.find((item) => item.id === serviceId);
  if (!creating && loading && !existing) {
    return (
      <Screen onBack={back}>
        <ActivityIndicator color={palette.palm} />
      </Screen>
    );
  }

  return (
    <ServiceForm
      key={existing?.id ?? 'new'}
      existing={existing}
      creating={creating}
      onSaved={async (wasNew) => {
        await reload();
        if (wasNew) back();
      }}
    />
  );
}

function ServiceForm({
  existing,
  creating,
  onSaved,
}: {
  existing: Treatment | undefined;
  creating: boolean;
  onSaved: (wasNew: boolean) => Promise<void>;
}) {
  const first = existing?.durationOptions[0];
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [durations, setDurations] = useState(existing ? existing.durationOptions.join(', ') : '60');
  const [price, setPrice] = useState(existing ? String(existing.packagePrices[first ?? 60] ?? existing.hourlyRate) : '');
  const [place, setPlace] = useState<'both' | 'home' | 'clinic'>(
    existing?.offersHome === false ? 'clinic' : existing?.offersClinic === false ? 'home' : 'both',
  );
  const [category, setCategory] = useState<TreatmentCategory>(existing?.category ?? 'massage');
  const [active, setActive] = useState(existing?.active !== false);
  const [busy, setBusy] = useState(false);

  const save = async (nextActive: boolean) => {
    const durationOptions = durations
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((minutes) => Number.isFinite(minutes) && minutes > 0);
    const amount = Number(price);
    if (name.trim().length < 2 || durationOptions.length === 0 || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Check the form', 'Enter a name, at least one duration in minutes, and a price.');
      return;
    }
    const packagePrices: Record<number, number> = {};
    for (const minutes of durationOptions) packagePrices[minutes] = amount;
    const treatment: Treatment = {
      id: creating
        ? `tr_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'service'}`
        : (existing?.id ?? 'service'),
      name: name.trim(),
      category,
      summary: description.trim().slice(0, 90),
      description: description.trim(),
      durationOptions,
      hourlyRate: amount,
      packagePrices,
      focus: existing?.focus ?? [],
      image: existing?.image ?? 0,
      active: nextActive,
      offersHome: place !== 'clinic',
      offersClinic: place !== 'home',
    };
    setBusy(true);
    const message = await saveTreatment(treatment);
    setBusy(false);
    if (message) {
      Alert.alert('Not saved', message);
      return;
    }
    Alert.alert('Saved', treatment.name);
    if (!creating) setActive(nextActive);
    await onSaved(creating);
  };

  return (
    <Screen onBack={back}>
      <PageTitle title={creating ? 'New treatment' : 'Edit treatment'} subtitle="Price applies to each duration you list." />
      <Field label="Name" value={name} onChangeText={setName} placeholder="Hilot" />
      <Field label="Description" value={description} onChangeText={setDescription} placeholder="What the session includes" multiline />
      <Field label="Duration options" value={durations} onChangeText={setDurations} placeholder="60, 90" hint="Minutes, separated by commas." />
      <Field label="Price" value={price} onChangeText={setPrice} placeholder="580" keyboardType="number-pad" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="Massage" selected={category === 'massage'} onPress={() => setCategory('massage')} />
        <Chip label="Hilot" selected={category === 'hilot'} onPress={() => setCategory('hilot')} />
        <Chip label="Combo" selected={category === 'combo'} onPress={() => setCategory('combo')} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="Home and clinic" selected={place === 'both'} onPress={() => setPlace('both')} />
        <Chip label="Home" selected={place === 'home'} onPress={() => setPlace('home')} />
        <Chip label="Clinic" selected={place === 'clinic'} onPress={() => setPlace('clinic')} />
      </View>
      <Button label={busy ? 'Saving…' : 'Save'} onPress={() => void save(active)} disabled={busy} />
      {creating ? null : (
        <Button
          label={active ? 'Deactivate' : 'Activate'}
          variant="secondary"
          onPress={() => void save(!active)}
          disabled={busy}
        />
      )}
    </Screen>
  );
}
