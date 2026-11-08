import { CITY_NAME, CLINIC, isCoveredBarangay } from '@/data/catalog';
import { emptyWeeklySlots } from '@/data/seed';
import { supabase } from '@/lib/supabase';
import type { Booking, Customer, PayMethod, ServiceMode, SessionStatus, Therapist } from '@/types/domain';

type CustomerRow = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  photo_path: string;
  city: string;
  barangay?: string | null;
  address: string;
  suspended?: boolean | null;
};

type TherapistRow = {
  id: string;
  name: string;
  email: string;
  photo_path: string;
  title: string;
  bio: string;
  years: number;
  treatment_ids: string[] | null;
  offers_home: boolean;
  offers_clinic: boolean;
  travel_zones: string[] | null;
  weekly_slots: unknown;
  verification_status?: string | null;
  verification_note?: string | null;
  reviewed_at?: string | null;
  valid_id_path?: string | null;
  certificate_path?: string | null;
  suspended?: boolean | null;
};

type BookingRow = {
  id: string;
  customer_id: string;
  customer_name?: string | null;
  therapist_id: string;
  treatment_id: string;
  mode: ServiceMode;
  city: string;
  barangay?: string | null;
  address: string;
  date: string;
  time: string;
  duration: number | string;
  service_total: number | string;
  reservation_fee: number | string;
  amount_paid: number | string;
  payment_status: Booking['paymentStatus'];
  pay_method: PayMethod;
  balance_method?: PayMethod | null;
  pay_last4?: string | null;
  payment_ref: string;
  status: SessionStatus;
  check_in_code: string;
  check_in_attempts: number;
  check_in_locked: boolean;
  notes: string;
  assigned_by?: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  cancel_note: string | null;
};

function splitPlace(city: string, barangay?: string | null) {
  const savedBarangay = barangay?.trim() ?? '';
  if (savedBarangay) return { city: CITY_NAME, barangay: savedBarangay };
  if (city && city !== CITY_NAME && isCoveredBarangay(city)) return { city: CITY_NAME, barangay: city };
  return { city: city || CITY_NAME, barangay: '' };
}

function money(value: number | string) {
  return typeof value === 'number' ? value : Number(value);
}

function weeklyFrom(value: unknown) {
  const weekly = emptyWeeklySlots();
  if (!value || typeof value !== 'object') return weekly;
  for (const [day, slots] of Object.entries(value)) {
    if (Array.isArray(slots)) weekly[day] = slots.filter((slot): slot is string => typeof slot === 'string');
  }
  return weekly;
}

export function fromCustomerRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    email: row.email,
    photo: row.photo_path ?? '',
    ...splitPlace(row.city, row.barangay),
    address: row.address,
    suspended: Boolean(row.suspended),
  };
}

export function fromTherapistRow(row: TherapistRow): Therapist {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    photo: row.photo_path ?? '',
    title: row.title ?? '',
    bio: row.bio ?? '',
    years: row.years ?? 0,
    rating: 0,
    reviewCount: 0,
    treatmentIds: row.treatment_ids ?? [],
    verification:
      row.verification_status === 'pending' || row.verification_status === 'rejected' || row.verification_status === 'verified'
        ? row.verification_status
        : 'verified',
    verificationNote: row.verification_note ?? '',
    licenseNumber: '',
    issuingBody: '',
    licenseValidUntil: '',
    reviewedAt: row.reviewed_at ?? null,
    offersHome: row.offers_home,
    offersClinic: row.offers_clinic,
    clinic: CLINIC,
    travelZones: row.travel_zones ?? [],
    weeklySlots: weeklyFrom(row.weekly_slots),
    suspended: Boolean(row.suspended),
    validId: row.valid_id_path ?? '',
    certificate: row.certificate_path ?? '',
  };
}

export function fromBookingRow(row: BookingRow): Booking {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name?.trim() || 'Customer',
    therapistId: row.therapist_id,
    treatmentId: row.treatment_id,
    mode: row.mode,
    ...splitPlace(row.city, row.barangay),
    address: row.address,
    date: row.date,
    time: row.time.slice(0, 5),
    duration: money(row.duration),
    serviceTotal: money(row.service_total),
    reservationFee: money(row.reservation_fee),
    amountPaid: money(row.amount_paid),
    paymentStatus: row.payment_status,
    payMethod: row.pay_method,
    balanceMethod: row.balance_method ?? null,
    payLast4: row.pay_last4 ?? '',
    paymentRef: row.payment_ref,
    status: row.status,
    checkInCode: row.check_in_code,
    checkInAttempts: row.check_in_attempts,
    checkInLocked: row.check_in_locked,
    notes: row.notes ?? '',
    assignedBy: row.assigned_by === 'customer' ? 'customer' : 'auto',
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    cancelNote: row.cancel_note,
  };
}

export function toCustomerInsert(customer: Customer) {
  return {
    id: customer.id,
    name: customer.name,
    mobile: customer.mobile,
    email: customer.email,
    photo_path: customer.photo,
    city: CITY_NAME,
    barangay: customer.barangay,
    address: customer.address,
  };
}

export function toCustomerUpdate(patch: Partial<Customer>) {
  const row: Record<string, string> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.mobile !== undefined) row.mobile = patch.mobile;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.photo !== undefined) row.photo_path = patch.photo;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.barangay !== undefined) row.barangay = patch.barangay;
  if (patch.address !== undefined) row.address = patch.address;
  return row;
}

export function toTherapistInsert(therapist: Therapist) {
  return {
    id: therapist.id,
    name: therapist.name,
    email: therapist.email,
    photo_path: therapist.photo,
    title: therapist.title,
    bio: therapist.bio,
    years: therapist.years,
    treatment_ids: therapist.treatmentIds,
    offers_home: therapist.offersHome,
    offers_clinic: therapist.offersClinic,
    travel_zones: therapist.travelZones,
    weekly_slots: therapist.weeklySlots,
  };
}

export function toTherapistUpdate(patch: Partial<Therapist>) {
  const row: Record<string, string | number | boolean | string[] | Record<string, string[]> | null> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.photo !== undefined) row.photo_path = patch.photo;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.years !== undefined) row.years = patch.years;
  if (patch.treatmentIds !== undefined) row.treatment_ids = patch.treatmentIds;
  if (patch.offersHome !== undefined) row.offers_home = patch.offersHome;
  if (patch.offersClinic !== undefined) row.offers_clinic = patch.offersClinic;
  if (patch.travelZones !== undefined) row.travel_zones = patch.travelZones;
  if (patch.weeklySlots !== undefined) row.weekly_slots = patch.weeklySlots;
  if (patch.verification !== undefined) row.verification_status = patch.verification;
  if (patch.verificationNote !== undefined) row.verification_note = patch.verificationNote;
  if (patch.reviewedAt !== undefined) row.reviewed_at = patch.reviewedAt;
  if (patch.validId !== undefined) row.valid_id_path = patch.validId;
  if (patch.certificate !== undefined) row.certificate_path = patch.certificate;
  if (patch.suspended !== undefined) row.suspended = patch.suspended;
  return row;
}

export function toBookingInsert(booking: Booking) {
  return {
    customer_id: booking.customerId,
    customer_name: booking.customerName,
    therapist_id: booking.therapistId,
    treatment_id: booking.treatmentId,
    mode: booking.mode,
    city: CITY_NAME,
    barangay: booking.barangay,
    address: booking.address,
    date: booking.date,
    time: booking.time,
    duration: booking.duration,
    service_total: booking.serviceTotal,
    reservation_fee: booking.reservationFee,
    amount_paid: booking.amountPaid,
    payment_status: booking.paymentStatus,
    pay_method: booking.payMethod,
    balance_method: booking.balanceMethod,
    pay_last4: booking.payLast4,
    payment_ref: booking.paymentRef,
    status: booking.status,
    check_in_code: booking.checkInCode,
    check_in_attempts: booking.checkInAttempts,
    check_in_locked: booking.checkInLocked,
    notes: booking.notes,
    assigned_by: booking.assignedBy,
    created_at: booking.createdAt,
    started_at: booking.startedAt,
    completed_at: booking.completedAt,
    cancel_note: booking.cancelNote,
  };
}

export function toBookingUpdate(patch: Partial<Booking>) {
  const row: Record<string, string | number | boolean | null> = {};
  if (patch.customerName !== undefined) row.customer_name = patch.customerName;
  if (patch.therapistId !== undefined) row.therapist_id = patch.therapistId;
  if (patch.treatmentId !== undefined) row.treatment_id = patch.treatmentId;
  if (patch.mode !== undefined) row.mode = patch.mode;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.barangay !== undefined) row.barangay = patch.barangay;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.time !== undefined) row.time = patch.time;
  if (patch.duration !== undefined) row.duration = patch.duration;
  if (patch.serviceTotal !== undefined) row.service_total = patch.serviceTotal;
  if (patch.reservationFee !== undefined) row.reservation_fee = patch.reservationFee;
  if (patch.amountPaid !== undefined) row.amount_paid = patch.amountPaid;
  if (patch.paymentStatus !== undefined) row.payment_status = patch.paymentStatus;
  if (patch.payMethod !== undefined) row.pay_method = patch.payMethod;
  if (patch.balanceMethod !== undefined) row.balance_method = patch.balanceMethod;
  if (patch.payLast4 !== undefined) row.pay_last4 = patch.payLast4;
  if (patch.paymentRef !== undefined) row.payment_ref = patch.paymentRef;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.checkInCode !== undefined) row.check_in_code = patch.checkInCode;
  if (patch.checkInAttempts !== undefined) row.check_in_attempts = patch.checkInAttempts;
  if (patch.checkInLocked !== undefined) row.check_in_locked = patch.checkInLocked;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.assignedBy !== undefined) row.assigned_by = patch.assignedBy;
  if (patch.startedAt !== undefined) row.started_at = patch.startedAt;
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
  if (patch.cancelNote !== undefined) row.cancel_note = patch.cancelNote;
  return row;
}

export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) return { ok: false as const, message: authMessage(error.message) };
  return { ok: true as const };
}

export function authMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('error sending confirmation email')) {
    return 'The form is fine. Supabase could not send the verification email, so the account was not created. On Authentication, then Emails, type the Gmail app password again and save.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Open the confirmation email, tap the link, then sign in with this email and password.';
  }
  if (lower.includes('not authorized')) {
    return 'Supabase can only email addresses on the project team until custom SMTP is turned on. Use one of those emails, or add this address in Organization settings, then try again.';
  }
  if (lower.includes('invalid login')) {
    return 'That email and password do not match. Create an account if this is your first time in Supabase.';
  }
  if (lower.includes('already registered') || lower.includes('already been registered') || lower.includes('already confirmed')) {
    return 'That email is already confirmed. Sign in with the password you created.';
  }
  return message;
}

export async function fetchOwnProfiles(userId: string) {
  const [customerResult, therapistResult] = await Promise.all([
    supabase.from('customers').select('*').eq('id', userId).maybeSingle(),
    supabase.from('therapists').select('*').eq('id', userId).maybeSingle(),
  ]);
  return {
    customer: customerResult.data ? fromCustomerRow(customerResult.data as CustomerRow) : null,
    therapist: therapistResult.data ? fromTherapistRow(therapistResult.data as TherapistRow) : null,
    error: customerResult.error?.message ?? therapistResult.error?.message ?? null,
  };
}

export async function insertBooking(booking: Booking) {
  const { data, error } = await supabase.from('bookings').insert(toBookingInsert(booking)).select('*').single();
  if (error || !data) {
    const message =
      error?.code === '23505' ? 'That time is already booked. Pick another time.' : error?.message ?? 'The booking could not be saved.';
    return { ok: false as const, message };
  }
  return { ok: true as const, booking: fromBookingRow(data as BookingRow) };
}

export async function loadDirectoryFromCloud() {
  const [{ data: therapistRows, error: therapistError }, { data: bookingRows, error: bookingError }] = await Promise.all([
    supabase.from('therapists').select('*'),
    supabase.from('bookings').select('*').order('created_at', { ascending: false }),
  ]);
  if (therapistError) return { ok: false as const, message: therapistError.message };
  if (bookingError) return { ok: false as const, message: bookingError.message };
  return {
    ok: true as const,
    therapists: ((therapistRows ?? []) as TherapistRow[]).map(fromTherapistRow),
    bookings: ((bookingRows ?? []) as BookingRow[]).map(fromBookingRow),
  };
}
