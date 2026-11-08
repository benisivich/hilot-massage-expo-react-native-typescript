import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { ProfilePhoto } from '@/components/profile-photo';
import { Button, Chip, Field, Notice, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { CLINIC, CITY_NAME, activeTreatments } from '@/data/catalog';
import { useApp } from '@/context/store';
import { push, replace } from '@/lib/nav';

export default function TherapistProfile() {
  const { activeTherapist, updateTherapist, setRole } = useApp();
  const [draft, setDraft] = useState({
    photo: activeTherapist?.photo ?? '',
    name: activeTherapist?.name ?? '',
    title: activeTherapist?.title ?? '',
    years: activeTherapist && activeTherapist.years > 0 ? String(activeTherapist.years) : '',
    bio: activeTherapist?.bio ?? '',
    treatmentIds: activeTherapist?.treatmentIds ?? [],
  });

  if (!activeTherapist) {
    return (
      <Screen tab>
        <PageTitle title="Profile" subtitle="Create a therapist account from the welcome screen." />
        <Button
          label="Log out"
          variant="secondary"
          onPress={() => {
            setRole(null);
            replace('/');
          }}
        />
      </Screen>
    );
  }

  const therapist = activeTherapist;

  return (
    <Screen tab>
      <PageTitle
        title="Profile"
        subtitle="Change your details, then tap Save. New bookings appear under Visits."
      />
      <ProfilePhoto photo={draft.photo} name={draft.name} onChange={(photo) => setDraft((current) => ({ ...current, photo }))} />
      <Notice tone="good">This account is verified. Hilotcare hires you, so clients can book you right away.</Notice>
      <Field label="Email" value={therapist.email} onChangeText={() => undefined} editable={false} />
      <Field
        label="Full name"
        value={draft.name}
        onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
        placeholder="Your name"
      />
      <Field
        label="Title"
        value={draft.title}
        onChangeText={(title) => setDraft((current) => ({ ...current, title }))}
        placeholder="Hilot therapist"
      />
      <Field
        label="Years in practice"
        value={draft.years}
        onChangeText={(value) => setDraft((current) => ({ ...current, years: value.replace(/\D/g, '').slice(0, 2) }))}
        keyboardType="number-pad"
        placeholder="0"
      />
      <Field
        label="Bio"
        value={draft.bio}
        onChangeText={(bio) => setDraft((current) => ({ ...current, bio }))}
        placeholder="Tell clients how you work"
        multiline
      />
      <Text style={{ color: palette.ink, fontWeight: '700' }}>Services you offer</Text>
      <Text style={{ color: palette.muted, lineHeight: 20 }}>
        Turn a service on so clients can book you for it. Every new account starts with all services on.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {activeTreatments().map((treatment) => {
          const selected = draft.treatmentIds.includes(treatment.id);
          return (
            <Chip
              key={treatment.id}
              label={treatment.name}
              selected={selected}
              onPress={() =>
                setDraft((current) => ({
                  ...current,
                  treatmentIds: selected
                    ? current.treatmentIds.filter((id) => id !== treatment.id)
                    : [...current.treatmentIds, treatment.id],
                }))
              }
            />
          );
        })}
      </View>
      <Notice tone="info">
        {`Clinic visits are at ${CLINIC.name}, ${CLINIC.address}, ${CLINIC.city}, ${CITY_NAME}. Clients who choose Clinic use this address automatically.`}
      </Notice>
      <Button
        label="Save"
        onPress={() => {
          const name = draft.name.trim();
          if (name.length < 2) {
            Alert.alert('Check the form', 'Enter your full name.');
            return;
          }
          void updateTherapist(therapist.id, {
            photo: draft.photo,
            name,
            title: draft.title.trim(),
            years: draft.years ? Number(draft.years) : 0,
            bio: draft.bio.trim(),
            treatmentIds: draft.treatmentIds,
          }).then((result) => {
            if (!result.ok) {
              Alert.alert('Not saved', result.message);
              return;
            }
            setDraft((current) => ({ ...current, name, title: draft.title.trim(), bio: draft.bio.trim() }));
            Alert.alert('Saved', 'Your title, bio, years, and photo are saved.');
          });
        }}
      />
      <Button label="Report a problem" variant="secondary" onPress={() => push('/complaint')} />
      <Button
        label="Log out"
        variant="secondary"
        onPress={() => {
          setRole(null);
          replace('/');
        }}
      />
    </Screen>
  );
}
