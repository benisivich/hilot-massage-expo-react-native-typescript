import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { CheckInCode, StatusPill, Timeline } from '@/components/status';
import { Button, Card, Empty, Field, Kicker, Line, Notice, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { getTreatment } from '@/data/catalog';
import { useApp } from '@/context/store';
import { formatDate, formatDuration, formatTime, peso } from '@/lib/format';
import { METHOD_LABEL, MODE_LABEL, PAYMENT_LABEL } from '@/lib/labels';
import { param } from '@/lib/nav';
import { PLATFORM_FEE_PERCENT, therapistNet } from '@/lib/rules';

export default function BookingDetail() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = param(rawId) ?? '';
  const {
    role,
    customer,
    therapists,
    bookings,
    activeTherapist,
    acceptBooking,
    declineBooking,
    cancelBooking,
    completeBooking,
    checkIn,
    unlockCheckIn,
  } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const booking = bookings.find((item) => item.id === id);

  if (!booking) {
    return (
      <Screen title="Visit" onBack={() => router.back()}>
        <Empty title="This visit is not on the books." body="It may have been cleared when the demo was reset." />
      </Screen>
    );
  }

  const treatment = getTreatment(booking.treatmentId);
  const therapist = therapists.find((item) => item.id === booking.therapistId) ?? null;
  const isTherapist = role === 'therapist' && booking.therapistId === activeTherapist?.id;
  const isCustomer = role === 'customer' && booking.customerId === customer.id;
  if (!isTherapist && !isCustomer) {
    return (
      <Screen title="Visit" onBack={() => router.back()}>
        <Empty title="This visit is for another account." />
      </Screen>
    );
  }

  const balance = booking.serviceTotal - booking.amountPaid;
  const run = async (pending: Promise<{ ok: boolean; message?: string }>) => {
    const result = await pending;
    setError(result.ok ? null : result.message ?? 'Something went wrong.');
    return result;
  };

  const footer = (
    <View style={{ gap: 10 }}>
      {error ? <Text style={{ color: palette.clay, lineHeight: 20 }}>{error}</Text> : null}
      {isTherapist && booking.status === 'assigned' ? (
        <>
          <Button label="Accept payment and confirm" onPress={() => void run(acceptBooking(booking.id))} />
          <Button
            label="Decline"
            variant="danger"
            onPress={() =>
              Alert.alert('Decline this visit?', 'The reservation is marked for refund.', [
                { text: 'Keep', style: 'cancel' },
                {
                  text: 'Decline',
                  style: 'destructive',
                  onPress: () => {
                    void run(declineBooking(booking.id));
                  },
                },
              ])
            }
          />
        </>
      ) : null}
      {isTherapist && booking.status === 'confirmed' ? (
        <>
          <Field
            label="Safety code from the customer"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 4))}
            placeholder="4-digit code"
            keyboardType="number-pad"
            maxLength={4}
          />
          <Button
            label="Check in"
            onPress={() => {
              void run(checkIn(booking.id, code)).then((result) => {
                if (result.ok) Alert.alert('Checked in', result.message ?? 'The safety code matched.');
              });
            }}
          />
          {booking.checkInLocked ? (
            <Button label="Unlock check-in" variant="secondary" onPress={() => unlockCheckIn(booking.id)} />
          ) : null}
        </>
      ) : null}
      {(isCustomer || isTherapist) && (booking.status === 'confirmed' || booking.status === 'in_session') ? (
        <Button
          label="Finished"
          onPress={() =>
            Alert.alert('Mark this session as finished?', 'Do this after the massage is done.', [
              { text: 'Not yet', style: 'cancel' },
              { text: 'Finished', onPress: () => void run(completeBooking(booking.id)) },
            ])
          }
        />
      ) : null}
      {isCustomer && (booking.status === 'assigned' || booking.status === 'confirmed') ? (
        <Button
          label="Cancel visit"
          variant="danger"
          onPress={() =>
            Alert.alert('Cancel this visit?', 'More than 3 hours ahead, the payment is refunded. Inside 3 hours, the reservation fee is kept.', [
              { text: 'Keep visit', style: 'cancel' },
              {
                text: 'Cancel visit',
                style: 'destructive',
                onPress: () => void run(cancelBooking(booking.id)),
              },
            ])
          }
        />
      ) : null}
    </View>
  );

  const showFooter =
    (isTherapist && (booking.status === 'assigned' || booking.status === 'confirmed' || booking.status === 'in_session')) ||
    (isCustomer && (booking.status === 'assigned' || booking.status === 'confirmed' || booking.status === 'in_session'));

  return (
    <Screen title={treatment?.name ?? 'Visit'} subtitle={`${formatDate(booking.date)} · ${formatTime(booking.time)}`} onBack={() => router.back()} footer={showFooter ? footer : undefined}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <StatusPill status={booking.status} />
        <Text style={{ color: palette.muted }}>{MODE_LABEL[booking.mode]}</Text>
      </View>
      <Kicker>Status</Kicker>
      <Timeline booking={booking} />
      {isCustomer && (booking.status === 'confirmed' || booking.status === 'in_session') ? (
        <>
          <Kicker>Safety code</Kicker>
          <Notice tone="info">Show this code to your therapist at the start of the session. They enter it to check you in.</Notice>
          <CheckInCode code={booking.checkInCode} />
        </>
      ) : null}
      {booking.status === 'in_session' ? <Notice tone="good">Checked in. Either of you can mark the session finished when the massage is done.</Notice> : null}
      <Card>
        <Line label={isTherapist ? 'Client' : 'Therapist'} value={isTherapist ? booking.customerName : therapist?.name ?? 'Assigned'} />
        <Line label="Length" value={formatDuration(booking.duration)} />
        <Line
          label="Where"
          value={`${booking.address}${booking.barangay ? `, ${booking.barangay}` : ''}, ${booking.city}`}
        />
        <Line label="Assignment" value={booking.assignedBy === 'auto' ? 'Best available match' : 'Chosen by the client'} />
        {booking.notes ? <Line label="Note" value={booking.notes} /> : null}
      </Card>
      {isTherapist && booking.status === 'confirmed' ? (
        <Notice tone="info">
          {`You net ${peso(therapistNet(booking.amountPaid))} after the ${PLATFORM_FEE_PERCENT}% Hilotcare fee.`}
        </Notice>
      ) : null}
      <Kicker>Receipt</Kicker>
      <Card>
        <Line label="Session" value={peso(booking.serviceTotal)} />
        <Line label="Reservation" value={peso(booking.reservationFee)} />
        <Line label="Paid" value={peso(booking.amountPaid)} strong />
        {booking.paymentStatus === 'reserved' ? <Line label="Balance" value={peso(balance)} /> : null}
        <Line label="Method" value={`${METHOD_LABEL[booking.payMethod]} ····${booking.payLast4}`} />
        <Line label="Reference" value={booking.paymentRef} />
        <Line label="Billing" value={PAYMENT_LABEL[booking.paymentStatus]} />
      </Card>
    </Screen>
  );
}
