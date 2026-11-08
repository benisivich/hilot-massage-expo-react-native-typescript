import { Text, View } from 'react-native';

import { Chip, Kicker, Notice, PageTitle, Screen, ToggleRow } from '@/components/ui';
import { palette } from '@/constants/theme';
import { CITY_NAME, MASTER_SLOTS, activeBarangays } from '@/data/catalog';
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
      <PageTitle
        title="Hours and zones"
        subtitle={`Home visits stay inside the 44 ${CITY_NAME} barangays. Choose where you travel and which hours you open.`}
      />
      <ToggleRow
        label="Home visits"
        detail="Travel to the client’s address."
        value={therapist.offersHome}
        onValueChange={(offersHome) => updateTherapist(therapist.id, { offersHome })}
      />
      <Notice tone="info">
        Clinic visits use the Hilotcare address in Poblacion. Clients who choose Clinic are sent there automatically.
      </Notice>
      {therapist.travelZones.length === 0 ? (
        <Notice tone="info">No barangays selected, so home visits can be booked in all 44. Select the ones you travel to, and other barangays are refused.</Notice>
      ) : (
        <Notice tone="info">Home visits are accepted only in the barangays you select here.</Notice>
      )}
      {slotCount === 0 ? (
        <Notice tone="info">No hours selected, so any future time can be booked. Select hours, and only those times stay open.</Notice>
      ) : (
        <Notice tone="info">Clients can book only the hours you turn on, and only when that time is not already taken.</Notice>
      )}
      <Kicker>Barangays you travel to</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {activeBarangays().map((barangay) => (
          <Chip
            key={barangay}
            label={barangay}
            selected={therapist.travelZones.includes(barangay)}
            onPress={() => toggleZone(barangay)}
          />
        ))}
      </View>
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
