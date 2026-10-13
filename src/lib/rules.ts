import { CITY_NAME, canonicalBarangay, isCoveredBarangay } from '@/data/catalog';
import { isFutureExpiry, isPastSlot, inThisWeek, weekdayIndex } from '@/lib/format';
import type { Booking, PayMethod, ServiceMode, SessionStatus, Therapist, Treatment } from '@/types/domain';

export const PLATFORM_FEE_PERCENT = 12;
export const RESERVATION_PERCENT = 20;
export const MIN_RESERVATION = 50;
export const CANCEL_WINDOW_HOURS = 3;
export const MAX_CHECKIN_ATTEMPTS = 5;

export type SlotContext = {
  bookings: Booking[];
  treatmentId: string;
  mode: ServiceMode;
  city: string;
  date?: string | null;
  time?: string | null;
};

export function quote(hourlyRate: number, duration: number, fixedPrice?: number) {
  const serviceTotal = fixedPrice ?? Math.round((hourlyRate * duration) / 60);
  const reservationFee = Math.min(
    serviceTotal,
    Math.max(MIN_RESERVATION, Math.round((serviceTotal * RESERVATION_PERCENT) / 100)),
  );
  return {
    serviceTotal,
    reservationFee,
    balance: serviceTotal - reservationFee,
  };
}

export function quoted(treatment: Pick<Treatment, 'hourlyRate' | 'packagePrices'>, duration: number) {
  return quote(treatment.hourlyRate, duration, treatment.packagePrices[duration]);
}

export function platformFee(total: number) {
  return Math.round((total * PLATFORM_FEE_PERCENT) / 100);
}

export function therapistNet(total: number) {
  return total - platformFee(total);
}

export function slotTaken(bookings: Booking[], therapistId: string, date: string, time: string) {
  return bookings.some(
    (booking) =>
      booking.therapistId === therapistId &&
      booking.date === date &&
      booking.time === time &&
      booking.status !== 'cancelled',
  );
}

export function blockReason(therapist: Therapist, input: SlotContext) {
  if (therapist.verification !== 'verified') return 'License is not verified yet.';
  if (!therapist.treatmentIds.includes(input.treatmentId)) return 'Does not offer this treatment.';
  if (input.mode === 'home') {
    if (!therapist.offersHome) return 'Does not offer home visits.';
    if (!isCoveredBarangay(input.city)) return `Does not travel to ${input.city}, ${CITY_NAME}.`;
    if (!therapist.travelZones.includes(input.city)) {
      return therapist.travelZones.length === 0
        ? 'This therapist has not added travel barangays yet.'
        : `Does not travel to ${input.city}, ${CITY_NAME}.`;
    }
  } else if (!therapist.offersClinic || !therapist.clinic) {
    return 'Does not keep a clinic.';
  } else if (!isCoveredBarangay(therapist.clinic.city) || !therapist.clinic.name.trim() || therapist.clinic.address.trim().length < 4) {
    return 'This therapist has not finished their clinic details.';
  } else if (therapist.clinic.city !== input.city) {
    return `Clinic is in ${therapist.clinic.city}, ${CITY_NAME}.`;
  }
  if (input.date && input.time) {
    if (isPastSlot(input.date, input.time)) return 'That time has already passed.';
    const open = therapist.weeklySlots[String(weekdayIndex(input.date))] ?? [];
    if (!open.includes(input.time)) return 'Outside their posted hours.';
    if (slotTaken(input.bookings, therapist.id, input.date, input.time)) return 'Already booked at this time.';
  }
  return null;
}

export function eligibleTherapists(input: SlotContext & { therapists: Therapist[]; onlyId?: string | null }) {
  return input.therapists
    .filter((therapist) => !input.onlyId || therapist.id === input.onlyId)
    .filter((therapist) => blockReason(therapist, input) === null)
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
}

export function effectiveLocation(
  draft: { mode: ServiceMode; city: string; otherCity: string; address: string },
  therapist: Therapist | null,
) {
  if (draft.mode === 'clinic' && therapist?.clinic) {
    return { city: therapist.clinic.city, address: therapist.clinic.address };
  }
  return {
    city: canonicalBarangay(draft.otherCity.trim() || draft.city),
    address: draft.address.trim(),
  };
}

export function validateArea(input: {
  mode: ServiceMode;
  city: string;
  address: string;
  treatmentId: string;
  therapists: Therapist[];
  bookings: Booking[];
  onlyId?: string | null;
}) {
  const city = canonicalBarangay(input.city);
  if (!city) return 'Choose a barangay.';
  if (!isCoveredBarangay(city)) {
    return `${city} is outside ${CITY_NAME}. Hilotcare visits stay inside the city barangays.`;
  }
  if (input.mode === 'home' && input.address.trim().length < 8) {
    return 'Enter a street address so the therapist can travel to you.';
  }
  const matches = eligibleTherapists({
    therapists: input.therapists,
    bookings: input.bookings,
    treatmentId: input.treatmentId,
    mode: input.mode,
    city,
    onlyId: input.onlyId,
  });
  if (matches.length > 0) return null;
  if (input.onlyId) {
    const therapist = input.therapists.find((item) => item.id === input.onlyId);
    return therapist ? blockReason(therapist, { ...input, city }) ?? 'This therapist cannot take the visit.' : 'Choose a therapist.';
  }
  return input.mode === 'home'
    ? `No verified therapist covers home visits for this treatment in ${city}, ${CITY_NAME}.`
    : `No verified clinic offers this treatment in ${city}, ${CITY_NAME}.`;
}

export function validatePayment(input: {
  payMethod: PayMethod;
  wallet: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
}): { ok: true; last4: string } | { ok: false; message: string } {
  if (input.payMethod === 'card') {
    const digits = input.cardNumber.replace(/\D/g, '');
    if (!/^\d{16}$/.test(digits)) {
      return { ok: false, message: 'Enter a 16-digit card number. This demo does not charge a real card.' };
    }
    if (!isFutureExpiry(input.cardExpiry)) {
      return { ok: false, message: 'Enter a future expiry as MM/YY.' };
    }
    if (!/^\d{3}$/.test(input.cardCvc)) {
      return { ok: false, message: 'Enter the 3-digit security code.' };
    }
    return { ok: true, last4: digits.slice(-4) };
  }
  const mobile = input.wallet.replace(/\D/g, '');
  if (!/^09\d{9}$/.test(mobile)) {
    return { ok: false, message: 'Enter the 11-digit wallet number, starting with 09.' };
  }
  return { ok: true, last4: mobile.slice(-4) };
}

const REPORT_STATUSES: SessionStatus[] = ['assigned', 'confirmed', 'cancelled'];

export function buildReport(bookings: Booking[], therapistId: string, treatmentName: (id: string) => string) {
  const mine = bookings.filter((booking) => booking.therapistId === therapistId);
  const settled = mine.filter((booking) => booking.status === 'confirmed' || booking.status === 'completed');
  const week = settled.filter((booking) => inThisWeek(booking.date));
  const gross = (rows: Booking[]) => rows.reduce((sum, booking) => sum + booking.amountPaid, 0);
  const fee = (rows: Booking[]) => rows.reduce((sum, booking) => sum + platformFee(booking.amountPaid), 0);
  const byTreatmentMap = new Map<string, { name: string; count: number; gross: number }>();
  for (const booking of settled) {
    const current = byTreatmentMap.get(booking.treatmentId) ?? {
      name: treatmentName(booking.treatmentId),
      count: 0,
      gross: 0,
    };
    current.count += 1;
    current.gross += booking.amountPaid;
    byTreatmentMap.set(booking.treatmentId, current);
  }
  return {
    weekGross: gross(week),
    weekFee: fee(week),
    weekNet: gross(week) - fee(week),
    allGross: gross(settled),
    allFee: fee(settled),
    allNet: gross(settled) - fee(settled),
    completedCount: settled.length,
    upcoming: mine.filter((booking) => booking.status === 'assigned').length,
    keptFees: mine
      .filter((booking) => booking.paymentStatus === 'forfeited')
      .reduce((sum, booking) => sum + booking.amountPaid, 0),
    byTreatment: [...byTreatmentMap.values()].sort((a, b) => b.gross - a.gross),
    byStatus: REPORT_STATUSES.map((status) => ({
      status,
      count: mine.filter((booking) => booking.status === status).length,
    })),
    weekBookings: week,
  };
}
