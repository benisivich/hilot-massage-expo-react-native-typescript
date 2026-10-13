import { Text, View } from 'react-native';

import { BarangaySelect, Chip, Field, Kicker, Notice, PageTitle, Screen, ToggleRow } from '@/components/ui';
import { palette } from '@/constants/theme';
import { BARANGAYS, CITY_NAME, MASTER_SLOTS } from '@/data/catalog';
import { useApp } from '@/context/store';
import { formatTime, WEEKDAY_NAMES } from '@/lib/format';

export default function ScheduleScreen() {
  const { activeTherapist, updateTherapist } = useApp();
  if (!activeTherapist) {
    return (
      <Screen tab>
        <PageTitle title="Hours" />
      </Screen>
    );
  }
  const therapist = activeTherapist;

  const toggleZone = (city: string) => {
    const next = therapist.travelZones.includes(city)
      ? therapist.travelZones.filter((zone) => zone !== city)
      : [...therapist.travelZones, city];
    updateTherapist(therapist.id, { travelZones: next });
  };

  const toggleSlot = (day: string, time: string) => {
    const current = therapist.weeklySlots[day] ?? [];
    const next = current.includes(time) ? current.filter((slot) => slot !== time) : [...current, time].sort();
    updateTherapist(therapist.id, { weeklySlots: { ...therapist.weeklySlots, [day]: next } });
  };

  const slotCount = Object.values(therapist.weeklySlots).reduce((sum, slots) => sum + slots.length, 0);

  return (
    <Screen tab>
      <PageTitle title="Hours and zones" subtitle={`Home bookings only land in ${CITY_NAME} barangays you travel to, and only on hours you leave open.`} />
      <ToggleRow
        label="Home visits"
        detail="Travel to the client’s address."
        value={therapist.offersHome}
        onValueChange={(offersHome) => updateTherapist(therapist.id, { offersHome })}
      />
      <ToggleRow
        label="Clinic"
        detail="Clients come to your room."
        value={therapist.offersClinic}
        onValueChange={(offersClinic) =>
          updateTherapist(therapist.id, {
            offersClinic,
            clinic: therapist.clinic ?? { name: '', address: '', city: '' },
          })
        }
      />
      {therapist.offersHome && therapist.travelZones.length === 0 ? (
        <Notice tone="warn">Add at least one travel zone or home bookings will not reach you.</Notice>
      ) : null}
      {slotCount === 0 ? <Notice tone="warn">Add at least one hour or you will not appear on the schedule.</Notice> : null}
      <Kicker>Barangays you travel to</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {BARANGAYS.map((barangay) => (
          <Chip
            key={barangay}
            label={barangay}
            selected={therapist.travelZones.includes(barangay)}
            onPress={() => toggleZone(barangay)}
          />
        ))}
      </View>
      {therapist.offersClinic && therapist.clinic ? (
        <View style={{ gap: 10 }}>
          <Field
            label="Clinic name"
            value={therapist.clinic.name}
            onChangeText={(name) => updateTherapist(therapist.id, { clinic: { ...therapist.clinic!, name } })}
          />
          <Field
            label="Clinic address"
            value={therapist.clinic.address}
            onChangeText={(address) => updateTherapist(therapist.id, { clinic: { ...therapist.clinic!, address } })}
          />
          <BarangaySelect
            label="Clinic barangay"
            value={therapist.clinic.city}
            onChange={(city) => updateTherapist(therapist.id, { clinic: { ...therapist.clinic!, city } })}
          />
        </View>
      ) : null}
      <Kicker>Weekly hours</Kicker>
      {WEEKDAY_NAMES.map((name, index) => (
        <View key={name} style={{ gap: 8 }}>
          <Text style={{ color: palette.ink, fontWeight: '700' }}>{name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MASTER_SLOTS.map((time) => (
              <Chip
                key={time}
                label={formatTime(time)}
                selected={(therapist.weeklySlots[String(index)] ?? []).includes(time)}
                onPress={() => toggleSlot(String(index), time)}
              />
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}
