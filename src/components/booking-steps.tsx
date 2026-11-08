import { useState } from 'react';
import { Text, View } from 'react-native';

import { TherapistRow, TreatmentCard } from '@/components/cards';
import { BarangaySelect, Button, Chip, Choice, Field, Line, Notice } from '@/components/ui';
import { palette } from '@/constants/theme';
import { CITY_NAME, MASTER_SLOTS, activeTreatments, getTreatment } from '@/data/catalog';
import { useApp } from '@/context/store';
import { formatDuration, formatTime, isPastSlot, peso, upcomingDates, weekdayIndex, WEEKDAYS } from '@/lib/format';
import { modeSummary } from '@/lib/labels';
import { blockReason, clinicReady, effectiveLocation, eligibleTherapists, quoted } from '@/lib/rules';
import type { PayDraft } from '@/types/domain';

export function BookingSteps({
  step,
  draft,
  onChange,
  onAdvance,
}: {
  step: number;
  draft: PayDraft;
  onChange: (patch: Partial<PayDraft>) => void;
  onAdvance?: (patch: Partial<PayDraft>) => void;
}) {
  const { therapists, bookings, clinic } = useApp();
  const [showTherapists, setShowTherapists] = useState(false);
  const treatment = draft.treatmentId ? getTreatment(draft.treatmentId) : null;
  const chosen = !draft.preferAuto && draft.therapistId ? therapists.find((item) => item.id === draft.therapistId) ?? null : null;
  const location = effectiveLocation(draft, clinic);
  const matchBase = {
    therapists,
    bookings,
    treatmentId: draft.treatmentId ?? '',
    mode: draft.mode,
    city: location.city,
    onlyId: chosen?.id ?? null,
  };

  if (step === 0) {
    return (
      <View style={{ gap: 10 }}>
        {activeTreatments().map((item) => (
            <TreatmentCard
              key={item.id}
              treatment={item}
              selected={draft.treatmentId === item.id}
              onPress={() => {
                const duration = item.durationOptions.length === 1 ? item.durationOptions[0] : null;
                const patch = { treatmentId: item.id, duration };
                if (onAdvance) onAdvance(patch);
                else onChange(patch);
              }}
            />
          ))}
      </View>
    );
  }

  if (step === 1 && treatment) {
    return (
      <View style={{ gap: 10 }}>
        {treatment.caution ? <Notice tone="warn">{treatment.caution}</Notice> : null}
        {treatment.durationOptions.map((minutes) => {
          const price = quoted(treatment, minutes);
          const selected = draft.duration === minutes;
          return (
            <Choice
              key={minutes}
              label={formatDuration(minutes)}
              detail={peso(price.serviceTotal)}
              selected={selected}
              onPress={() => {
                const patch = { duration: minutes };
                if (onAdvance) onAdvance(patch);
                else onChange(patch);
              }}
            />
          );
        })}
      </View>
    );
  }

  if (step === 2) {
    return (
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Choice label="Home" detail="They travel to you" selected={draft.mode === 'home'} onPress={() => onChange({ mode: 'home' })} />
          <Choice label="Clinic" detail="You go to the clinic" selected={draft.mode === 'clinic'} onPress={() => onChange({ mode: 'clinic' })} />
        </View>
        {chosen ? (
          <Notice tone="info">
            {`Booking with ${chosen.name}. ${modeSummary(chosen)}. Home visits cover every barangay of ${CITY_NAME}.`}
          </Notice>
        ) : null}
        {draft.mode === 'clinic' ? (
          clinicReady(clinic) ? (
            <Notice tone="good">{`You will go to ${clinic.name}, ${clinic.address}, ${clinic.city}, ${CITY_NAME}.`}</Notice>
          ) : (
            <Notice tone="warn">
              Clinic visits use one fixed address. A therapist adds it once on their profile, and you do not pick a barangay.
            </Notice>
          )
        ) : (
          <View style={{ gap: 10 }}>
            <BarangaySelect value={draft.city} onChange={(city) => onChange({ city, otherCity: '' })} />
            <Field label="City" value={CITY_NAME} onChangeText={() => undefined} editable={false} />
            <Field
              label="Street address"
              value={draft.address}
              onChangeText={(address) => onChange({ address })}
              placeholder="House number and street"
            />
          </View>
        )}
        <Text style={{ color: palette.muted }}>The next open time is selected. Tap another day or time if you want a different one.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {upcomingDates(7).map((iso) => {
            const day = Number(iso.slice(8));
            return (
              <Chip
                key={iso}
                label={`${WEEKDAYS[weekdayIndex(iso)]} ${day}`}
                selected={draft.date === iso}
                onPress={() => onChange({ date: iso, time: null })}
              />
            );
          })}
        </View>
        <Button
          label="Use the next open time"
          variant="secondary"
          onPress={() => {
            for (const date of upcomingDates(7)) {
              for (const time of MASTER_SLOTS) {
                if (isPastSlot(date, time)) continue;
                if (eligibleTherapists({ ...matchBase, date, time }).length > 0) {
                  onChange({ date, time });
                  return;
                }
              }
            }
          }}
        />
        {therapists.length === 0 ? (
          <Notice tone="warn">Create a therapist account on this phone first. A time can be booked after that account exists.</Notice>
        ) : null}
        {draft.date ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MASTER_SLOTS.map((time) => {
              const selectedDate = draft.date ?? '';
              const past = isPastSlot(selectedDate, time);
              const open = therapists.length > 0 && !past && eligibleTherapists({ ...matchBase, date: selectedDate, time }).length > 0;
              const label = past
                ? `${formatTime(time)} · passed`
                : therapists.length === 0
                  ? formatTime(time)
                  : open
                    ? formatTime(time)
                    : `${formatTime(time)} · full`;
              return (
                <Chip
                  key={time}
                  label={label}
                  selected={draft.time === time}
                  onPress={() => {
                    if (open) onChange({ time });
                  }}
                />
              );
            })}
          </View>
        ) : null}
      </View>
    );
  }

  if (step === 3 && treatment && draft.duration) {
    const prices = quoted(treatment, draft.duration);
    const assignee = draft.preferAuto
      ? eligibleTherapists({ ...matchBase, date: draft.date, time: draft.time })[0]
      : chosen;
    return (
      <View style={{ gap: 14 }}>
        <View style={{ gap: 8 }}>
          <Line label={treatment.name} value={formatDuration(draft.duration)} />
          <Line
            label={draft.mode === 'home' ? 'Home visit' : 'Clinic'}
            value={
              draft.mode === 'clinic' && clinic.name.trim()
                ? `${clinic.name}, ${clinic.address}, ${location.city}`
                : `${location.city}, ${CITY_NAME}`
            }
          />
          <Line label="Pay now" value={peso(prices.serviceTotal)} strong />
          <Text style={{ color: palette.muted, lineHeight: 20 }}>
            The full session price is charged now. Cancel more than 3 hours ahead for a refund. Inside 3 hours, a reservation fee is kept.
          </Text>
          {assignee ? (
            <Text style={{ color: palette.ink }}>{draft.preferAuto ? `${assignee.name} will take this visit.` : `You chose ${assignee.name}.`}</Text>
          ) : (
            <Text style={{ color: palette.muted }}>A therapist is assigned when you pay.</Text>
          )}
          <Text onPress={() => setShowTherapists((open) => !open)} style={{ color: palette.palm, fontWeight: '700' }}>
            {showTherapists ? 'Hide therapists' : 'Change therapist'}
          </Text>
          {showTherapists
            ? therapists.filter((therapist) => therapist.treatmentIds.includes(treatment.id)).map((therapist) => {
                const reason =
                  draft.date && draft.time
                    ? blockReason(therapist, {
                        bookings,
                        treatmentId: treatment.id,
                        mode: draft.mode,
                        city: location.city,
                        date: draft.date,
                        time: draft.time,
                      })
                    : 'Choose a time first.';
                return (
                  <TherapistRow
                    key={therapist.id}
                    therapist={therapist}
                    selected={!draft.preferAuto && draft.therapistId === therapist.id}
                    detail={reason ?? 'Free at this time'}
                    onPress={
                      reason
                        ? undefined
                        : () => {
                            onChange({ therapistId: therapist.id, preferAuto: false });
                            setShowTherapists(false);
                          }
                    }
                  />
                );
              })
            : null}
          {showTherapists && therapists.every((therapist) => !therapist.treatmentIds.includes(treatment.id)) ? (
            <Notice tone="warn">No therapist offers this service yet. They can turn it on from their profile.</Notice>
          ) : null}
        </View>
        <Field
          label="PayPal email"
          value={draft.wallet}
          onChangeText={(wallet) => onChange({ wallet: wallet.trim(), payMethod: 'paypal' })}
          placeholder="name@email.com"
          keyboardType="email-address"
        />
        <Field
          label="Note for the therapist"
          value={draft.notes}
          onChangeText={(notes) => onChange({ notes })}
          placeholder="Pressure, pregnancy, injuries, or a gate code"
          multiline
          maxLength={180}
        />
        <Notice tone="warn">Pay opens the PayPal sandbox. Sign in with the Personal sandbox account from the PayPal developer site. No real money is charged.</Notice>
      </View>
    );
  }

  return <Notice tone="info">Go back and finish the earlier steps.</Notice>;
}
