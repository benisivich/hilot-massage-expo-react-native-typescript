import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { ProfilePhoto } from '@/components/profile-photo';
import { BarangaySelect, Button, Field, Notice, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { CITY_NAME } from '@/data/catalog';
import { useApp } from '@/context/store';
import { push, replace } from '@/lib/nav';

export default function CustomerAccount() {
  const { customer, updateCustomer, setRole } = useApp();
  const [draft, setDraft] = useState({
    photo: customer.photo,
    name: customer.name,
    mobile: customer.mobile,
    barangay: customer.barangay,
    address: customer.address,
  });
  const mobileOk = /^09\d{9}$/.test(draft.mobile);

  const save = async () => {
    const name = draft.name.trim();
    const mobile = draft.mobile.replace(/\D/g, '');
    if (name.length < 2) {
      Alert.alert('Check the form', 'Enter your full name.');
      return;
    }
    if (!/^09\d{9}$/.test(mobile)) {
      Alert.alert('Check the form', 'Mobile number should be 11 digits and start with 09.');
      return;
    }
    if (!draft.barangay) {
      Alert.alert('Check the form', 'Choose a barangay.');
      return;
    }
    const result = await updateCustomer({
      photo: draft.photo,
      name,
      mobile,
      city: CITY_NAME,
      barangay: draft.barangay,
      address: draft.address.trim(),
    });
    if (!result.ok) {
      Alert.alert('Not saved', result.message);
      return;
    }
    setDraft((current) => ({ ...current, name, mobile, address: draft.address.trim() }));
    Alert.alert('Saved', 'Your barangay and home address are saved.');
  };

  return (
    <Screen tab>
      <PageTitle title="Profile" subtitle="Change your details, then tap Save." />
      <ProfilePhoto photo={draft.photo} name={draft.name} onChange={(photo) => setDraft((current) => ({ ...current, photo }))} />
      <Field label="Name" value={draft.name} onChangeText={(name) => setDraft((current) => ({ ...current, name }))} />
      <Field
        label="Mobile"
        value={draft.mobile}
        onChangeText={(mobile) => setDraft((current) => ({ ...current, mobile: mobile.replace(/\D/g, '').slice(0, 11) }))}
        keyboardType="phone-pad"
        hint={mobileOk ? 'Ready to save.' : 'Use 11 digits starting with 09.'}
      />
      <BarangaySelect value={draft.barangay} onChange={(barangay) => setDraft((current) => ({ ...current, barangay }))} />
      <Field label="City" value={CITY_NAME} onChangeText={() => undefined} editable={false} />
      <Field
        label="Home address"
        value={draft.address}
        onChangeText={(address) => setDraft((current) => ({ ...current, address }))}
        hint="This prefills the next home visit."
      />
      <Notice tone="info">
        Hilotcare sessions are wellness care, not medical treatment.
      </Notice>
      <Text style={{ color: palette.muted, lineHeight: 20 }}>
        {customer.name ? `Signed in as ${customer.name}.` : 'Signed in.'}
      </Text>
      <Button label="Save" onPress={save} />
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
