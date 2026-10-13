import { Text } from 'react-native';

import { BarangaySelect, Button, Field, Notice, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { CITY_NAME } from '@/data/catalog';
import { useApp } from '@/context/store';
import { replace } from '@/lib/nav';

export default function CustomerAccount() {
  const { customer, updateCustomer, setRole, resetDemo } = useApp();
  const mobileOk = /^09\d{9}$/.test(customer.mobile);

  return (
    <Screen tab>
      <PageTitle
        title="Profile"
        subtitle="Your profile and visits are saved on this device. Reset clears that copy."
      />
      <Field label="Name" value={customer.name} onChangeText={(name) => updateCustomer({ name })} />
      <Field
        label="Mobile"
        value={customer.mobile}
        onChangeText={(mobile) => updateCustomer({ mobile: mobile.replace(/\D/g, '').slice(0, 11) })}
        keyboardType="phone-pad"
        hint={mobileOk ? 'Used to prefill GCash or Maya.' : 'Use 11 digits starting with 09.'}
      />
      <BarangaySelect value={customer.city} onChange={(city) => updateCustomer({ city })} />
      <Field label="City" value={CITY_NAME} onChangeText={() => undefined} editable={false} />
      <Field
        label="Home address"
        value={customer.address}
        onChangeText={(address) => updateCustomer({ address })}
        hint="This prefills the next home visit."
      />
      <Notice tone="info">
        Hilotcare sessions are wellness care, not medical treatment.
      </Notice>
      <Text style={{ color: palette.muted, lineHeight: 20 }}>
        {customer.name ? `Signed in as ${customer.name}.` : 'Signed in.'}
      </Text>
      <Button
        label="Log out"
        variant="secondary"
        onPress={() => {
          setRole(null);
          replace('/');
        }}
      />
      <Button
        label="Reset demo data"
        variant="danger"
        onPress={() => {
          resetDemo();
          replace('/');
        }}
      />
    </Screen>
  );
}
