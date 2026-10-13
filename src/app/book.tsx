import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

import { BookingSteps } from '@/components/booking-steps';
import { Button, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useApp } from '@/context/store';
import { getTreatment } from '@/data/catalog';
import { isPastSlot, peso } from '@/lib/format';
import { param, replace } from '@/lib/nav';
import { blockReason, effectiveLocation, eligibleTherapists, quoted, validateArea, validatePayment } from '@/lib/rules';
import type { PayDraft } from '@/types/domain';

const STEPS = [
  { title: 'Services', detail: 'What service do you need?' },
  { title: 'Service Duration', detail: 'Choose how long the session should last.' },
  { title: 'Where should we come?', detail: 'Pick your barangay and street in Iligan City.' },
  { title: 'Schedule Appointment', detail: 'Select your preferred date and time.' },
  { title: 'Available Therapist', detail: 'Select your preferred verified therapist.' },
  { title: 'Reservation Payment', detail: 'Pay the reservation fee to confirm your booking.' },
] as const;

export default function BookScreen() {
  const params = useLocalSearchParams<{ treatmentId?: string; therapistId?: string }>();
  const { customer, therapists, bookings, createBooking } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(() => {
    const treatment = getTreatment(param(params.treatmentId) ?? '');
    if (!treatment) return 0;
    return treatment.durationOptions.length === 1 ? 2 : 1;
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<PayDraft>(() => {
    const treatmentId = param(params.treatmentId);
    const treatment = treatmentId ? getTreatment(treatmentId) : null;
    const therapistId = param(params.therapistId);
    return {
      treatmentId: treatment ? treatment.id : null,
      duration: treatment?.durationOptions.length === 1 ? treatment.durationOptions[0] : null,
      mode: 'home',
      city: customer.city,
      otherCity: '',
      address: customer.address,
      date: null,
      time: null,
      therapistId: therapistId && therapists.some((therapist) => therapist.id === therapistId) ? therapistId : null,
      preferAuto: !(therapistId && therapists.some((therapist) => therapist.id === therapistId)),
      notes: '',
      payMethod: 'gcash',
      payFull: false,
      wallet: customer.mobile,
      cardNumber: '',
      cardExpiry: '',
      cardCvc: '',
    };
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
      }
      const affectsSchedule = ['city', 'otherCity', 'mode', 'treatmentId'] as const;
      if (affectsSchedule.some((key) => key in partial) && !('date' in partial) && !('time' in partial)) {
        next.date = null;
        next.time = null;
      }
      return next;
    });
    setError(null);
  };

  const chosen = !draft.preferAuto && draft.therapistId ? therapists.find((therapist) => therapist.id === draft.therapistId) ?? null : null;
  const location = effectiveLocation(draft, draft.mode === 'clinic' ? chosen : null);

  const validate = (index: number) => {
    if (index === 0) return draft.treatmentId ? null : 'Choose a treatment.';
    if (index === 1) return draft.duration ? null : 'Choose a duration.';
    if (!draft.treatmentId) return 'Choose a treatment first.';
    if (index === 2) {
      return validateArea({
        mode: draft.mode,
        city: location.city,
        address: location.address,
        treatmentId: draft.treatmentId,
        therapists,
        bookings,
        onlyId: chosen?.id ?? null,
      });
    }
    if (index === 3) {
      if (!draft.date || !draft.time) return 'Choose a day and a start time.';
      if (isPastSlot(draft.date, draft.time)) return 'That time has already passed.';
      const matches = eligibleTherapists({
        therapists,
        bookings,
        treatmentId: draft.treatmentId,
        mode: draft.mode,
        city: location.city,
        date: draft.date,
        time: draft.time,
        onlyId: chosen?.id ?? null,
      });
      return matches.length ? null : 'Nobody is free for that time in this area.';
    }
    if (index === 4) {
      const context = {
        bookings,
        treatmentId: draft.treatmentId,
        mode: draft.mode,
        city: location.city,
        date: draft.date,
        time: draft.time,
      };
      if (draft.preferAuto) {
        return eligibleTherapists({ therapists, ...context }).length
          ? null
          : 'No verified therapist is free. Change the time or the barangay.';
      }
      if (!chosen) return 'Choose a therapist or assign the best match.';
      return blockReason(chosen, context);
    }
    return null;
  };

  const submit = () => {
    if (!draft.treatmentId || !draft.duration || !draft.date || !draft.time) {
      const message = 'Finish the booking details first.';
      setError(message);
      Alert.alert('Check the form', message);
      return;
    }
    const payment = validatePayment(draft);
    if (!payment.ok) {
      setError(payment.message);
      Alert.alert('Check the form', payment.message);
      return;
    }
    setSubmitting(true);
    const result = createBooking({
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
      payMethod: draft.payMethod,
      payFull: draft.payFull,
      wallet: draft.wallet,
      cardNumber: draft.cardNumber,
      cardExpiry: draft.cardExpiry,
      cardCvc: draft.cardCvc,
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
  const due = prices ? (draft.payFull || prices.balance === 0 ? prices.serviceTotal : prices.reservationFee) : 0;

  return (
    <Screen
      title={STEPS[step].title}
      subtitle={`${STEPS[step].detail} · ${step + 1} of ${STEPS.length}`}
      onBack={() => {
        if (step === 0) router.back();
        else setStep((current) => current - 1);
      }}
      avoidKeyboard
      scrollRef={scrollRef}
      footer={
        <>
          {error ? <Text style={{ color: palette.clay, lineHeight: 20 }}>{error}</Text> : null}
          <Button
            label={step < 5 ? 'Continue' : submitting ? 'Processing…' : `Pay ${peso(due)}`}
            disabled={submitting}
            onPress={() => {
              if (step < 5) {
                const message = validate(step);
                if (message) {
                  setError(message);
                  Alert.alert('Check the form', message);
                  return;
                }
                setStep((current) => current + 1);
                return;
              }
              submit();
            }}
          />
        </>
      }>
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
