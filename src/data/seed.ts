import type { Booking, Customer, Therapist } from '@/types/domain';

export const CUSTOMER_ID = 'cust_mara';

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
    title: '',
    bio: '',
    years: 0,
    rating: 0,
    reviewCount: 0,
    treatmentIds: [],
    verification: 'unverified',
    verificationNote: 'Enter your license so clients can book you.',
    licenseNumber: '',
    issuingBody: '',
    licenseValidUntil: '',
    reviewedAt: null,
    offersHome: true,
    offersClinic: false,
    clinic: null,
    travelZones: [],
    weeklySlots: emptyWeeklySlots(),
  };
}

export function seedCustomer(): Customer {
  return {
    id: CUSTOMER_ID,
    name: '',
    mobile: '',
    email: '',
    city: '',
    address: '',
  };
}

export function seedBookings(): Booking[] {
  return [];
}
