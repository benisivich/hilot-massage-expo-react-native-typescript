import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { StatusPill, Timeline, VerifyPill } from '@/components/status';
import { Button, Card, Empty, Kicker, Line, Notice, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { CITY_NAME, getTreatment } from '@/data/catalog';
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
  } = useApp();
  const [error, setError] = useState<string | null>(null);
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
  const run = (result: { ok: boolean; message?: string }) => {
    setError(result.ok ? null : result.message ?? 'Something went wrong.');
  };

  const footer = (
    <View style={{ gap: 10 }}>
      {error ? <Text style={{ color: palette.clay, lineHeight: 20 }}>{error}</Text> : null}
      {isTherapist && booking.status === 'assigned' ? (
        <>
          <Button label="Accept payment and confirm" onPress={() => run(acceptBooking(booking.id))} />
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
                    const result = declineBooking(booking.id);
                    run(result);
                  },
                },
              ])
            }
          />
        </>
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
                onPress: () => run(cancelBooking(booking.id)),
              },
            ])
          }
        />
      ) : null}
    </View>
  );

  const showFooter =
    (isTherapist && booking.status === 'assigned') ||
    (isCustomer && (booking.status === 'assigned' || booking.status === 'confirmed'));

  return (
    <Screen title={treatment?.name ?? 'Visit'} subtitle={`${formatDate(booking.date)} · ${formatTime(booking.time)}`} onBack={() => router.back()} footer={showFooter ? footer : undefined}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <StatusPill status={booking.status} />
        <Text style={{ color: palette.muted }}>{MODE_LABEL[booking.mode]}</Text>
      </View>
      <Kicker>Status</Kicker>
      <Timeline booking={booking} />
      <Card>
        <Line label={isTherapist ? 'Client' : 'Therapist'} value={isTherapist ? booking.customerName : therapist?.name ?? 'Assigned'} />
        <Line label="Length" value={formatDuration(booking.duration)} />
        <Line label="Where" value={`${booking.address}, ${booking.city}, ${CITY_NAME}`} />
        <Line label="Assignment" value={booking.assignedBy === 'auto' ? 'Best available match' : 'Chosen by the client'} />
        {booking.notes ? <Line label="Note" value={booking.notes} /> : null}
      </Card>
      {therapist && isCustomer ? (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ color: palette.ink, fontWeight: '700', flex: 1 }}>{therapist.licenseNumber}</Text>
            <VerifyPill status={therapist.verification} />
          </View>
          <Text style={{ color: palette.muted }}>{therapist.issuingBody}</Text>
        </Card>
      ) : null}
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
