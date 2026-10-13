import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { asBarangay, getTreatment, isCoveredBarangay } from '@/data/catalog';
import { blankTherapist, isSampleTherapist, seedBookings, seedCustomer } from '@/data/seed';
import { isValidFutureDate, sessionDate, toISODate } from '@/lib/format';
import {
  CANCEL_WINDOW_HOURS,
  MAX_CHECKIN_ATTEMPTS,
  eligibleTherapists,
  quoted,
  validateArea,
  validatePayment,
} from '@/lib/rules';
import { clearDirectory, loadDirectory, saveDirectory } from '@/services/directory';
import type { Booking, Customer, NewBookingInput, Role, Therapist } from '@/types/domain';

type Result = { ok: true; message?: string } | { ok: false; message: string };

type Store = {
  ready: boolean;
  role: Role | null;
  customer: Customer;
  therapists: Therapist[];
  bookings: Booking[];
  activeTherapist: Therapist | null;
  setRole: (role: Role | null) => void;
  updateCustomer: (patch: Partial<Customer>) => void;
  registerTherapist: (input: { name: string; email: string }) => { ok: true } | { ok: false; message: string };
  signInTherapist: (email: string) => Result;
  updateTherapist: (id: string, patch: Partial<Therapist>) => void;
  createBooking: (input: NewBookingInput) => { ok: true; booking: Booking } | { ok: false; message: string };
  payBalance: (id: string) => Result;
  acceptBooking: (id: string) => Result;
  declineBooking: (id: string) => Result;
  advanceBooking: (id: string) => Result;
  checkIn: (id: string, code: string) => Result;
  unlockCheckIn: (id: string) => void;
  completeBooking: (id: string) => Result;
  cancelBooking: (id: string) => Result;
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
  const [customer, setCustomer] = useState<Customer>(() => seedCustomer());
  const [therapists, setTherapists] = useState<Therapist[]>(() => []);
  const [activeTherapistId, setActiveTherapistId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>(() => seedBookings());

  const activeTherapist = therapists.find((therapist) => therapist.id === activeTherapistId) ?? null;

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const saved = await loadDirectory();
      if (!active) return;
      if (saved) {
        const knownAddress: Record<string, string> = {
          '18 Maginhawa Street, Teachers Village East': '18 Quezon Avenue',
          '42 Maginhawa Street, Teachers Village': '42 Quezon Avenue',
          '55 Xavierville Avenue, Loyola Heights': '55 Quezon Avenue',
          '14 Malingap Street, Teachers Village': '14 Gomez Street',
          '8th Floor, One Parkade, 28th Street': '12 Andres Bonifacio Avenue',
          '2100 Roxas Boulevard': '210 National Highway',
        };
        const addressOf = (address: string) => knownAddress[address] ?? address;
        const savedAddress = saved.customer.address;
        const demoAddress =
          savedAddress === '18 Quezon Avenue' || savedAddress === '18 Maginhawa Street, Teachers Village East';
        setCustomer({
          ...saved.customer,
          name: saved.customer.name === 'Mara Santos' ? '' : saved.customer.name,
          mobile: saved.customer.mobile === '09171234567' ? '' : saved.customer.mobile,
          email: saved.customer.email ?? '',
          city: isCoveredBarangay(saved.customer.city) ? asBarangay(saved.customer.city) : '',
          address: demoAddress ? '' : isCoveredBarangay(saved.customer.city) ? savedAddress : addressOf(savedAddress),
        });
        const kept = saved.therapists.filter((therapist) => !isSampleTherapist(therapist)).map((therapist) => {
          const zonesOk = therapist.travelZones.every((zone) => isCoveredBarangay(zone));
          const clinicOk = !therapist.clinic || isCoveredBarangay(therapist.clinic.city);
          return {
            ...therapist,
            email: therapist.email ?? '',
            travelZones: zonesOk ? therapist.travelZones.map((zone) => asBarangay(zone)) : [],
            clinic: therapist.clinic
              ? {
                  ...therapist.clinic,
                  city: clinicOk ? asBarangay(therapist.clinic.city) : '',
                  address: clinicOk ? therapist.clinic.address : '',
                }
              : therapist.clinic,
          };
        });
        setTherapists(kept);
        const keptIds = new Set(kept.map((therapist) => therapist.id));
        const nextActive = saved.activeTherapistId && keptIds.has(saved.activeTherapistId) ? saved.activeTherapistId : null;
        setActiveTherapistId(nextActive);
        setRole(saved.role === 'therapist' && !nextActive ? null : saved.role);
        const sampleIds = new Set([
          'b_mara_next',
          'b_mara_clinic',
          'b_mara_done',
          'b_elena_done',
          'b_marco_done',
          'b_mara_refund',
          'b_mara_fee',
        ]);
        setBookings(
          saved.bookings
            .filter((booking) => !sampleIds.has(booking.id) && keptIds.has(booking.therapistId))
            .map((booking) =>
              isCoveredBarangay(booking.city)
                ? booking
                : { ...booking, city: 'Poblacion', address: addressOf(booking.address) },
            ),
        );
      }
      setReady(true);
    };
    restore().catch(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveDirectory({ role, customer, therapists, bookings, activeTherapistId }).catch(() => undefined);
  }, [ready, role, customer, therapists, bookings, activeTherapistId]);

  const updateCustomer = (patch: Partial<Customer>) => {
    setCustomer((current) => ({ ...current, ...patch, id: current.id }));
  };

  const registerTherapist = (input: { name: string; email: string }) => {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (name.length < 2) return { ok: false as const, message: 'Enter your full name.' };
    if (!email.includes('@')) return { ok: false as const, message: 'Enter a valid email address.' };
    if (therapists.some((therapist) => therapist.email === email)) {
      return { ok: false as const, message: 'That email is already registered on this device. Sign in instead.' };
    }
    const therapist = blankTherapist({ name, email });
    setTherapists((list) => [...list, therapist]);
    setActiveTherapistId(therapist.id);
    return { ok: true as const };
  };

  const signInTherapist = (email: string): Result => {
    const clean = email.trim().toLowerCase();
    const match = therapists.find((therapist) => therapist.email === clean);
    if (!match) return { ok: false, message: 'That email does not match a therapist account on this device.' };
    setActiveTherapistId(match.id);
    return { ok: true };
  };

  const updateTherapist = (id: string, patch: Partial<Therapist>) => {
    setTherapists((list) => list.map((therapist) => (therapist.id === id ? { ...therapist, ...patch } : therapist)));
  };

  const replaceBooking = (id: string, patch: Partial<Booking>) => {
    setBookings((list) => list.map((booking) => (booking.id === id ? { ...booking, ...patch } : booking)));
  };

  const createBooking = (input: NewBookingInput) => {
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
      treatmentId: treatment.id,
      therapists,
      bookings,
      onlyId,
    });
    if (areaError) return { ok: false as const, message: areaError };
    const matches = eligibleTherapists({
      therapists,
      bookings,
      treatmentId: treatment.id,
      mode: input.mode,
      city: input.city,
      date: input.date,
      time: input.time,
      onlyId,
    });
    const therapist = matches[0];
    if (!therapist) return { ok: false as const, message: 'No verified therapist is free for that slot.' };
    const payment = validatePayment(input);
    if (!payment.ok) return { ok: false as const, message: payment.message };
    const full = input.payFull || prices.balance === 0;
    const booking: Booking = {
      id: `b_${Date.now().toString(36)}`,
      customerId: customer.id,
      customerName: customer.name.trim() || 'Customer',
      therapistId: therapist.id,
      treatmentId: treatment.id,
      mode: input.mode,
      city: input.mode === 'clinic' ? (therapist.clinic?.city ?? input.city) : input.city,
      address: input.mode === 'clinic' ? (therapist.clinic?.address ?? input.address) : input.address,
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
      paymentRef: makeRef(),
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
    setBookings((list) => [booking, ...list]);
    return { ok: true as const, booking };
  };

  const payBalance = (id: string): Result => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status === 'cancelled') return { ok: false, message: 'This visit was cancelled.' };
    if (current.paymentStatus !== 'reserved') return { ok: false, message: 'This visit has no balance due.' };
    replaceBooking(id, {
      paymentStatus: 'paid',
      amountPaid: current.serviceTotal,
      balanceMethod: current.payMethod,
    });
    return { ok: true, message: 'Balance paid.' };
  };

  const acceptBooking = (id: string): Result => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status !== 'assigned') return { ok: false, message: 'This visit is not waiting for acceptance.' };
    replaceBooking(id, {
      status: 'confirmed',
      paymentStatus: 'paid',
      balanceMethod: current.payMethod,
    });
    return { ok: true, message: 'Payment accepted and booking confirmed.' };
  };

  const declineBooking = (id: string): Result => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status !== 'assigned') return { ok: false, message: 'This visit can no longer be declined.' };
    replaceBooking(id, {
      status: 'cancelled',
      paymentStatus: 'refunded',
      amountPaid: 0,
      cancelNote: 'The therapist declined this visit. The reservation is marked for refund.',
    });
    return { ok: true, message: 'Visit declined and the reservation is marked for refund.' };
  };

  const advanceBooking = (id: string): Result => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status === 'confirmed' && current.mode === 'home') {
      replaceBooking(id, { status: 'en_route' });
      return { ok: true };
    }
    if ((current.status === 'confirmed' && current.mode === 'clinic') || current.status === 'en_route') {
      replaceBooking(id, { status: 'arrived' });
      return { ok: true };
    }
    return { ok: false, message: 'This visit cannot be moved forward yet.' };
  };

  const checkIn = (id: string, code: string): Result => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status !== 'arrived') return { ok: false, message: 'Check-in opens when the therapist marks arrival.' };
    if (current.checkInLocked) return { ok: false, message: 'Check-in is locked after five wrong codes.' };
    if (current.checkInCode !== code.trim()) {
      const attempts = current.checkInAttempts + 1;
      const locked = attempts >= MAX_CHECKIN_ATTEMPTS;
      replaceBooking(id, { checkInAttempts: attempts, checkInLocked: locked });
      if (locked) return { ok: false, message: 'Check-in is locked after five wrong codes.' };
      const left = MAX_CHECKIN_ATTEMPTS - attempts;
      return { ok: false, message: `That code does not match. ${left} ${left === 1 ? 'try' : 'tries'} left.` };
    }
    replaceBooking(id, { status: 'in_session', startedAt: new Date().toISOString() });
    return { ok: true };
  };

  const unlockCheckIn = (id: string) => {
    replaceBooking(id, { checkInLocked: false, checkInAttempts: 0 });
  };

  const completeBooking = (id: string): Result => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status !== 'in_session') return { ok: false, message: 'Start the session with the check-in code first.' };
    if (current.paymentStatus === 'reserved') {
      return { ok: false, message: 'Collect the remaining balance before completing the session.' };
    }
    replaceBooking(id, { status: 'completed', completedAt: new Date().toISOString() });
    return { ok: true };
  };

  const cancelBooking = (id: string): Result => {
    const current = bookings.find((booking) => booking.id === id);
    if (!current) return { ok: false, message: 'Visit not found.' };
    if (current.status !== 'assigned' && current.status !== 'confirmed') {
      return { ok: false, message: 'This visit can no longer be cancelled in the app.' };
    }
    const keepFee = hoursUntil(current) < CANCEL_WINDOW_HOURS;
    replaceBooking(id, {
      status: 'cancelled',
      paymentStatus: keepFee ? 'forfeited' : 'refunded',
      amountPaid: keepFee ? current.reservationFee : 0,
      cancelNote: keepFee
        ? 'Cancelled inside 3 hours of the start time. The reservation fee is kept and any extra amount paid is refunded.'
        : 'Cancelled with more than 3 hours to spare. Everything paid is refunded.',
    });
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
    clearDirectory().catch(() => undefined);
    setCustomer(seedCustomer());
    setTherapists([]);
    setActiveTherapistId(null);
    setBookings(seedBookings());
    setRole(null);
  };

  return (
    <AppContext.Provider
      value={{
        ready,
        role,
        customer,
        therapists,
        bookings,
        activeTherapist,
        setRole,
        updateCustomer,
        registerTherapist,
        signInTherapist,
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
