import { activeTreatments } from '@/data/catalog';
import type { PaymentStatus, PayMethod, ServiceMode, SessionStatus, Therapist, TreatmentCategory } from '@/types/domain';

export const STATUS_LABEL: Record<SessionStatus, string> = {
  assigned: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  en_route: 'On the way',
  arrived: 'Arrived',
  in_session: 'Checked in',
  completed: 'Finished',
  cancelled: 'Cancelled',
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  reserved: 'Balance due',
  paid: 'Paid in full',
  refunded: 'Refunded',
  forfeited: 'Reservation kept',
};

export const METHOD_LABEL: Record<PayMethod, string> = {
  paypal: 'PayPal',
  gcash: 'GCash',
  maya: 'Maya',
  card: 'Card',
};

export const MODE_LABEL: Record<ServiceMode, string> = {
  home: 'Home visit',
  clinic: 'Clinic',
};

export const CATEGORY_LABEL: Record<TreatmentCategory, string> = {
  hilot: 'Hilot',
  massage: 'Massage',
  combo: 'Combination',
};

export function ratingLabel(therapist: Therapist) {
  if (therapist.reviewCount === 0) return 'New';
  return `${therapist.rating.toFixed(1)} · ${therapist.reviewCount} reviews`;
}

export function zoneSummary(zones: string[]) {
  if (zones.length === 0) return 'No travel zone yet';
  if (zones.length <= 2) return zones.join(', ');
  return `${zones.slice(0, 2).join(', ')} +${zones.length - 2}`;
}

export function serviceSummary(therapist: Pick<Therapist, 'treatmentIds'>) {
  const catalog = activeTreatments();
  const names = catalog.filter((treatment) => therapist.treatmentIds.includes(treatment.id)).map((treatment) => treatment.name);
  if (names.length === 0) return 'No services selected';
  if (names.length === catalog.length) return 'Every treatment';
  return names.join(', ');
}

export function modeSummary(therapist: Pick<Therapist, 'offersHome' | 'offersClinic'>) {
  if (therapist.offersHome && therapist.offersClinic) return 'Home and clinic';
  if (therapist.offersHome) return 'Home visits';
  if (therapist.offersClinic) return 'Clinic only';
  return 'No service mode set';
}
