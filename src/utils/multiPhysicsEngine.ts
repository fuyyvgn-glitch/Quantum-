import {
  createInitialThermalGrid,
  evaluatePhysicsMetrics,
  PhysicsMetricsSnapshot,
  PhysicsSimParams,
  simulatePhysicalMatrixInference,
  stepThermalGrid,
  THERMAL_GRID_COLS,
  THERMAL_GRID_ROWS,
} from './quantumGrapheneSim';

export interface BoltzmannTransportResult {
  carrierDensity1e12Cm2: number;
  fermiEnergyEv: number;
  tauAcousticFs: number;
  tauOpticalFs: number;
  tauEdgeFs: number;
  tauTotalFs: number;
  regimeAr: 'باليستي كمّي' | 'شبه باليستي' | 'انتشاري (تصادمي)';
}

export interface KleinTunnelingPoint {
  energyEv: number;
  gappedTransmission: number;
  pristineKleinTransmission: number;
}

export interface ThzElectrodynamicsResult {
  quantumCapacitanceUfCm2: number;
  kineticInductancePhSq: number;
  plasmonVelocityMs: number;
  propagationDelayPs: number;
  waveform: { tPs: number; vIn: number; vOut: number }[];
}

export interface EntropyAndGradientResult {
  maxGradientKMm: number;
  entropyGenerationMwK: number;
}

export type OptimizationObjective = 'efficiency' | 'accuracy' | 'throughput';

export interface SmartOptimizationResult {
  objective: OptimizationObjective;
  optimalParams: PhysicsSimParams;
  evaluatedStates: number;
  beforeMetrics: PhysicsMetricsSnapshot;
  afterMetrics: PhysicsMetricsSnapshot;
  beforeRmsErrorPct: number;
  afterRmsErrorPct: number;
  rationaleAr: string;
}

const HBAR_EV_S = 6.582119569e-16;
const V_FERMI = 1.0e6; // m/s
const HBAR_VF_EV_NM = HBAR_EV_S * V_FERMI * 1e9; // ~0.6582 eV*nm

export function computeBoltzmannTransport(
  params: PhysicsSimParams,
  metrics: PhysicsMetricsSnapshot
): BoltzmannTransportResult {
  // Gate capacitance ~ 1.4 uF/cm^2 -> induced 2D carrier density n_s (in 10^12 cm^-2)
  const carrierDensity1e12Cm2 = Number(Math.max(0.2, params.gateVoltageV * 8.4).toFixed(2));
  const nMetersSq = carrierDensity1e12Cm2 * 1e16; // 10^12 cm^-2 = 10^16 m^-2
  const fermiEnergyEv = Number((HBAR_VF_EV_NM * Math.sqrt(Math.PI * nMetersSq * 1e-18)).toFixed(3));

  const T = Math.max(77, metrics.peakTempK);
  // Acoustic phonon scattering time ~ inversely proportional to T
  const tauAcousticFs = Number((920 * (300 / T)).toFixed(1));
  // Optical phonon emission (~160 meV graphene optical phonon energy) activates strongly at high T
  const tauOpticalFs = Number((380 * Math.exp(1800 / T) * 0.025).toFixed(1));
  // Edge roughness scattering scales linearly with GNR width W
  const tauEdgeFs = Number((42 * params.ribbonWidthNm).toFixed(1));

  // Matthiessen's rule: 1/tau_total = 1/tau_ac + 1/tau_opt + 1/tau_edge
  const invTotal = 1 / tauAcousticFs + 1 / tauOpticalFs + 1 / tauEdgeFs;
  const tauTotalFs = Number((1 / invTotal).toFixed(1));

  let regimeAr: BoltzmannTransportResult['regimeAr'] = 'شبه باليستي';
  if (metrics.meanFreePathUm >= 0.75) {
    regimeAr = 'باليستي كمّي';
  } else if (metrics.meanFreePathUm < 0.35) {
    regimeAr = 'انتشاري (تصادمي)';
  }

  return {
    carrierDensity1e12Cm2,
    fermiEnergyEv,
    tauAcousticFs,
    tauOpticalFs,
    tauEdgeFs,
    tauTotalFs,
    regimeAr,
  };
}

export function computeKleinTunnelingProfile(
  bandgapEv: number,
  gateVoltageV: number
): { points: KleinTunnelingPoint[]; barrierSuppressionPct: number } {
  const points: KleinTunnelingPoint[] = [];
  const barrierCenterEv = gateVoltageV * 0.35;
  const halfGap = bandgapEv / 2;
  let suppressedSamples = 0;

  for (let i = -24; i <= 24; i++) {
    const energyEv = Number((i * 0.025).toFixed(3));
    const deltaFromBarrier = Math.abs(energyEv - barrierCenterEv);

    // Pristine monolayer graphene exhibits near-unity Klein tunneling at low angles
    const pristineKleinTransmission = Number(
      (0.92 + 0.07 * Math.cos(deltaFromBarrier * 2.5)).toFixed(3)
    );

    // Engineered gapped graphene attenuates transmission exponentially inside |E - V_barrier| < Eg/2
    let gappedTransmission = 0.9;
    if (deltaFromBarrier < halfGap) {
      const depth = (halfGap - deltaFromBarrier) / Math.max(0.05, halfGap);
      gappedTransmission = Math.exp(-5.2 * depth * (bandgapEv / 0.35));
      suppressedSamples++;
    } else {
      const aboveGap = deltaFromBarrier - halfGap;
      gappedTransmission = 0.15 + 0.78 * (1 - Math.exp(-aboveGap * 9));
    }

    points.push({
      energyEv,
      gappedTransmission: Number(Math.max(0.002, Math.min(0.99, gappedTransmission)).toFixed(3)),
      pristineKleinTransmission,
    });
  }

  const barrierSuppressionPct = Number(
    Math.min(99.5, (suppressedSamples / points.length) * 100 + bandgapEv * 75).toFixed(1)
  );

  return { points, barrierSuppressionPct };
}

export function computeThzElectrodynamics(
  params: PhysicsSimParams,
  transport: BoltzmannTransportResult
): ThzElectrodynamicsResult {
  // Graphene quantum capacitance C_Q ~ 2 * e^2 * |E_F| / (pi * (hbar * v_F)^2)
  const quantumCapacitanceUfCm2 = Number(
    Math.max(0.8, 7.6 * transport.fermiEnergyEv).toFixed(2)
  );

  // Kinetic inductance L_K ~ h / (4 * e^2 * v_F * W_channels) -> nH/um scaled to pH/sq
  const kineticInductancePhSq = Number(
    Math.max(12, 118 / (params.ribbonWidthNm * Math.max(0.25, transport.fermiEnergyEv))).toFixed(1)
  );

  // Plasmonic wave velocity v_p ~ v_F * sqrt(alpha_ee * E_F / ...) -> ~ 1.4 - 3.2 * 10^6 m/s
  const plasmonVelocityMs = Math.round(
    V_FERMI * (1.2 + 1.6 * Math.min(1, transport.fermiEnergyEv / 0.4))
  );

  // Local hexagonal cluster delay across 500um interconnect tile
  const rcFactor = (quantumCapacitanceUfCm2 * kineticInductancePhSq) / 100;
  const propagationDelayPs = Number(
    (0.35 + rcFactor * 0.42 + (300 / Math.max(50, transport.tauTotalFs)) * 0.25).toFixed(2)
  );

  // Sample 1.5 ps THz waveform (V_in vs attenuated & phase-delayed V_out)
  const omega = 2 * Math.PI * params.clockThz; // rad / ps
  const attenuation = Math.exp(-0.08 * params.clockThz * (180 / Math.max(40, transport.tauTotalFs)));
  const phaseLag = propagationDelayPs * omega * 0.15;

  const waveform: { tPs: number; vIn: number; vOut: number }[] = [];
  for (let s = 0; s <= 36; s++) {
    const tPs = Number((s * 0.04).toFixed(2));
    const vIn = Number((params.gateVoltageV * Math.sin(omega * tPs)).toFixed(3));
    const vOut = Number((params.gateVoltageV * attenuation * Math.sin(omega * tPs - phaseLag)).toFixed(3));
    waveform.push({ tPs, vIn, vOut });
  }

  return {
    quantumCapacitanceUfCm2,
    kineticInductancePhSq,
    plasmonVelocityMs,
    propagationDelayPs,
    waveform,
  };
}

export function computeEntropyAndGradient(
  thermalGrid: number[],
  params: PhysicsSimParams
): EntropyAndGradientResult {
  const dxMm = 55 / THERMAL_GRID_COLS;
  const dyMm = 18 / THERMAL_GRID_ROWS;
  const kappa = params.thermalMaterial === 'graphene' ? 5000 : 148;
  const thicknessM = 1e-6; // 1 um effective thermal spreader stack

  let maxGrad = 0;
  let entropySumWK = 0;

  for (let r = 0; r < THERMAL_GRID_ROWS; r++) {
    for (let c = 0; c < THERMAL_GRID_COLS; c++) {
      const idx = r * THERMAL_GRID_COLS + c;
      const tCenter = thermalGrid[idx] ?? params.ambientTempK;
      const tRight = c < THERMAL_GRID_COLS - 1 ? thermalGrid[idx + 1] : tCenter;
      const tDown = r < THERMAL_GRID_ROWS - 1 ? thermalGrid[idx + THERMAL_GRID_COLS] : tCenter;

      const dTdx = (tRight - tCenter) / dxMm; // K / mm
      const dTdy = (tDown - tCenter) / dyMm; // K / mm
      const gradMag = Math.sqrt(dTdx * dTdx + dTdy * dTdy);
      if (gradMag > maxGrad) maxGrad = gradMag;

      // Local entropy generation dS/dt = kappa * |grad T|^2 / T^2 * dV
      const gradPerM = gradMag * 1000;
      const cellAreaM2 = (dxMm * 1e-3) * (dyMm * 1e-3);
      entropySumWK += (kappa * gradPerM * gradPerM * cellAreaM2 * thicknessM) / (tCenter * tCenter);
    }
  }

  return {
    maxGradientKMm: Number(maxGrad.toFixed(2)),
    entropyGenerationMwK: Number((entropySumWK * 1000).toFixed(3)),
  };
}

const EVAL_INPUTS = [0.85, 0.25, 0.9, 0.4];
const EVAL_WEIGHTS = [
  [0.9, 0.1, 0.4, 0.0],
  [0.2, 0.8, 0.1, 0.5],
  [0.5, 0.0, 0.9, 0.3],
  [0.1, 0.6, 0.2, 0.7],
];

/**
 * Deterministic multi-objective coupled-physics optimizer that searches across
 * (W, V_g, T_amb, clockThz) subject to quantum switching and thermal stability bounds.
 */
export function runSmartPhysicsOptimizer(
  currentParams: PhysicsSimParams,
  objective: OptimizationObjective
): SmartOptimizationResult {
  const beforeGrid = stepThermalGrid(
    createInitialThermalGrid(currentParams.ambientTempK),
    currentParams,
    20,
    30
  );
  const beforeMetrics = evaluatePhysicsMetrics(currentParams, beforeGrid);
  const beforeMatrix = simulatePhysicalMatrixInference(
    EVAL_INPUTS,
    EVAL_WEIGHTS,
    beforeMetrics,
    currentParams.gateVoltageV
  );

  const widthCandidates = [2.2, 2.6, 3.0, 3.4, 4.0];
  const vgCandidates = [0.4, 0.55, 0.7, 0.85, 1.0];
  const tempCandidates = [180, 250, 300];
  const clockCandidates = [1.0, 2.0, 3.0, 4.0, 4.5];

  let bestParams: PhysicsSimParams = { ...currentParams };
  let bestScore = -Infinity;
  let bestMetrics = beforeMetrics;
  let bestRms = beforeMatrix.rmsErrorPct;
  let evaluatedStates = 0;

  for (const w of widthCandidates) {
    for (const vg of vgCandidates) {
      for (const tamb of tempCandidates) {
        for (const f of clockCandidates) {
          evaluatedStates++;
          const cand: PhysicsSimParams = {
            ...currentParams,
            ribbonWidthNm: w,
            gateVoltageV: vg,
            ambientTempK: tamb,
            clockThz: f,
            thermalMaterial: 'graphene',
          };
          const approxPower = 4.8 * cand.activePoresTrillions * Math.pow(vg / 0.6, 2) * (f / 2.0) * (cand.utilizationPct / 100);
          const grid = stepThermalGrid(createInitialThermalGrid(tamb), cand, approxPower, 25);
          const m = evaluatePhysicsMetrics(cand, grid);
          const mat = simulatePhysicalMatrixInference(EVAL_INPUTS, EVAL_WEIGHTS, m, vg);

          // Enforce quantum switching and thermal safety invariants
          if (m.onOffRatioExp < 3.6 || m.peakTempK > 375) {
            continue;
          }

          let score = 0;
          if (objective === 'efficiency') {
            // Minimize energy/MAC while keeping decent throughput & accuracy
            score = 10000 / Math.max(10, m.energyPerMacFj) + m.onOffRatioExp * 2 - mat.rmsErrorPct * 2;
          } else if (objective === 'accuracy') {
            // Maximize SNR & On/Off ratio, minimize RMS inference error
            score = m.snrDb * 3 - mat.rmsErrorPct * 25 + m.onOffRatioExp * 4;
          } else {
            // Maximize TOPS throughput within thermal & switching envelope
            score = m.throughputTops * 4 - (m.peakTempK - 280) * 0.4 + m.onOffRatioExp * 2;
          }

          if (score > bestScore) {
            bestScore = score;
            bestParams = cand;
            bestMetrics = m;
            bestRms = mat.rmsErrorPct;
          }
        }
      }
    }
  }

  let rationaleAr = '';
  if (objective === 'efficiency') {
    rationaleAr = `تم خفض جهد البوابة إلى ${bestParams.gateVoltageV}V وضبط عرض الشريط على ${bestParams.ribbonWidthNm}nm لتحقيق أقل طاقة لكل عملية (${bestMetrics.energyPerMacFj} fJ/OP) مع بقاء نسبة التبديل فوق 10^${bestMetrics.onOffRatioExp}.`;
  } else if (objective === 'accuracy') {
    rationaleAr = `تم تقييد الشريط إلى ${bestParams.ribbonWidthNm}nm وتبريد الوسط إلى ${bestParams.ambientTempK}K مع رفع الجهد إلى ${bestParams.gateVoltageV}V لخفض ضوضاء جونسون وخطأ المصفوفة إلى ${bestRms}%.`;
  } else {
    rationaleAr = `تم رفع التردد إلى ${bestParams.clockThz}THz مع الحفاظ على الموصلية الحرارية للغرافين، ما رفع القدرة الحوسبية إلى ${bestMetrics.throughputTops} TOPS دون تجاوز الحد الحراري الآمن.`;
  }

  return {
    objective,
    optimalParams: bestParams,
    evaluatedStates,
    beforeMetrics,
    afterMetrics: bestMetrics,
    beforeRmsErrorPct: beforeMatrix.rmsErrorPct,
    afterRmsErrorPct: bestRms,
    rationaleAr,
  };
}
