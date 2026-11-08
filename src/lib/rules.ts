import { CITY_NAME, canonicalBarangay, getTreatment, isCoveredBarangay } from '@/data/catalog';
import { isFutureExpiry, isPastSlot, inThisWeek, weekdayIndex } from '@/lib/format';
import type { Booking, Clinic, PayMethod, ServiceMode, SessionStatus, Therapist, Treatment } from '@/types/domain';

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
  if (input.mode === 'home' && !isCoveredBarangay(input.city)) {
    return input.city ? `${input.city} is outside ${CITY_NAME}.` : 'Choose a barangay.';
  }
  if (input.mode === 'clinic' && input.city && !isCoveredBarangay(input.city)) {
    return `The clinic is outside ${CITY_NAME}.`;
  }
  if (input.mode === 'home' && !therapist.offersHome) return 'Home visits are turned off for this therapist.';
  if (input.mode === 'clinic' && !therapist.offersClinic) return 'This therapist is not at the clinic.';
  if (therapist.suspended) return 'This therapist is suspended.';
  if (therapist.verification !== 'verified') return 'This therapist is not approved yet.';
  if (!therapist.treatmentIds.includes(input.treatmentId)) return 'Does not offer this service.';
  const treatment = getTreatment(input.treatmentId);
  if (input.mode === 'home' && treatment?.offersHome === false) return 'This service is clinic only.';
  if (input.mode === 'clinic' && treatment?.offersClinic === false) return 'This service is home visits only.';
  if (input.mode === 'home' && therapist.travelZones.length > 0 && !therapist.travelZones.includes(input.city)) {
    return `Does not travel to ${input.city}.`;
  }
  if (input.date && input.time) {
    if (isPastSlot(input.date, input.time)) return 'That time has already passed.';
    const postsHours = Object.values(therapist.weeklySlots).some((slots) => slots.length > 0);
    if (postsHours && !(therapist.weeklySlots[String(weekdayIndex(input.date))] ?? []).includes(input.time)) {
      return 'Outside this therapist’s posted hours.';
    }
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

export function clinicReady(clinic: Clinic | null | undefined) {
  return Boolean(
    clinic && clinic.name.trim().length >= 2 && clinic.address.trim().length >= 8 && isCoveredBarangay(clinic.city),
  );
}

export function effectiveLocation(
  draft: { mode: ServiceMode; city: string; otherCity: string; address: string },
  clinic: Clinic | null,
) {
  if (draft.mode === 'clinic') {
    if (clinic && isCoveredBarangay(clinic.city)) {
      return { city: canonicalBarangay(clinic.city), address: clinic.address.trim() };
    }
    return { city: '', address: '' };
  }
  return {
    city: canonicalBarangay(draft.otherCity.trim() || draft.city),
    address: draft.address.trim(),
  };
}

export function validateArea(input: { mode: ServiceMode; city: string; address: string; clinic?: Clinic | null }) {
  if (input.mode === 'clinic') {
    if (!clinicReady(input.clinic)) {
      return 'Clinic visits use the clinic’s fixed address. A therapist adds that address once on their profile.';
    }
    return null;
  }
  const city = canonicalBarangay(input.city);
  if (!city) return 'Choose a barangay.';
  if (!isCoveredBarangay(city)) {
    return `${city} is outside ${CITY_NAME}. Hilotcare visits stay inside the city barangays.`;
  }
  if (input.address.trim().length < 8) {
    return 'Enter a street address so the therapist can travel to you.';
  }
  return null;
}

export function validatePayment(input: {
  payMethod: PayMethod;
  wallet: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
}): { ok: true; last4: string } | { ok: false; message: string } {
  if (input.payMethod === 'paypal') {
    const email = input.wallet.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, message: 'Enter the email address for your PayPal account.' };
    }
    return { ok: true, last4: email.split('@')[0].slice(-4) };
  }
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

const REPORT_STATUSES: SessionStatus[] = ['assigned', 'confirmed', 'in_session', 'completed', 'cancelled'];

export function buildReport(bookings: Booking[], therapistId: string, treatmentName: (id: string) => string) {
  const mine = bookings.filter((booking) => booking.therapistId === therapistId);
  const settled = mine.filter(
    (booking) => booking.status === 'confirmed' || booking.status === 'in_session' || booking.status === 'completed',
  );
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
