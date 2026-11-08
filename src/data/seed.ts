import { CITY_NAME, CLINIC, activeTreatments } from '@/data/catalog';
import type { Booking, Customer, Therapist } from '@/types/domain';

const SAMPLE_THERAPIST_IDS = new Set(['th_liza', 'th_paolo', 'th_amina', 'th_diego', 'th_rosa']);
const SAMPLE_THERAPIST_NAMES = new Set([
  'Liza Navarro',
  'Paolo Reyes',
  'Amina Cruz',
  'Diego Santos',
  'Rosa Villanueva',
]);

export function isSampleTherapist(therapist: { id: string; name: string }) {
  return SAMPLE_THERAPIST_IDS.has(therapist.id) || SAMPLE_THERAPIST_NAMES.has(therapist.name);
}

export function emptyWeeklySlots() {
  const weekly: Record<string, string[]> = {};
  for (let day = 0; day < 7; day += 1) weekly[String(day)] = [];
  return weekly;
}

export function blankTherapist(input: { name: string; email: string }): Therapist {
  return {
    id: `th_${Date.now().toString(36)}`,
    name: input.name,
    email: input.email,
    photo: '',
    title: '',
    bio: '',
    years: 0,
    rating: 0,
    reviewCount: 0,
    treatmentIds: activeTreatments().map((treatment) => treatment.id),
    verification: 'pending',
    suspended: false,
    validId: '',
    certificate: '',
    verificationNote: '',
    licenseNumber: '',
    issuingBody: '',
    licenseValidUntil: '',
    reviewedAt: null,
    offersHome: true,
    offersClinic: true,
    clinic: CLINIC,
    travelZones: [],
    weeklySlots: emptyWeeklySlots(),
  };
}

export function emptyCustomer(): Customer {
  return {
    id: '',
    name: '',
    mobile: '',
    email: '',
    photo: '',
    city: '',
    barangay: '',
    address: '',
    suspended: false,
  };
}

export function blankCustomer(input: { name: string; mobile: string; email: string }): Customer {
  return {
    id: `cust_${Date.now().toString(36)}`,
    name: input.name.trim(),
    mobile: input.mobile,
    email: input.email.trim().toLowerCase(),
    photo: '',
    city: CITY_NAME,
    barangay: '',
    address: '',
    suspended: false,
  };
}

export function seedCustomer(): Customer {
  return emptyCustomer();
}

export function seedBookings(): Booking[] {
  return [];
}
