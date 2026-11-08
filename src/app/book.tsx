import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Text, type ScrollViewInstance } from 'react-native';

import { BookingSteps } from '@/components/booking-steps';
import { PaypalCheckout } from '@/components/paypal-checkout';
import { Button, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useApp } from '@/context/store';
import { MASTER_SLOTS, getTreatment } from '@/data/catalog';
import { isPastSlot, peso, upcomingDates } from '@/lib/format';
import { param, replace } from '@/lib/nav';
import { effectiveLocation, eligibleTherapists, quoted, validateArea, validatePayment } from '@/lib/rules';
import type { PayDraft } from '@/types/domain';

const STEPS = [
  { title: 'Services', detail: 'What service do you need?' },
  { title: 'How long?', detail: 'Choose the session length.' },
  { title: 'Place and time', detail: 'Where the session happens, and when.' },
  { title: 'Pay', detail: 'Pay the full session price to send the booking.' },
] as const;

export default function BookScreen() {
  const params = useLocalSearchParams<{ treatmentId?: string; therapistId?: string }>();
  const { customer, therapists, bookings, clinic, createBooking } = useApp();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [step, setStep] = useState(() => {
    const treatment = getTreatment(param(params.treatmentId) ?? '');
    if (!treatment) return 0;
    return treatment.durationOptions.length === 1 ? 2 : 1;
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paypalOpen, setPaypalOpen] = useState(false);
  const fillTime = (next: PayDraft) => {
    if (!next.treatmentId) return next;
    const therapist = !next.preferAuto && next.therapistId ? therapists.find((item) => item.id === next.therapistId) ?? null : null;
    const city = effectiveLocation(next, clinic).city;
    if (!city) return next;
    if (next.date && next.time && !isPastSlot(next.date, next.time)) return next;
    const dates = next.date ? [next.date] : upcomingDates(7);
    for (const date of dates) {
      for (const time of MASTER_SLOTS) {
        if (isPastSlot(date, time)) continue;
        const matches = eligibleTherapists({
          therapists,
          bookings,
          treatmentId: next.treatmentId,
          mode: next.mode,
          city,
          date,
          time,
          onlyId: therapist?.id ?? null,
        });
        if (matches.length > 0) return { ...next, date, time };
      }
    }
    return next;
  };
  const [draft, setDraft] = useState<PayDraft>(() => {
    const treatmentId = param(params.treatmentId);
    const treatment = treatmentId ? getTreatment(treatmentId) : null;
    const therapistId = param(params.therapistId);
    return fillTime({
      treatmentId: treatment ? treatment.id : null,
      duration: treatment?.durationOptions.length === 1 ? treatment.durationOptions[0] : null,
      mode: 'home',
      city: customer.barangay,
      otherCity: '',
      address: customer.address,
      date: null,
      time: null,
      therapistId: therapistId && therapists.some((therapist) => therapist.id === therapistId) ? therapistId : null,
      preferAuto: !(therapistId && therapists.some((therapist) => therapist.id === therapistId)),
      notes: '',
      payMethod: 'paypal',
      payFull: true,
      wallet: customer.email,
      cardNumber: '',
      cardExpiry: '',
      cardCvc: '',
    });
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const patch = (partial: Partial<PayDraft>) => {
    setDraft((current) => {
      const next = { ...current, ...partial };
      if (partial.treatmentId && partial.treatmentId !== current.treatmentId) {
        const treatment = getTreatment(partial.treatmentId);
        next.duration = treatment?.durationOptions.includes(next.duration ?? -1) ? next.duration : null;
        const chosenTherapist = therapists.find((therapist) => therapist.id === current.therapistId);
        if (chosenTherapist && !chosenTherapist.treatmentIds.includes(partial.treatmentId)) {
          next.therapistId = null;
          next.preferAuto = true;
        }
      }
      const affectsSchedule = ['city', 'otherCity', 'mode', 'treatmentId'] as const;
      if (affectsSchedule.some((key) => key in partial) && !('date' in partial) && !('time' in partial)) {
        next.date = null;
        next.time = null;
      }
      return fillTime(next);
    });
    setError(null);
  };

  const chosen = !draft.preferAuto && draft.therapistId ? therapists.find((therapist) => therapist.id === draft.therapistId) ?? null : null;
  const location = effectiveLocation(draft, clinic);

  const validate = (index: number) => {
    if (index === 0) return draft.treatmentId ? null : 'Choose a treatment.';
    if (index === 1) return draft.duration ? null : 'Choose a duration.';
    if (!draft.treatmentId) return 'Choose a treatment first.';
    const treatmentId = draft.treatmentId;
    if (index === 2) {
      const area = validateArea({
        mode: draft.mode,
        city: location.city,
        address: location.address,
        clinic,
      });
      if (area) return area;
      if (!draft.date || !draft.time) return 'Choose a day and a start time.';
      if (isPastSlot(draft.date, draft.time)) return 'That time has already passed.';
      const matches = eligibleTherapists({
        therapists,
        bookings,
        treatmentId,
        mode: draft.mode,
        city: location.city,
        date: draft.date,
        time: draft.time,
        onlyId: chosen?.id ?? null,
      });
      if (matches.length) return null;
      const offers = therapists.some((therapist) => therapist.treatmentIds.includes(treatmentId));
      return offers
        ? 'That time has passed or is already booked. Pick another time.'
        : 'No therapist offers this service yet. They can turn it on from their profile.';
    }
    return null;
  };

  const submit = async (paypal?: { orderId: string; email: string }) => {
    if (!draft.treatmentId || !draft.duration || !draft.date || !draft.time) {
      const message = 'Finish the booking details first.';
      setError(message);
      Alert.alert('Check the form', message);
      return;
    }
    const candidates = [paypal?.email ?? '', draft.wallet, customer.email];
    const wallet =
      candidates.map((value) => value.trim()).find((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) ??
      'buyer@sandbox.paypal.com';
    const payment = validatePayment({ ...draft, wallet, payMethod: 'paypal' });
    if (!payment.ok) {
      setError(payment.message);
      Alert.alert('Check the form', payment.message);
      return;
    }
    setSubmitting(true);
    const result = await createBooking({
      treatmentId: draft.treatmentId,
      duration: draft.duration,
      mode: draft.mode,
      city: location.city,
      address: location.address,
      date: draft.date,
      time: draft.time,
      therapistId: draft.therapistId,
      preferAuto: draft.preferAuto,
      notes: draft.notes,
      payMethod: 'paypal',
      payFull: true,
      wallet,
      cardNumber: draft.cardNumber,
      cardExpiry: draft.cardExpiry,
      cardCvc: draft.cardCvc,
      paypalOrderId: paypal?.orderId,
    });
    if (!result.ok) {
      setSubmitting(false);
      setError(result.message);
      Alert.alert('Payment not recorded', result.message);
      return;
    }
    replace(`/booking/${result.booking.id}`);
  };

  const treatment = draft.treatmentId ? getTreatment(draft.treatmentId) : null;
  const prices = treatment && draft.duration ? quoted(treatment, draft.duration) : null;
  const due = prices ? prices.serviceTotal : 0;

  return (
    <Screen
      title={STEPS[step].title}
      subtitle={
        step === 2 && draft.mode === 'clinic'
          ? 'Clinic visits use the clinic address. Pick a time.'
          : STEPS[step].detail
      }
      onBack={() => {
        if (step === 0 || (step === 2 && treatment?.durationOptions.length === 1 && params.treatmentId)) {
          router.back();
          return;
        }
        if (step === 2 && treatment?.durationOptions.length === 1) {
          setStep(0);
          return;
        }
        if (step === 3) {
          setStep(2);
          return;
        }
        setStep((current) => current - 1);
      }}
      avoidKeyboard
      scrollRef={scrollRef}
      footer={
        <>
          {error ? <Text style={{ color: palette.clay, lineHeight: 20 }}>{error}</Text> : null}
          <Button
            label={step < 3 ? 'Continue' : submitting ? 'Processing…' : `Pay ${peso(due)}`}
            disabled={submitting}
            onPress={() => {
              if (step < 3) {
                const message = validate(step);
                if (message) {
                  setError(message);
                  Alert.alert('Check the form', message);
                  return;
                }
                setStep((current) => current + 1);
                return;
              }
              setPaypalOpen(true);
            }}
          />
        </>
      }>
      <PaypalCheckout
        visible={paypalOpen}
        amount={due}
        onClose={() => setPaypalOpen(false)}
        onApproved={(approval) => {
          setPaypalOpen(false);
          submit(approval);
        }}
        onError={(message) => {
          setPaypalOpen(false);
          setError(message);
          Alert.alert('PayPal', message);
        }}
      />
      <BookingSteps
        step={step}
        draft={draft}
        onChange={patch}
        onAdvance={(partial) => {
          patch(partial);
          if (partial.treatmentId) setStep(partial.duration ? 2 : 1);
          else if (partial.duration) setStep(2);
        }}
      />
    </Screen>
  );
}
