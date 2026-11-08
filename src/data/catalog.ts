import type { Clinic, Treatment } from '@/types/domain';

export const CITY_NAME = 'Iligan City';

export const CLINIC: Clinic = {
  name: 'Hilotcare',
  address: '12 Andres Bonifacio Avenue',
  city: 'Poblacion',
};

export const BARANGAYS = [
  'Abuno',
  'Acmac (Mariano Badelles Sr.)',
  'Bagong Silang',
  'Bonbonon',
  'Bunawan',
  'Buru-un',
  'Dalipuga',
  'Del Carmen',
  'Digkilaan',
  'Ditucalan',
  'Dulag',
  'Hinaplanon',
  'Hindang',
  'Kabacsanan',
  'Kalilangan',
  'Kiwalan',
  'Lanipao',
  'Luinab',
  'Mahayahay',
  'Mainit',
  'Mandulog',
  'Maria Cristina',
  'Pala-o',
  'Panoroganan',
  'Poblacion',
  'Puga-an',
  'Rogongon',
  'San Miguel',
  'San Roque',
  'Santa Elena (Tominobo Ilaya)',
  'Santa Filomena',
  'Santiago',
  'Santo Rosario',
  'Saray-Tibanga (Saray)',
  'Suarez',
  'Tambacan',
  'Tibanga (Canaway)',
  'Tipanoy',
  'Tomas Cabili (Tominobo Proper)',
  'Tubod',
  'Ubaldo Laya',
  'Upper Hinaplanon',
  'Upper Tominobo',
  'Villa Verde',
] as const;

export const MASTER_SLOTS = ['09:00', '11:00', '13:00', '15:00', '17:00'] as const;

export const ISSUING_BODIES = [
  'TESDA — Hilot Wellness Massage NC II',
  'TESDA — Massage Therapy NC II',
  'PITAHC',
  'DOH',
] as const;

export const TREATMENTS: Treatment[] = [
  {
    id: 'tr_hilot',
    name: 'Traditional Hilot',
    category: 'hilot',
    summary: 'Banana-leaf hilot for muscle fatigue and tight areas.',
    description:
      'A traditional hilot session starts with a hand assessment, then oil and banana leaf work over the areas that feel heavy or tight. It is a wellness service, not a medical treatment.',
    durationOptions: [60],
    hourlyRate: 580,
    packagePrices: { 60: 580 },
    focus: ['Muscle fatigue', 'Tension', 'Back and shoulders'],
    image: require('../../assets/services/traditional_hilot.png'),
  },
  {
    id: 'tr_ventosa',
    name: 'Ventosa Hilot',
    category: 'hilot',
    summary: 'Hilot assessment followed by warm cupping.',
    description:
      'Warm cups follow a hilot assessment, usually along the back and shoulders. Tell the therapist if you bruise easily or have a skin condition.',
    durationOptions: [60],
    hourlyRate: 500,
    packagePrices: { 60: 500 },
    focus: ['Back', 'Shoulders', 'Heaviness'],
    image: require('../../assets/services/ventosa.png'),
  },
  {
    id: 'tr_swedish',
    name: 'Swedish Relaxation',
    category: 'massage',
    summary: 'Long, even strokes for a quieter full-body massage.',
    description:
      'Swedish massage uses gliding strokes and light kneading. Choose this when you want a calmer session rather than deep pressure.',
    durationOptions: [60],
    hourlyRate: 400,
    packagePrices: { 60: 400 },
    focus: ['Relaxation', 'Light tension', 'Sleep'],
    image: require('../../assets/services/swedish.png'),
  },
  {
    id: 'tr_deep',
    name: 'Deep Tissue',
    category: 'massage',
    summary: 'Slower pressure for chronic tight spots.',
    description:
      'Deep tissue stays longer on knots in the neck, back, and legs. Speak up if the pressure is too much.',
    durationOptions: [30, 45],
    hourlyRate: 460,
    packagePrices: { 30: 230, 45: 420 },
    focus: ['Chronic tightness', 'Neck', 'Legs'],
    image: require('../../assets/services/deep.png'),
    caution: 'Skip this with a fresh injury, fever, or pregnancy.',
  },
  {
    id: 'tr_prenatal',
    name: 'Prenatal Comfort',
    category: 'massage',
    summary: 'Side-lying massage after the first trimester.',
    description:
      'A side-lying massage for pregnancy after the first trimester. It is comfort care, not obstetric treatment.',
    durationOptions: [60],
    hourlyRate: 500,
    packagePrices: { 60: 500 },
    focus: ['Lower back', 'Hips', 'Legs'],
    image: require('../../assets/services/prenatal.png'),
    caution: 'Write how many weeks you are in the visit note.',
  },
  {
    id: 'tr_combo',
    name: 'Hilot and Massage',
    category: 'combo',
    summary: 'Hilot assessment first, then massage where you need it.',
    description:
      'The therapist begins with hilot, then spends the rest of the time on massage. Useful when you want both traditions in one visit.',
    durationOptions: [80],
    hourlyRate: 540,
    packagePrices: { 80: 720 },
    focus: ['Assessment', 'Targeted relief', 'Full body'],
    image: require('../../assets/services/combo.png'),
  },
  {
    id: 'tr_foot',
    name: 'Foot Hilot',
    category: 'hilot',
    summary: 'A shorter hilot for the feet and lower legs.',
    description:
      'Foot hilot stays below the knees. Choose it when you do not want a full-body session.',
    durationOptions: [30],
    hourlyRate: 500,
    packagePrices: { 30: 250 },
    focus: ['Feet', 'Lower legs', 'Short visit'],
    image: require('../../assets/services/foot.png'),
  },
  {
    id: 'tr_sports',
    name: 'Sports Recovery',
    category: 'massage',
    summary: 'Massage aimed at legs, hips, and shoulders after training.',
    description:
      'Sports recovery focuses on the muscles you train. It does not replace a clinician if you are injured.',
    durationOptions: [45, 60],
    hourlyRate: 500,
    packagePrices: { 45: 420, 60: 500 },
    focus: ['Legs', 'Hips', 'Shoulders'],
    image: require('../../assets/services/sports.png'),
    caution: 'Skip this the day after a sprain, or if you have a fever.',
  },
];

let treatmentOverride: Treatment[] | null = null;
let barangayOverride: string[] | null = null;

export function setLiveCatalog(input: { treatments?: Treatment[] | null; barangays?: string[] | null }) {
  if (input.treatments && input.treatments.length > 0) treatmentOverride = input.treatments;
  if (input.barangays && input.barangays.length > 0) barangayOverride = input.barangays;
}

export function activeTreatments() {
  return (treatmentOverride ?? TREATMENTS).filter((treatment) => treatment.active !== false);
}

export function activeBarangays() {
  return barangayOverride ?? [...BARANGAYS];
}

export function treatmentImage(id: string) {
  return TREATMENTS.find((treatment) => treatment.id === id)?.image ?? TREATMENTS[0].image;
}

export function getTreatment(id: string) {
  return activeTreatments().find((treatment) => treatment.id === id) ?? null;
}

export function canonicalBarangay(input: string) {
  const trimmed = input.trim();
  return activeBarangays().find((barangay) => barangay.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
}

export function isCoveredBarangay(barangay: string) {
  return activeBarangays().some((item) => item.toLowerCase() === barangay.trim().toLowerCase());
}

export function asBarangay(value: string, fallback = 'Poblacion') {
  return isCoveredBarangay(value) ? canonicalBarangay(value) : fallback;
}
