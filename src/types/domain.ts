export type Role = 'customer' | 'therapist' | 'admin';

export type PayMethod = 'paypal' | 'gcash' | 'maya' | 'card';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type SessionStatus =
  | 'assigned'
  | 'confirmed'
  | 'en_route'
  | 'arrived'
  | 'in_session'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'reserved' | 'paid' | 'refunded' | 'forfeited';

export type ServiceMode = 'home' | 'clinic';

export type TreatmentCategory = 'hilot' | 'massage' | 'combo';

export type Treatment = {
  id: string;
  name: string;
  category: TreatmentCategory;
  summary: string;
  description: string;
  durationOptions: number[];
  hourlyRate: number;
  packagePrices: Record<number, number>;
  focus: string[];
  caution?: string;
  image: number;
  active?: boolean;
  offersHome?: boolean;
  offersClinic?: boolean;
};

export type Clinic = {
  name: string;
  address: string;
  city: string;
};

export type Therapist = {
  id: string;
  name: string;
  email: string;
  photo: string;
  title: string;
  bio: string;
  years: number;
  rating: number;
  reviewCount: number;
  treatmentIds: string[];
  verification: VerificationStatus;
  verificationNote: string;
  licenseNumber: string;
  issuingBody: string;
  licenseValidUntil: string;
  reviewedAt: string | null;
  offersHome: boolean;
  offersClinic: boolean;
  clinic: Clinic | null;
  travelZones: string[];
  weeklySlots: Record<string, string[]>;
  suspended: boolean;
  validId: string;
  certificate: string;
};

export type Customer = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  photo: string;
  city: string;
  barangay: string;
  address: string;
  suspended: boolean;
};

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
};

export type Complaint = {
  id: string;
  authorId: string;
  authorRole: 'customer' | 'therapist';
  authorName: string;
  againstId: string;
  body: string;
  status: 'open' | 'reviewed';
  createdAt: string;
};

export type Booking = {
  id: string;
  customerId: string;
  customerName: string;
  therapistId: string;
  treatmentId: string;
  mode: ServiceMode;
  city: string;
  barangay: string;
  address: string;
  date: string;
  time: string;
  duration: number;
  serviceTotal: number;
  reservationFee: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  payMethod: PayMethod;
  balanceMethod: PayMethod | null;
  payLast4: string;
  paymentRef: string;
  status: SessionStatus;
  checkInCode: string;
  checkInAttempts: number;
  checkInLocked: boolean;
  notes: string;
  assignedBy: 'customer' | 'auto';
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelNote: string | null;
};

export type PayDraft = {
  treatmentId: string | null;
  duration: number | null;
  mode: ServiceMode;
  city: string;
  otherCity: string;
  address: string;
  date: string | null;
  time: string | null;
  therapistId: string | null;
  preferAuto: boolean;
  notes: string;
  payMethod: PayMethod;
  payFull: boolean;
  wallet: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
};

export type NewBookingInput = {
  treatmentId: string;
  duration: number;
  mode: ServiceMode;
  city: string;
  address: string;
  date: string;
  time: string;
  therapistId: string | null;
  preferAuto: boolean;
  notes: string;
  payMethod: PayMethod;
  payFull: boolean;
  wallet: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  paypalOrderId?: string;
};
