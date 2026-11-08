import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { CITY_NAME, CLINIC, getTreatment } from '@/data/catalog';
import { blankCustomer, blankTherapist, emptyCustomer, seedBookings } from '@/data/seed';
import { isValidFutureDate, sessionDate, toISODate } from '@/lib/format';
import {
  CANCEL_WINDOW_HOURS,
  MAX_CHECKIN_ATTEMPTS,
  eligibleTherapists,
  quoted,
  validateArea,
  validatePayment,
} from '@/lib/rules';
import { notifyBooking, registerPushToken, rememberBooking, watchBookingChanges } from '@/lib/push';
import { refreshLiveCatalog } from '@/services/admin';
import { supabase } from '@/lib/supabase';
import {
  authMessage,
  resendConfirmation,
  fetchOwnProfiles,
  fromBookingRow,
  insertBooking,
  loadDirectoryFromCloud,
  toBookingUpdate,
  toCustomerInsert,
  toCustomerUpdate,
  toTherapistInsert,
  toTherapistUpdate,
} from '@/services/cloud';
import type { Booking, Clinic, Customer, NewBookingInput, Role, Therapist } from '@/types/domain';

type Result = { ok: true; message?: string; pendingEmail?: string } | { ok: false; message: string; resend?: boolean };

function adminExistsMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('already confirmed') || lower.includes('already registered') || lower.includes('already been registered')) {
    return 'This email already has an account. Go back and tap Login if you created it as an admin. A customer or therapist email cannot be reused — create the admin with a different email.';
  }
  return authMessage(message);
}

function isEmailConfirmed(user: { email_confirmed_at?: string | null; confirmed_at?: string | null } | null) {
  return Boolean(user && (user.email_confirmed_at || user.confirmed_at));
}

function signupNeedsConfirmation(
  user: { identities?: unknown[] | null; email_confirmed_at?: string | null; confirmed_at?: string | null } | null,
  email: string,
): Result | null {
  if (!user) return { ok: false, message: 'The account was not created. Try again.' };
  if (Array.isArray(user.identities) && user.identities.length === 0) {
    return {
      ok: false,
      resend: true,
      message: 'That email is already registered. Sign in, or open the confirmation email if you have not confirmed it yet.',
    };
  }
  if (!isEmailConfirmed(user)) {
    return {
      ok: true,
      pendingEmail: email,
      message: `We sent a verification link to ${email}. Open that email and tap the link before signing in.`,
    };
  }
  return null;
}

async function resendPending(email: string): Promise<Result> {
  const resent = await resendConfirmation(email);
  if (!resent.ok) return resent;
  return {
    ok: true,
    pendingEmail: email,
    message: `We sent another confirmation link to ${email}. Open that email, tap the link, then sign in.`,
  };
}

type Store = {
  ready: boolean;
  role: Role | null;
  customer: Customer;
  therapists: Therapist[];
  bookings: Booking[];
  clinic: Clinic;
  activeTherapist: Therapist | null;
  setRole: (role: Role | null) => void;
  updateCustomer: (patch: Partial<Customer>) => Promise<Result>;
  registerCustomer: (input: { name: string; mobile: string; email: string; password: string }) => Promise<Result>;
  signInCustomer: (email: string, password: string) => Promise<Result>;
  registerTherapist: (input: { name: string; email: string; password: string }) => Promise<Result>;
  signInTherapist: (email: string, password: string) => Promise<Result>;
  registerAdmin: (input: { name: string; email: string; password: string }) => Promise<Result>;
  signInAdmin: (email: string, password: string) => Promise<Result>;
  updateTherapist: (id: string, patch: Partial<Therapist>) => Promise<Result>;
  createBooking: (input: NewBookingInput) => Promise<{ ok: true; booking: Booking } | { ok: false; message: string }>;
  payBalance: (id: string) => Promise<Result>;
  acceptBooking: (id: string) => Promise<Result>;
  declineBooking: (id: string) => Promise<Result>;
  advanceBooking: (id: string) => Promise<Result>;
  checkIn: (id: string, code: string) => Promise<Result>;
  unlockCheckIn: (id: string) => void;
  completeBooking: (id: string) => Promise<Result>;
  cancelBooking: (id: string) => Promise<Result>;
  submitVerification: (input: { licenseNumber: string; issuingBody: string; licenseValidUntil: string }) => Result;
  approveVerification: () => void;
  resetDemo: () => void;
};

const AppContext = createContext<Store | null>(null);

function makeRef() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let index = 0; index < 6; index += 1) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `LNS-${body}`;
}

function makeCode() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

function hoursUntil(booking: { date: string; time: string }) {
  return (sessionDate(booking).getTime() - Date.now()) / 36e5;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [therapists, setTherapists] = useState<Therapist[]>(() => []);
  const [clinic, setClinic] = useState<Clinic>(() => CLINIC);
  const [activeTherapistId, setActiveTherapistId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>(() => seedBookings());

  const customer = customers.find((person) => person.id === activeCustomerId) ?? emptyCustomer();
  const activeTherapist = therapists.find((therapist) => therapist.id === activeTherapistId) ?? null;
  const bookingsRef = useRef(bookings);

  const alertOtherParty = (
    booking: Booking,
    event: 'created' | 'confirmed' | 'payment_received' | 'cancelled' | 'completed',
  ) => {
    rememberBooking(booking.id, event);
    void notifyBooking(booking, event);
  };

  const applyCloud = async (userId: string) => {
    const { data: authUser } = await supabase.auth.getUser();
    if (authUser.user && !isEmailConfirmed(authUser.user)) {
      await supabase.auth.signOut();
      setRole(null);
      return { ok: false as const, message: 'Open the confirmation email, tap the link, then sign in with this email and password.' };
    }
    await refreshLiveCatalog();
    const { data: adminRow, error: adminError } = await supabase.from('admins').select('id').eq('id', userId).maybeSingle();
    if (!adminError && adminRow) {
      setCustomers([]);
      setActiveCustomerId(null);
      setTherapists([]);
      setActiveTherapistId(null);
      setRole('admin');
      return { ok: true as const, customer: null, therapist: null };
    }
    const [profiles, directory] = await Promise.all([fetchOwnProfiles(userId), loadDirectoryFromCloud()]);
    if (!directory.ok) return { ok: false as const, message: directory.message };
    if (profiles.error) return { ok: false as const, message: profiles.error };
    setCustomers(profiles.customer ? [profiles.customer] : []);
    setActiveCustomerId(profiles.customer?.id ?? null);
    setTherapists(directory.therapists);
    setActiveTherapistId(profiles.therapist?.id ?? null);
    setBookings(directory.bookings);
    setClinic(CLINIC);
    if (profiles.customer?.suspended || profiles.therapist?.suspended) {
      await supabase.auth.signOut();
      setRole(null);
      return { ok: false as const, message: 'This account is suspended. Contact Hilotcare.' };
    }
    if (profiles.therapist && !profiles.customer) setRole('therapist');
    else if (profiles.customer) setRole('customer');
    else setRole(null);
    return { ok: true as const, customer: profiles.customer, therapist: profiles.therapist };
  };

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const userId = data.session?.user.id;
      if (userId) await applyCloud(userId);
      if (active) setReady(true);
    };
    restore().catch(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    bookingsRef.current = bookings;
  }, [bookings]);

  useEffect(() => {
    if (!ready || !role) return;
    const userId = role === 'customer' ? activeCustomerId : activeTherapistId;
    if (!userId) return;
    void registerPushToken(role, userId);
    let active = true;
    const pullBookings = async () => {
      const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
      if (!active || error || !data) return;
      const next = data.map((row) => fromBookingRow(row));
      await watchBookingChanges(role, userId, bookingsRef.current, next);
      if (!active) return;
      setBookings(next);
    };
    void pullBookings();
    const timer = setInterval(() => {
      void pullBookings();
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [ready, role, activeCustomerId, activeTherapistId]);

  const updateCustomer = async (patch: Partial<Customer>): Promise<Result> => {
    if (!activeCustomerId) return { ok: false, message: 'Sign in again before saving.' };
    const row = toCustomerUpdate(patch);
    if (Object.keys(row).length === 0) return { ok: true };
    const { data, error } = await supabase.from('customers').update(row).eq('id', activeCustomerId).select('id');
    if (error) return { ok: false, message: error.message };
    if (!data?.length) return { ok: false, message: 'The profile was not saved. Sign in again, then tap Save.' };
    setCustomers((list) => list.map((person) => (person.id === activeCustomerId ? { ...person, ...patch, id: person.id } : person)));
    return { ok: true };
  };

  const registerCustomer = async (input: { name: string; mobile: string; email: string; password: string }) => {
    const name = input.name.trim();
    const mobile = input.mobile.replace(/\D/g, '');
    const email = input.email.trim().toLowerCase();
    if (name.length < 2) return { ok: false as const, message: 'Enter your full name.' };
    if (!/^09\d{9}$/.test(mobile)) return { ok: false as const, message: 'Mobile number should be 11 digits and start with 09.' };
    if (!email.includes('@')) return { ok: false as const, message: 'Enter a valid email address.' };
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: { role: 'customer', name, mobile } },
    });
    if (error) return { ok: false as const, message: authMessage(error.message) };
    const waiting = signupNeedsConfirmation(data.user, email);
    if (waiting && !waiting.ok && waiting.resend) return resendPending(email);
    if (waiting) {
      if (data.session) await supabase.auth.signOut();
      return waiting;
    }
    if (!data.user || !data.session) return { ok: false as const, message: 'The account was not created. Try again.' };
    const next = { ...blankCustomer({ name, mobile, email }), id: data.user.id };
    const { error: insertError } = await supabase.from('customers').insert(toCustomerInsert(next));
    if (insertError) return { ok: false as const, message: insertError.message };
    const loaded = await applyCloud(data.user.id);
    if (!loaded.ok) return loaded;
    return { ok: true as const };
  };

  const signInCustomer = async (email: string, password: string): Promise<Result> => {
    const clean = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: clean, password });
    if (error || !data.user) return { ok: false, message: authMessage(error?.message ?? 'Sign in failed.') };
    const profiles = await fetchOwnProfiles(data.user.id);
    if (!profiles.customer) {
      const meta = data.user.user_metadata as { role?: string; name?: string; mobile?: string };
      if (meta.role !== 'customer') {
        await supabase.auth.signOut();
        return { ok: false, message: 'That email is not a customer account. Use therapist sign in if you work at the clinic.' };
      }
      const next = {
        ...blankCustomer({ name: meta.name ?? 'Customer', mobile: meta.mobile ?? '09000000000', email: clean }),
        id: data.user.id,
      };
      const { error: insertError } = await supabase.from('customers').insert(toCustomerInsert(next));
      if (insertError) {
        await supabase.auth.signOut();
        return { ok: false, message: insertError.message };
      }
    }
    const loaded = await applyCloud(data.user.id);
    if (!loaded.ok) return loaded;
    return { ok: true };
  };

  const registerTherapist = async (input: { name: string; email: string; password: string }) => {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (name.length < 2) return { ok: false as const, message: 'Enter your full name.' };
    if (!email.includes('@')) return { ok: false as const, message: 'Enter a valid email address.' };
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: { role: 'therapist', name } },
    });
    if (error) return { ok: false as const, message: authMessage(error.message) };
    const waiting = signupNeedsConfirmation(data.user, email);
    if (waiting && !waiting.ok && waiting.resend) return resendPending(email);
    if (waiting) {
      if (data.session) await supabase.auth.signOut();
      return waiting;
    }
    if (!data.user || !data.session) return { ok: false as const, message: 'The account was not created. Try again.' };
    const therapist = { ...blankTherapist({ name, email }), id: data.user.id };
    const { error: insertError } = await supabase.from('therapists').insert(toTherapistInsert(therapist));
    if (insertError) return { ok: false as const, message: insertError.message };
    const loaded = await applyCloud(data.user.id);
    if (!loaded.ok) return loaded;
    return { ok: true as const };
  };

  const registerAdmin = async (input: { name: string; email: string; password: string }) => {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (name.length < 2) return { ok: false as const, message: 'Enter your full name.' };
    if (!email.includes('@')) return { ok: false as const, message: 'Enter a valid email address.' };
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: { role: 'admin', name } },
    });
    if (error) return { ok: false as const, message: adminExistsMessage(error.message) };
    const waiting = signupNeedsConfirmation(data.user, email);
    if (waiting && !waiting.ok && waiting.resend) {
      const resent = await resendPending(email);
      if (!resent.ok) return { ok: false as const, message: adminExistsMessage(resent.message) };
      return resent;
    }
    if (waiting) {
      if (data.session) await supabase.auth.signOut();
      return waiting;
    }
    if (!data.user || !data.session) return { ok: false as const, message: 'The account was not created. Try again.' };
    const { error: insertError } = await supabase.from('admins').insert({ id: data.user.id, name, email });
    if (insertError) return { ok: false as const, message: insertError.message };
    const loaded = await applyCloud(data.user.id);
    if (!loaded.ok) return loaded;
    return { ok: true as const };
  };

  const signInAdmin = async (email: string, password: string): Promise<Result> => {
    const clean = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: clean, password });
    if (error || !data.user) return { ok: false, message: authMessage(error?.message ?? 'Sign in failed.') };
    const { data: adminRow, error: adminError } = await supabase.from('admins').select('id').eq('id', data.user.id).maybeSingle();
    if (adminError) {
      await supabase.auth.signOut();
      return { ok: false, message: adminError.message };
    }
    if (!adminRow) {
      const meta = data.user.user_metadata as { role?: string; name?: string };
      if (meta.role !== 'admin') {
        await supabase.auth.signOut();
        return { ok: false, message: 'That email is not an admin account.' };
      }
      const { error: insertError } = await supabase.from('admins').insert({
        id: data.user.id,
        name: meta.name ?? 'Admin',
        email: clean,
      });
      if (insertError) {
        await supabase.auth.signOut();
        return { ok: false, message: insertError.message };
      }
    }
    const loaded = await applyCloud(data.user.id);
    if (!loaded.ok) return loaded;
    return { ok: true };
  };

  const signInTherapist = async (email: string, password: string): Promise<Result> => {
    const clean = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: clean, password });
    if (error || !data.user) return { ok: false, message: authMessage(error?.message ?? 'Sign in failed.') };
    const profiles = await fetchOwnProfiles(data.user.id);
    if (!profiles.therapist) {
      const meta = data.user.user_metadata as { role?: string; name?: string };
      if (meta.role !== 'therapist') {
        await supabase.auth.signOut();
        return { ok: false, message: 'That email is not a therapist account. Use customer sign in to book a visit.' };
      }
      const therapist = { ...blankTherapist({ name: meta.name ?? 'Therapist', email: clean }), id: data.user.id };
      const { error: insertError } = await supabase.from('therapists').insert(toTherapistInsert(therapist));
      if (insertError) {
        await supabase.auth.signOut();
        return { ok: false, message: insertError.message };
      }
    }
    const loaded = await applyCloud(data.user.id);
    if (!loaded.ok) return loaded;
    return { ok: true };
  };

  const updateTherapist = async (id: string, patch: Partial<Therapist>): Promise<Result> => {
    const { photo, ...details } = patch;
    const row = toTherapistUpdate(details);
    if (Object.keys(row).length > 0) {
      const { data, error } = await supabase.from('therapists').update(row).eq('id', id).select('id');
      if (error) return { ok: false, message: error.message };
      if (!data?.length) return { ok: false, message: 'The profile was not saved. Sign in again, then tap Save.' };
    }
    if (photo !== undefined) {
      const { data, error } = await supabase.from('therapists').update({ photo_path: photo }).eq('id', id).select('id');
      if (error || !data?.length) {
        setTherapists((list) => list.map((therapist) => (therapist.id === id ? { ...therapist, ...details } : therapist)));
        return {
          ok: false,
          message: 'Title, bio, and years were saved. The photo was not. Choose a smaller picture and tap Save again.',
        };
      }
    }
    setTherapists((list) => list.map((therapist) => (therapist.id === id ? { ...therapist, ...patch } : therapist)));
    return { ok: true };
  };

  const persistBooking = async (id: string, patch: Partial<Booking>): Promise<Result> => {
    const { error } = await supabase.from('bookings').update(toBookingUpdate(patch)).eq('id', id);
    if (error) return { ok: false, message: error.message };
    setBookings((list) => list.map((booking) => (booking.id === id ? { ...booking, ...patch } : booking)));
    return { ok: true };
  };

  const createBooking = async (input: NewBookingInput) => {
    const treatment = getTreatment(input.treatmentId);
    if (!treatment || !treatment.durationOptions.includes(input.duration)) {
      return { ok: false as const, message: 'Choose a treatment and duration.' };
    }
    const prices = quoted(treatment, input.duration);
    const onlyId = input.preferAuto ? null : input.therapistId;
    const areaError = validateArea({
      mode: input.mode,
      city: input.city,
      address: input.address,
      clinic,
    });
    if (areaError) return { ok: false as const, message: areaError };
    const visitBarangay = input.mode === 'clinic' ? clinic.city : input.city;
    const visitAddress = input.mode === 'clinic' ? clinic.address.trim() : input.address;
    const matches = eligibleTherapists({
      therapists,
      bookings,
      treatmentId: treatment.id,
      mode: input.mode,
      city: visitBarangay,
      date: input.date,
      time: input.time,
      onlyId,
    });
    const therapist = matches[0];
    if (!therapist) {
      const offers = therapists.some((person) => person.treatmentIds.includes(treatment.id));
      return {
        ok: false as const,
        message: offers
          ? 'That time is already booked. Pick another time.'
          : 'No therapist offers this service yet. They can turn it on from their profile.',
      };
    }
    if (!customer.id) return { ok: false as const, message: 'Create a customer account before booking.' };
    const payment = validatePayment(input);
    if (!payment.ok) return { ok: false as const, message: payment.message };
    const full = true;
    const booking: Booking = {
      id: '',
      customerId: customer.id,
      customerName: customer.name.trim() || 'Customer',
      therapistId: therapist.id,
      treatmentId: treatment.id,
      mode: input.mode,
      city: CITY_NAME,
      barangay: visitBarangay,
      address: visitAddress,
      date: input.date,
      time: input.time,
      duration: input.duration,
      serviceTotal: prices.serviceTotal,
      reservationFee: prices.reservationFee,
      amountPaid: full ? prices.serviceTotal : prices.reservationFee,
      paymentStatus: full ? 'paid' : 'reserved',
      payMethod: input.payMethod,
      balanceMethod: full ? input.payMethod : null,
      payLast4: payment.last4,
      paymentRef: input.paypalOrderId || makeRef(),
      status: 'assigned',
      checkInCode: makeCode(),
      checkInAttempts: 0,
      checkInLocked: false,
      notes: input.notes.trim(),
      assignedBy: input.preferAuto ? 'auto' : 'customer',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      cancelNote: null,
    };
    const saved = await insertBooking(booking);
    if (!saved.ok) return saved;
    if (input.mode === 'home') {
      const place = { city: CITY_NAME, barangay: visitBarangay, address: visitAddress };
      const { error: placeError } = await supabase.from('customers').update(place).eq('id', customer.id).select('id');
      if (!placeError) {
        setCustomers((list) => list.map((person) => (person.id === customer.id ? { ...person, ...place } : person)));
      }
    }
    setBookings((list) => [saved.booking, ...list.filter((item) => item.id !== saved.booking.id)]);
    alertOtherParty(saved.booking, 'created');
    if (saved.booking.paymentStatus === 'paid') alertOtherParty(saved.booking, 'payment_received');
    return { ok: true as const, booking: saved.booking };
  };

  const payBalance = async (id: string): Promise<Result> => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status === 'cancelled') return { ok: false, message: 'This visit was cancelled.' };
    if (current.paymentStatus !== 'reserved') return { ok: false, message: 'This visit has no balance due.' };
    const saved = await persistBooking(id, {
      paymentStatus: 'paid',
      amountPaid: current.serviceTotal,
      balanceMethod: current.payMethod,
    });
    if (!saved.ok) return saved;
    alertOtherParty({ ...current, paymentStatus: 'paid', amountPaid: current.serviceTotal, balanceMethod: current.payMethod }, 'payment_received');
    return { ok: true, message: 'Balance paid.' };
  };

  const acceptBooking = async (id: string): Promise<Result> => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status !== 'assigned') return { ok: false, message: 'This visit is not waiting for acceptance.' };
    const saved = await persistBooking(id, {
      status: 'confirmed',
      paymentStatus: 'paid',
      balanceMethod: current.payMethod,
    });
    if (!saved.ok) return saved;
    const accepted = { ...current, status: 'confirmed' as const, paymentStatus: 'paid' as const, balanceMethod: current.payMethod };
    alertOtherParty(accepted, 'confirmed');
    if (current.paymentStatus !== 'paid') alertOtherParty(accepted, 'payment_received');
    return { ok: true, message: 'Payment accepted and booking confirmed.' };
  };

  const declineBooking = async (id: string): Promise<Result> => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status !== 'assigned') return { ok: false, message: 'This visit can no longer be declined.' };
    const saved = await persistBooking(id, {
      status: 'cancelled',
      paymentStatus: 'refunded',
      amountPaid: 0,
      cancelNote: 'The therapist declined this visit. The reservation is marked for refund.',
    });
    if (!saved.ok) return saved;
    alertOtherParty(
      {
        ...current,
        status: 'cancelled',
        paymentStatus: 'refunded',
        amountPaid: 0,
        cancelNote: 'The therapist declined this visit. The reservation is marked for refund.',
      },
      'cancelled',
    );
    return { ok: true, message: 'Visit declined and the reservation is marked for refund.' };
  };

  const advanceBooking = async (id: string): Promise<Result> => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status === 'confirmed' && current.mode === 'home') {
      return persistBooking(id, { status: 'en_route' });
    }
    if ((current.status === 'confirmed' && current.mode === 'clinic') || current.status === 'en_route') {
      return persistBooking(id, { status: 'arrived' });
    }
    return { ok: false, message: 'This visit cannot be moved forward yet.' };
  };

  const checkIn = async (id: string, code: string): Promise<Result> => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status !== 'confirmed') return { ok: false, message: 'Check-in opens after the therapist confirms the visit.' };
    if (current.checkInLocked) return { ok: false, message: 'Check-in is locked after five wrong codes.' };
    if (current.checkInCode !== code.trim()) {
      const attempts = current.checkInAttempts + 1;
      const locked = attempts >= MAX_CHECKIN_ATTEMPTS;
      const saved = await persistBooking(id, { checkInAttempts: attempts, checkInLocked: locked });
      if (!saved.ok) return saved;
      if (locked) return { ok: false, message: 'Check-in is locked after five wrong codes.' };
      const left = MAX_CHECKIN_ATTEMPTS - attempts;
      return { ok: false, message: `That code does not match. ${left} ${left === 1 ? 'try' : 'tries'} left.` };
    }
    const saved = await persistBooking(id, { status: 'in_session', startedAt: new Date().toISOString() });
    if (!saved.ok) return saved;
    return { ok: true, message: 'Safety code matched. The customer is checked in.' };
  };

  const unlockCheckIn = (id: string) => {
    void persistBooking(id, { checkInLocked: false, checkInAttempts: 0 });
  };

  const completeBooking = async (id: string): Promise<Result> => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status !== 'confirmed' && current.status !== 'in_session') {
      return { ok: false, message: 'The therapist needs to confirm this visit first.' };
    }
    if (current.paymentStatus !== 'paid') return { ok: false, message: 'The therapist still needs to accept the payment.' };
    const saved = await persistBooking(id, { status: 'completed', completedAt: new Date().toISOString() });
    if (!saved.ok) return saved;
    alertOtherParty({ ...current, status: 'completed', completedAt: new Date().toISOString() }, 'completed');
    return { ok: true, message: 'Session marked as finished.' };
  };

  const cancelBooking = async (id: string): Promise<Result> => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status !== 'assigned' && current.status !== 'confirmed') {
      return { ok: false, message: 'This visit can no longer be cancelled in the app.' };
    }
    const keepFee = hoursUntil(current) < CANCEL_WINDOW_HOURS;
    const cancelNote = keepFee
      ? 'Cancelled inside 3 hours of the start time. The reservation fee is kept and any extra amount paid is refunded.'
      : 'Cancelled with more than 3 hours to spare. Everything paid is refunded.';
    const saved = await persistBooking(id, {
      status: 'cancelled',
      paymentStatus: keepFee ? 'forfeited' : 'refunded',
      amountPaid: keepFee ? current.reservationFee : 0,
      cancelNote,
    });
    if (!saved.ok) return saved;
    alertOtherParty(
      {
        ...current,
        status: 'cancelled',
        paymentStatus: keepFee ? 'forfeited' : 'refunded',
        amountPaid: keepFee ? current.reservationFee : 0,
        cancelNote,
      },
      'cancelled',
    );
    return {
      ok: true,
      message: keepFee
        ? 'Visit cancelled. The reservation fee is kept because it is inside 3 hours of the start time.'
        : 'Visit cancelled. The payment is marked for refund.',
    };
  };

  const submitVerification = (input: {
    licenseNumber: string;
    issuingBody: string;
    licenseValidUntil: string;
  }): Result => {
    const licenseNumber = input.licenseNumber.trim();
    if (licenseNumber.length < 6) return { ok: false, message: 'Enter the license number.' };
    if (!input.issuingBody) return { ok: false, message: 'Choose the issuing body.' };
    if (!isValidFutureDate(input.licenseValidUntil)) {
      return { ok: false, message: 'Enter a future expiry as YYYY-MM-DD.' };
    }
    if (!activeTherapistId) return { ok: false, message: 'Create a therapist account first.' };
    updateTherapist(activeTherapistId, {
      licenseNumber,
      issuingBody: input.issuingBody,
      licenseValidUntil: input.licenseValidUntil,
      verification: 'pending',
      reviewedAt: null,
      verificationNote: 'Waiting for review of the license you entered.',
    });
    return { ok: true, message: 'License sent for review. New bookings pause until it is approved.' };
  };

  const approveVerification = () => {
    if (!activeTherapistId) return;
    updateTherapist(activeTherapistId, {
      verification: 'verified',
      reviewedAt: toISODate(new Date()),
      verificationNote: 'License approved. Clients can book you.',
    });
  };

  const resetDemo = () => {
    void supabase.auth.signOut();
    setCustomers([]);
    setActiveCustomerId(null);
    setTherapists([]);
    setClinic(CLINIC);
    setActiveTherapistId(null);
    setBookings(seedBookings());
    setRole(null);
  };

  const chooseRole = (next: Role | null) => {
    setRole(next);
    if (next !== null) return;
    setActiveCustomerId(null);
    setActiveTherapistId(null);
    void supabase.auth.signOut();
  };

  return (
    <AppContext.Provider
      value={{
        ready,
        role,
        customer,
        therapists,
        bookings,
        clinic,
        activeTherapist,
        setRole: chooseRole,
        updateCustomer,
        registerCustomer,
        signInCustomer,
        registerTherapist,
        signInTherapist,
        registerAdmin,
        signInAdmin,
        updateTherapist,
        createBooking,
        payBalance,
        acceptBooking,
        declineBooking,
        advanceBooking,
        checkIn,
        unlockCheckIn,
        completeBooking,
        cancelBooking,
        submitVerification,
        approveVerification,
        resetDemo,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used within AppProvider');
  return value;
}
