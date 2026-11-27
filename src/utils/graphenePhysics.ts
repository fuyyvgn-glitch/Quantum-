export type BandgapMode = 'gnr' | 'bilayer' | 'superlattice';
export type MaterialId = 'graphene' | 'graphite' | 'c60' | 'silicon';

export interface ChipSimulatorConfig {
  areaCm2: number; // Finger-sized chip area in cm^2 (2 - 15)
  bandgapMode: BandgapMode;
  clockThz: number; // Operating frequency in THz (0.5 - 5.0)
  parallelFactor: number; // Logical routing multiplier per hex cavity (2 - 8)
}

export interface ChipTelemetryResult {
  activePoresTrillions: number;
  equivalentServersTrillions: number;
  rawAtomicRingsTrillions: number;
  bandgapEv: number;
  onOffRatioExp: number;
  thermalLoadWatts: number;
  thermalHeadroomPct: number;
  estimatedDieCostUsd: number;
  dimensionsMm: { width: number; length: number };
  feasibilityLabel: string;
}

export interface BandgapSpec {
  id: BandgapMode;
  nameAr: string;
  mechanismAr: string;
  bandgapEv: number;
  onOffRatioExp: number;
  densityFactor: number;
  powerFactor: number;
}

export const BANDGAP_SPECS: Record<BandgapMode, BandgapSpec> = {
  gnr: {
    id: 'gnr',
    nameAr: 'أشرطة الغرافين النانوية (GNR)',
    mechanismAr: 'تقييد كمي لحواف الكربون دون إضافة عناصر غريبة',
    bandgapEv: 0.45,
    onOffRatioExp: 5,
    densityFactor: 1.0,
    powerFactor: 0.85,
  },
  bilayer: {
    id: 'bilayer',
    nameAr: 'غرافين ثنائي الطبقة متحكم به',
    mechanismAr: 'فتح فجوة طاقة متغيرة عبر مجال كهربائي عمودي بين طبقتين',
    bandgapEv: 0.25,
    onOffRatioExp: 4,
    densityFactor: 1.15,
    powerFactor: 1.0,
  },
  superlattice: {
    id: 'superlattice',
    nameAr: 'شبيكة فائقة سداسية (Moiré)',
    mechanismAr: 'تدوير زاوية الطبقة لخلق حالات حوسبة تناظرية متوازية',
    bandgapEv: 0.18,
    onOffRatioExp: 3,
    densityFactor: 1.35,
    powerFactor: 1.2,
  },
};

export interface MaterialProfile {
  id: MaterialId;
  nameAr: string;
  formula: string;
  structureAr: string;
  thermalConductivityWmK: number;
  electronMobilityCm2Vs: number;
  rawCostPerKgUsd: number;
  bandgapText: string;
  summaryAr: string;
  limitationOrAdvantageAr: string;
  // Normalized scores (0 - 100) for radar comparison
  scores: {
    conductivity: number;
    thermal: number;
    density: number;
    abundanceCost: number;
    logicControl: number;
    scalability: number;
  };
}

export const MATERIAL_PROFILES: MaterialProfile[] = [
  {
    id: 'graphene',
    nameAr: 'الغرافين أحادي الطبقة',
    formula: 'C (2D sp²)',
    structureAr: 'شبكة سداسية بسمك ذرة واحدة',
    thermalConductivityWmK: 5000,
    electronMobilityCm2Vs: 200000,
    rawCostPerKgUsd: 12,
    bandgapText: '0.0 -> 0.45 eV (هندسياً)',
    summaryAr:
      'يوفر أعلى مساحة سطحية فعالة وأعلى موصلية حرارية وكهربائية معروفة مع توفر الكربون بكلفة منخفضة جداً.',
    limitationOrAdvantageAr:
      'التحدي الأساسي: الغرافين النقي شبه معدن ويحتاج لهندسة الحواف أو الطبقات الثنائية لفتح فجوة منطقية.',
    scores: {
      conductivity: 98,
      thermal: 99,
      density: 96,
      abundanceCost: 95,
      logicControl: 68,
      scalability: 78,
    },
  },
  {
    id: 'graphite',
    nameAr: 'الغرافيت ثلاثي الأبعاد',
    formula: 'C (3D Layered)',
    structureAr: 'طبقات كربون متكدسة بقوى فان دير فالس',
    thermalConductivityWmK: 400,
    electronMobilityCm2Vs: 15000,
    rawCostPerKgUsd: 2,
    bandgapText: '0.0 eV (معدني التراكب)',
    summaryAr:
      'مادة أولية رخيصة لاستخراج الغرافين، لكن تكدس الطبقات يشتت الإلكترونات ويمنع العزل المنطقي الدقيق.',
    limitationOrAdvantageAr:
      'غير مناسب كبنية شريحة حسابية مباشرة بسبب التداخل بين الطبقات وفقدان الخصائص الكمية ثنائية الأبعاد.',
    scores: {
      conductivity: 62,
      thermal: 55,
      density: 42,
      abundanceCost: 98,
      logicControl: 22,
      scalability: 40,
    },
  },
  {
    id: 'c60',
    nameAr: 'فوليرين C60 الكروي',
    formula: 'C₆₀ (0D Cage)',
    structureAr: 'جزيئات كربون كروية منفصلة (60 ذرة)',
    thermalConductivityWmK: 0.4,
    electronMobilityCm2Vs: 5,
    rawCostPerKgUsd: 1800,
    bandgapText: '1.70 eV (ثابت)',
    summaryAr:
      'يمتلك فجوة طاقة طبيعية لكنه يعاني من ضعف التوصيل بين الجزيئات وارتفاع تكلفة التنقية والترسيب.',
    limitationOrAdvantageAr:
      'القفز الإلكتروني بين الكرات بطيء جداً وموصليته الحرارية متدنية، ما يجعله غير عملي لمعالجات AI.',
    scores: {
      conductivity: 24,
      thermal: 12,
      density: 58,
      abundanceCost: 28,
      logicControl: 60,
      scalability: 35,
    },
  },
  {
    id: 'silicon',
    nameAr: 'السيليكون التقليدي (3nm)',
    formula: 'Si (Diamond Cubic)',
    structureAr: 'بلورة سيليكون ثلاثية الأبعاد مع تطعيم',
    thermalConductivityWmK: 148,
    electronMobilityCm2Vs: 1400,
    rawCostPerKgUsd: 350,
    bandgapText: '1.12 eV (قياسي)',
    summaryAr:
      'الأساس الصناعي الحالي لرقائق الذكاء الاصطناعي بفضل موثوقية الترانزستور ونضج الطباعة الضوئية EUV.',
    limitationOrAdvantageAr:
      'يقترب من حدود التسخين النانوي والأنفاق الكمية عند أبعاد أقل من 2 نانومتر مع تكلفة مصانع باهظة.',
    scores: {
      conductivity: 48,
      thermal: 36,
      density: 74,
      abundanceCost: 45,
      logicControl: 98,
      scalability: 92,
    },
  },
];

/**
 * Computes physically grounded scaling metrics for a finger-sized pure-graphene AI chip.
 * Baseline 10 cm^2 (~18mm x 55mm) with GNR mode & 6x routing gives ~2.0T patterned hex cells
 * and ~12.0T equivalent virtual server/neuron routing nodes.
 */
export function calculateChipTelemetry(config: ChipSimulatorConfig): ChipTelemetryResult {
  const area = Math.min(15, Math.max(2, config.areaCm2));
  const clock = Math.min(5, Math.max(0.5, config.clockThz));
  const parallel = Math.min(8, Math.max(2, config.parallelFactor));
  const spec = BANDGAP_SPECS[config.bandgapMode];

  // Physical graphene density: ~1.91e15 atomic hex rings per cm^2 = 1,910 trillion rings / cm^2
  const rawAtomicRingsTrillions = Number((area * 1910).toFixed(0));

  // Patterned computational hexagonal cavities (0.2 trillion per cm^2 at 1x density -> 2.0T at 10 cm^2)
  const activePoresTrillions = Number((area * 0.2 * spec.densityFactor).toFixed(2));
  const equivalentServersTrillions = Number((activePoresTrillions * parallel).toFixed(2));

  // Thermal dissipation based on clock frequency and graphene's ~5000 W/mK lateral conductivity
  const thermalLoadWatts = Number(
    (area * 2.4 * Math.pow(clock / 2.0, 1.35) * spec.powerFactor).toFixed(1)
  );
  // Maximum passive thermal capacity of monolayer/bilayer graphene spreader (~180W for 10 cm^2)
  const maxSafeWatts = area * 18;
  const thermalHeadroomPct = Math.max(
    0,
    Math.min(99, Math.round(((maxSafeWatts - thermalLoadWatts) / maxSafeWatts) * 100))
  );

  // Material + lithography wafer share cost (carbon feedstock is negligible; patterning dominates)
  const estimatedDieCostUsd = Number((3.8 + area * 0.95 + (spec.onOffRatioExp - 3) * 1.4).toFixed(2));

  // Aspect ratio ~1 : 3.05 (finger-sized rectangle)
  const width = Number(Math.sqrt((area * 100) / 3.05).toFixed(1));
  const length = Number(((area * 100) / width).toFixed(1));

  let feasibilityLabel = 'متوازن للإنتاج التجريبي';
  if (spec.onOffRatioExp < 4) {
    feasibilityLabel = 'مناسب للمصفوفات التناظرية (تسرّب تيار أعلى)';
  } else if (thermalHeadroomPct < 35) {
    feasibilityLabel = 'ضغط حراري مرتفع عند هذا التردد';
  }

  return {
    activePoresTrillions,
    equivalentServersTrillions,
    rawAtomicRingsTrillions,
    bandgapEv: spec.bandgapEv,
    onOffRatioExp: spec.onOffRatioExp,
    thermalLoadWatts,
    thermalHeadroomPct,
    estimatedDieCostUsd,
    dimensionsMm: { width, length },
    feasibilityLabel,
  };
}

export interface InquiryFormInput {
  name: string;
  email: string;
  organization: string;
  focus: string;
}

export interface InquiryValidationErrors {
  name?: string;
  email?: string;
  organization?: string;
}

export function validateInquiryForm(input: InquiryFormInput): {
  valid: boolean;
  errors: InquiryValidationErrors;
} {
  const errors: InquiryValidationErrors = {};
  if (!input.name.trim() || input.name.trim().length < 2) {
    errors.name = 'يرجى إدخال الاسم الكامل (حرفان على الأقل).';
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.email.trim() || !emailPattern.test(input.email.trim())) {
    errors.email = 'يرجى إدخال بريد إلكتروني صحيح.';
  }
  if (!input.organization.trim() || input.organization.trim().length < 2) {
    errors.organization = 'يرجى تحديد الجهة أو التخصص البحثي.';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
