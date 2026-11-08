import { setLiveCatalog, treatmentImage } from '@/data/catalog';
import { supabase } from '@/lib/supabase';
import { fromBookingRow, fromCustomerRow, fromTherapistRow } from '@/services/cloud';
import type { Booking, Complaint, Customer, Therapist, Treatment, TreatmentCategory } from '@/types/domain';

type TreatmentRow = {
  id: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  duration_options: number[] | null;
  hourly_rate: number | string;
  package_prices: Record<string, number> | null;
  offers_home: boolean;
  offers_clinic: boolean;
  active: boolean;
};

function money(value: number | string) {
  return typeof value === 'number' ? value : Number(value);
}

export function mapTreatment(row: TreatmentRow): Treatment {
  const packagePrices: Record<number, number> = {};
  for (const [minutes, price] of Object.entries(row.package_prices ?? {})) {
    packagePrices[Number(minutes)] = Number(price);
  }
  const category: TreatmentCategory =
    row.category === 'hilot' || row.category === 'combo' || row.category === 'massage' ? row.category : 'massage';
  return {
    id: row.id,
    name: row.name,
    category,
    summary: row.summary,
    description: row.description,
    durationOptions: row.duration_options ?? [60],
    hourlyRate: money(row.hourly_rate),
    packagePrices,
    focus: [],
    image: treatmentImage(row.id),
    active: row.active,
    offersHome: row.offers_home,
    offersClinic: row.offers_clinic,
  };
}

export async function refreshLiveCatalog() {
  const [treatments, areas] = await Promise.all([
    supabase.from('treatments').select('*').eq('active', true),
    supabase.from('service_areas').select('name').eq('active', true).order('name'),
  ]);
  if (!treatments.error && treatments.data?.length) {
    setLiveCatalog({ treatments: (treatments.data as TreatmentRow[]).map(mapTreatment) });
  }
  if (!areas.error && areas.data?.length) {
    setLiveCatalog({ barangays: areas.data.map((row) => row.name as string) });
  }
}

export async function fetchAdminBundle() {
  const [customers, therapists, bookings, complaints, treatments, areas] = await Promise.all([
    supabase.from('customers').select('*').order('name'),
    supabase.from('therapists').select('*').order('name'),
    supabase.from('bookings').select('*').order('created_at', { ascending: false }),
    supabase.from('complaints').select('*').order('created_at', { ascending: false }),
    supabase.from('treatments').select('*').order('name'),
    supabase.from('service_areas').select('*').order('name'),
  ]);
  const error =
    customers.error?.message ??
    therapists.error?.message ??
    bookings.error?.message ??
    complaints.error?.message ??
    treatments.error?.message ??
    areas.error?.message;
  return {
    error,
    customers: ((customers.data ?? []) as Parameters<typeof fromCustomerRow>[0][]).map(fromCustomerRow),
    therapists: ((therapists.data ?? []) as Parameters<typeof fromTherapistRow>[0][]).map(fromTherapistRow),
    bookings: ((bookings.data ?? []) as Parameters<typeof fromBookingRow>[0][]).map(fromBookingRow),
    complaints: ((complaints.data ?? []) as ComplaintRow[]).map(fromComplaint),
    treatments: ((treatments.data ?? []) as TreatmentRow[]).map(mapTreatment),
    areas: ((areas.data ?? []) as { name: string; active: boolean }[]).map((row) => ({
      name: row.name,
      active: row.active,
    })),
  };
}

type ComplaintRow = {
  id: string;
  author_id: string;
  author_role: 'customer' | 'therapist';
  author_name: string;
  against_id: string | null;
  body: string;
  status: 'open' | 'reviewed';
  created_at: string;
};

function fromComplaint(row: ComplaintRow): Complaint {
  return {
    id: row.id,
    authorId: row.author_id,
    authorRole: row.author_role,
    authorName: row.author_name,
    againstId: row.against_id ?? '',
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function saveTreatment(treatment: Treatment) {
  const { error } = await supabase.from('treatments').upsert({
    id: treatment.id,
    name: treatment.name,
    category: treatment.category,
    summary: treatment.summary,
    description: treatment.description,
    duration_options: treatment.durationOptions,
    hourly_rate: treatment.hourlyRate,
    package_prices: treatment.packagePrices,
    offers_home: treatment.offersHome !== false,
    offers_clinic: treatment.offersClinic !== false,
    active: treatment.active !== false,
  });
  if (!error) await refreshLiveCatalog();
  return error?.message ?? null;
}

export async function setAreaActive(name: string, active: boolean) {
  const { error } = await supabase.from('service_areas').upsert({ name, active });
  if (!error) await refreshLiveCatalog();
  return error?.message ?? null;
}

export async function reviewTherapist(id: string, status: 'verified' | 'rejected', note: string) {
  const { error } = await supabase
    .from('therapists')
    .update({
      verification_status: status,
      verification_note: note,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  return error?.message ?? null;
}

export async function setSuspended(table: 'customers' | 'therapists', id: string, suspended: boolean) {
  const { error } = await supabase.from(table).update({ suspended }).eq('id', id);
  return error?.message ?? null;
}

export async function reassignBooking(id: string, therapistId: string) {
  const { error } = await supabase.from('bookings').update({ therapist_id: therapistId, status: 'assigned' }).eq('id', id);
  return error?.message ?? null;
}

export async function refundBooking(id: string) {
  const { error } = await supabase
    .from('bookings')
    .update({
      payment_status: 'refunded',
      amount_paid: 0,
      cancel_note: 'Refund recorded by Hilotcare admin.',
    })
    .eq('id', id);
  return error?.message ?? null;
}

export async function unlockCheckIn(id: string) {
  const { error } = await supabase.from('bookings').update({ check_in_locked: false, check_in_attempts: 0 }).eq('id', id);
  return error?.message ?? null;
}

export async function reviewComplaint(id: string) {
  const { error } = await supabase.from('complaints').update({ status: 'reviewed' }).eq('id', id);
  return error?.message ?? null;
}

export async function fileComplaint(input: {
  authorId: string;
  authorRole: 'customer' | 'therapist';
  authorName: string;
  body: string;
}) {
  const { error } = await supabase.from('complaints').insert({
    author_id: input.authorId,
    author_role: input.authorRole,
    author_name: input.authorName,
    body: input.body.trim(),
  });
  return error?.message ?? null;
}

export type AdminLists = {
  customers: Customer[];
  therapists: Therapist[];
  bookings: Booking[];
  complaints: Complaint[];
  treatments: Treatment[];
  areas: { name: string; active: boolean }[];
};
