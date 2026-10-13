import { Text, View } from 'react-native';

import { TherapistRow, TreatmentCard } from '@/components/cards';
import { BarangaySelect, Button, Chip, Choice, Field, Line, Notice } from '@/components/ui';
import { palette } from '@/constants/theme';
import { CITY_NAME, MASTER_SLOTS, TREATMENTS, getTreatment } from '@/data/catalog';
import { useApp } from '@/context/store';
import { formatDuration, formatTime, isPastSlot, peso, upcomingDates, weekdayIndex, WEEKDAYS } from '@/lib/format';
import { METHOD_LABEL, modeSummary, zoneSummary } from '@/lib/labels';
import {
  MIN_RESERVATION,
  RESERVATION_PERCENT,
  blockReason,
  effectiveLocation,
  eligibleTherapists,
  quoted,
} from '@/lib/rules';
import type { PayDraft, PayMethod } from '@/types/domain';

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
  const { therapists, bookings } = useApp();
  const treatment = draft.treatmentId ? getTreatment(draft.treatmentId) : null;
  const chosen = !draft.preferAuto && draft.therapistId ? therapists.find((item) => item.id === draft.therapistId) ?? null : null;
  const location = effectiveLocation(draft, draft.mode === 'clinic' ? chosen : null);
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
        {TREATMENTS.map((item) => (
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
    const clinicLocked = draft.mode === 'clinic' && chosen?.clinic;
    return (
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Choice label="Home" detail="They travel to you" selected={draft.mode === 'home'} onPress={() => onChange({ mode: 'home' })} />
          <Choice label="Clinic" detail="You go to them" selected={draft.mode === 'clinic'} onPress={() => onChange({ mode: 'clinic' })} />
        </View>
        {chosen ? (
          <Notice tone="info">
            {`Booking with ${chosen.name}. ${modeSummary(chosen)}. ${chosen.offersHome ? `Travels to ${zoneSummary(chosen.travelZones)}.` : ''}`}
          </Notice>
        ) : null}
        {clinicLocked && chosen.clinic ? (
          <Notice tone="good">{`This visit is at ${chosen.clinic.name}, ${chosen.clinic.address}, ${chosen.clinic.city}, ${CITY_NAME}.`}</Notice>
        ) : (
          <View style={{ gap: 10 }}>
            <BarangaySelect value={draft.city} onChange={(city) => onChange({ city, otherCity: '' })} />
            <Field label="City" value={CITY_NAME} onChangeText={() => undefined} editable={false} />
          </View>
        )}
        {draft.mode === 'home' ? (
          <Field
            label="Street address"
            value={draft.address}
            onChangeText={(address) => onChange({ address })}
            placeholder="House number and street"
          />
        ) : null}
        {!clinicLocked && draft.mode === 'clinic' ? (
          <Notice tone="info">The clinic address appears once a therapist is assigned.</Notice>
        ) : null}
      </View>
    );
  }

  if (step === 3 && treatment) {
    return (
      <View style={{ gap: 14 }}>
        {chosen ? (
          <Text
            onPress={() => onChange({ preferAuto: true, therapistId: null })}
            style={{ color: palette.palm, fontWeight: '700' }}>
            {`Times for ${chosen.name}. See everyone who is free instead.`}
          </Text>
        ) : (
          <Text style={{ color: palette.muted }}>Showing times when at least one verified therapist is free.</Text>
        )}
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
        {draft.date ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MASTER_SLOTS.map((time) => {
              const open = eligibleTherapists({ ...matchBase, date: draft.date, time }).length > 0;
              return (
                <Chip
                  key={time}
                  label={open ? formatTime(time) : `${formatTime(time)} · full`}
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

  if (step === 4 && treatment && draft.date && draft.time) {
    const offering = therapists.filter((therapist) => therapist.treatmentIds.includes(treatment.id));
    const ranked = offering
      .map((therapist) => ({
        therapist,
        reason: blockReason(therapist, {
          bookings,
          treatmentId: treatment.id,
          mode: draft.mode,
          city: location.city,
          date: draft.date,
          time: draft.time,
        }),
      }))
      .sort((a, b) => {
        if (!a.reason && b.reason) return -1;
        if (a.reason && !b.reason) return 1;
        return b.therapist.rating - a.therapist.rating;
      });
    const freeCount = ranked.filter((item) => !item.reason).length;
    return (
      <View style={{ gap: 10 }}>
        <Choice
          label="Best available match"
          detail={freeCount > 0 ? `${freeCount} verified ${freeCount === 1 ? 'therapist is' : 'therapists are'} free.` : 'No verified therapist is free at this time.'}
          selected={draft.preferAuto}
          onPress={() => onChange({ preferAuto: true })}
        />
        {ranked.map(({ therapist, reason }) => (
          <TherapistRow
            key={therapist.id}
            therapist={therapist}
            selected={!draft.preferAuto && draft.therapistId === therapist.id}
            detail={reason ?? `${modeSummary(therapist)} · ${zoneSummary(therapist.travelZones)}`}
            onPress={reason ? undefined : () => onChange({ therapistId: therapist.id, preferAuto: false })}
          />
        ))}
      </View>
    );
  }

  if (step === 5 && treatment && draft.duration) {
    const prices = quoted(treatment, draft.duration);
    const due = draft.payFull || prices.balance === 0 ? prices.serviceTotal : prices.reservationFee;
    const assignee = draft.preferAuto
      ? eligibleTherapists({ ...matchBase, date: draft.date, time: draft.time })[0]
      : chosen;
    return (
      <View style={{ gap: 14 }}>
        <View style={{ gap: 8 }}>
          <Line label={treatment.name} value={formatDuration(draft.duration)} />
          <Line label={draft.mode === 'home' ? 'Home visit' : 'Clinic'} value={`${location.city}, ${CITY_NAME}`} />
          <Line label="Session price" value={peso(prices.serviceTotal)} strong />
          <Line label="Due now" value={peso(due)} strong />
          {prices.balance > 0 && !draft.payFull ? <Line label="Balance after the session" value={peso(prices.balance)} /> : null}
          <Text style={{ color: palette.muted, lineHeight: 20 }}>
            {`The reservation is ${RESERVATION_PERCENT}% or ${peso(MIN_RESERVATION)}, whichever is higher. Cancel more than 3 hours ahead for a refund. Inside 3 hours, the reservation fee is kept.`}
          </Text>
          {assignee ? <Text style={{ color: palette.ink }}>{draft.preferAuto ? `Hilotcare will assign ${assignee.name}.` : `You chose ${assignee.name}.`}</Text> : null}
        </View>
        {prices.balance > 0 ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Choice label="Reservation" detail={peso(prices.reservationFee)} selected={!draft.payFull} onPress={() => onChange({ payFull: false })} />
            <Choice label="Pay in full" detail={peso(prices.serviceTotal)} selected={draft.payFull} onPress={() => onChange({ payFull: true })} />
          </View>
        ) : (
          <Notice tone="info">The reservation covers the whole session.</Notice>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['gcash', 'maya', 'card'] as PayMethod[]).map((method) => (
            <Chip key={method} label={METHOD_LABEL[method]} selected={draft.payMethod === method} onPress={() => onChange({ payMethod: method })} />
          ))}
        </View>
        {draft.payMethod === 'card' ? (
          <View style={{ gap: 10 }}>
            <Field
              label="Card number"
              value={draft.cardNumber}
              onChangeText={(cardNumber) => onChange({ cardNumber: cardNumber.replace(/[^\d ]/g, '').slice(0, 19) })}
              placeholder="16-digit number"
              keyboardType="number-pad"
            />
            <Field
              label="Expiry"
              value={draft.cardExpiry}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '').slice(0, 4);
                onChange({ cardExpiry: digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits });
              }}
              placeholder="MM/YY"
              keyboardType="number-pad"
            />
            <Field
              label="Security code"
              value={draft.cardCvc}
              onChangeText={(cardCvc) => onChange({ cardCvc: cardCvc.replace(/\D/g, '').slice(0, 3) })}
              placeholder="123"
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        ) : (
          <Field
            label={`${METHOD_LABEL[draft.payMethod]} number`}
            value={draft.wallet}
            onChangeText={(wallet) => onChange({ wallet: wallet.replace(/\D/g, '').slice(0, 11) })}
            placeholder="09XXXXXXXXX"
            keyboardType="phone-pad"
          />
        )}
        <Field
          label="Note for the therapist"
          value={draft.notes}
          onChangeText={(notes) => onChange({ notes })}
          placeholder="Pressure, pregnancy, injuries, or a gate code"
          multiline
          maxLength={180}
        />
        <Notice tone="warn">Demo checkout. Use any future card or an 09 mobile number. Nothing is sent to a bank.</Notice>
      </View>
    );
  }

  return <Notice tone="info">Go back and finish the earlier steps.</Notice>;
}
