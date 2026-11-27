export type ThermalMaterialMode = 'graphene' | 'silicon';

export interface PhysicsSimParams {
  ribbonWidthNm: number; // Quantum confinement GNR width W (2.0 - 12.0 nm)
  gateVoltageV: number; // Gate drive voltage Vg (0.2 - 1.2 V)
  ambientTempK: number; // Ambient temperature (77 - 360 K)
  clockThz: number; // Operating frequency (0.5 - 5.0 THz)
  activePoresTrillions: number; // Active hexagonal computational cavities (0.5 - 3.0 T)
  thermalMaterial: ThermalMaterialMode; // Graphene (5000 W/mK) vs Silicon (148 W/mK)
  utilizationPct: number; // Active compute duty cycle (10 - 100 %)
}

export interface DispersionPoint {
  kNmInv: number;
  conductionEv: number;
  valenceEv: number;
  pristineConductionEv: number;
  pristineValenceEv: number;
}

export interface TransportTempPoint {
  tempK: number;
  log10OnOff: number;
  mobilityCm2Vs: number;
}

export interface PhysicsMetricsSnapshot {
  bandgapEv: number;
  onOffRatioExp: number;
  onOffRatio: number;
  mobilityCm2Vs: number;
  meanFreePathUm: number;
  dynamicPowerWatts: number;
  leakagePowerWatts: number;
  totalPowerWatts: number;
  throughputTops: number;
  energyPerMacFj: number;
  peakTempK: number;
  peakTempC: number;
  avgTempK: number;
  thermalNoiseMv: number;
  snrDb: number;
  statusLevel: 'nominal' | 'warning' | 'critical';
  statusLabelAr: string;
}

export interface MatrixInferenceResult {
  idealOutputs: number[];
  physicalOutputs: number[];
  rmsErrorPct: number;
  snrDb: number;
}

const HBAR_EV_S = 6.582119569e-16; // Reduced Planck constant in eV*s
const V_FERMI_M_S = 1.0e6; // Graphene Fermi velocity ~10^6 m/s
const KB_EV_K = 8.617333262e-5; // Boltzmann constant in eV/K
const HBAR_VF_EV_NM = HBAR_EV_S * V_FERMI_M_S * 1e9; // ~0.6582 eV*nm

export const THERMAL_GRID_COLS = 16;
export const THERMAL_GRID_ROWS = 8;

export function computeBandgapEv(ribbonWidthNm: number): number {
  const w = Math.max(1.5, Math.min(20, ribbonWidthNm));
  // Armchair GNR effective confinement gap E_g ~ 1.38 eV*nm / W
  return Number((1.38 / w).toFixed(3));
}

export function computeOnOffRatio(bandgapEv: number, tempK: number, ribbonWidthNm: number): number {
  const safeT = Math.max(50, tempK);
  // Thermionic limit exp(Eg / 2 kB T) capped by edge-tunneling leakage for sub-3nm ribbons
  const thermionicExp = bandgapEv / (2 * KB_EV_K * safeT);
  const tunnelingPenalty = ribbonWidthNm < 2.6 ? (2.6 - ribbonWidthNm) * 1.4 : 0;
  const effectiveLnRatio = Math.max(0.5, Math.min(18.5, thermionicExp - tunnelingPenalty));
  return Math.exp(effectiveLnRatio);
}

export function computeCarrierMobility(tempK: number, ribbonWidthNm: number): number {
  // Acoustic + optical phonon scattering reduces mobility as T rises; edge roughness reduces mobility in very narrow ribbons
  const tempFactor = Math.pow(300 / Math.max(77, tempK), 1.25);
  const edgeFactor = Math.min(1, ribbonWidthNm / 6.0);
  const mobility = 180000 * tempFactor * (0.25 + 0.75 * edgeFactor);
  return Math.round(Math.max(1200, Math.min(450000, mobility)));
}

export function generateDispersionCurve(bandgapEv: number): DispersionPoint[] {
  const points: DispersionPoint[] = [];
  const halfGap = bandgapEv / 2;
  for (let i = -24; i <= 24; i++) {
    const k = Number((i * 0.05).toFixed(2)); // -1.2 to +1.2 nm^-1
    const diracTerm = HBAR_VF_EV_NM * Math.abs(k);
    const eMassive = Math.sqrt(diracTerm * diracTerm + halfGap * halfGap);
    points.push({
      kNmInv: k,
      conductionEv: Number(eMassive.toFixed(4)),
      valenceEv: Number((-eMassive).toFixed(4)),
      pristineConductionEv: Number(diracTerm.toFixed(4)),
      pristineValenceEv: Number((-diracTerm).toFixed(4)),
    });
  }
  return points;
}

export function generateTransportCurve(bandgapEv: number, ribbonWidthNm: number): TransportTempPoint[] {
  const points: TransportTempPoint[] = [];
  for (let t = 80; t <= 400; t += 20) {
    const ratio = computeOnOffRatio(bandgapEv, t, ribbonWidthNm);
    const mobility = computeCarrierMobility(t, ribbonWidthNm);
    points.push({
      tempK: t,
      log10OnOff: Number(Math.log10(ratio).toFixed(2)),
      mobilityCm2Vs: mobility,
    });
  }
  return points;
}

export function createInitialThermalGrid(ambientTempK: number): number[] {
  return new Array(THERMAL_GRID_COLS * THERMAL_GRID_ROWS).fill(ambientTempK);
}

/**
 * Explicit 2D Finite-Difference step solving Fourier heat equation on the 18mm x 55mm die:
 * dT/dt = alpha * (d2T/dx2 + d2T/dy2) + q_gen - h_conv * (T - T_amb)
 */
export function stepThermalGrid(
  grid: number[],
  params: PhysicsSimParams,
  totalPowerWatts: number,
  steps = 1
): number[] {
  let current = [...grid];
  const kappa = params.thermalMaterial === 'graphene' ? 5000 : 148;
  // Normalize lateral diffusion coefficient (clamped <= 0.22 for explicit 2D numerical stability)
  const diffAlpha = params.thermalMaterial === 'graphene' ? 0.21 : 0.018;
  // Convective heat removal to packaging/heatsink
  const hConv = params.thermalMaterial === 'graphene' ? 0.14 : 0.055;
  const utilization = Math.max(0.05, params.utilizationPct / 100);
  // Base heat generation per cell scaled by power density
  const baseHeatSource = (totalPowerWatts / (THERMAL_GRID_COLS * THERMAL_GRID_ROWS)) * (kappa === 5000 ? 0.55 : 0.95);

  for (let s = 0; s < steps; s++) {
    const next = new Array(current.length);
    for (let r = 0; r < THERMAL_GRID_ROWS; r++) {
      for (let c = 0; c < THERMAL_GRID_COLS; c++) {
        const idx = r * THERMAL_GRID_COLS + c;
        const centerT = current[idx];

        // Insulated / symmetric boundary neighbors
        const leftT = c > 0 ? current[idx - 1] : params.ambientTempK;
        const rightT = c < THERMAL_GRID_COLS - 1 ? current[idx + 1] : params.ambientTempK;
        const upT = r > 0 ? current[idx - THERMAL_GRID_COLS] : params.ambientTempK;
        const downT = r < THERMAL_GRID_ROWS - 1 ? current[idx + THERMAL_GRID_COLS] : params.ambientTempK;

        const laplacian = leftT + rightT + upT + downT - 4 * centerT;

        // Spatial AI tensor core hotspot near center-left & center-right clusters
        const nx = (c + 0.5) / THERMAL_GRID_COLS - 0.5;
        const ny = (r + 0.5) / THERMAL_GRID_ROWS - 0.5;
        const radialProfile = 1 + 1.35 * Math.exp(-(nx * nx * 10 + ny * ny * 14)) * utilization;
        const qGen = baseHeatSource * radialProfile;

        const nextT = centerT + diffAlpha * laplacian + qGen - hConv * (centerT - params.ambientTempK);
        next[idx] = Math.max(params.ambientTempK, Math.min(850, nextT));
      }
    }
    current = next;
  }
  return current;
}

export function evaluatePhysicsMetrics(
  params: PhysicsSimParams,
  thermalGrid: number[]
): PhysicsMetricsSnapshot {
  const bandgapEv = computeBandgapEv(params.ribbonWidthNm);
  const peakTempK = thermalGrid.length > 0 ? Math.max(...thermalGrid) : params.ambientTempK;
  const avgTempK =
    thermalGrid.length > 0
      ? thermalGrid.reduce((acc, v) => acc + v, 0) / thermalGrid.length
      : params.ambientTempK;

  const onOffRatio = computeOnOffRatio(bandgapEv, peakTempK, params.ribbonWidthNm);
  const onOffRatioExp = Number(Math.log10(onOffRatio).toFixed(2));
  const mobilityCm2Vs = computeCarrierMobility(peakTempK, params.ribbonWidthNm);

  // Ballistic mean free path in um (~0.8 um at 300K for pristine-like GNR, scales with mobility)
  const meanFreePathUm = Number(((mobilityCm2Vs / 180000) * 0.85).toFixed(2));

  // Dynamic switching power: P_dyn = C_eff * Vg^2 * f * activity * pores_scale
  const util = params.utilizationPct / 100;
  const dynamicPowerWatts = Number(
    (
      4.8 *
      params.activePoresTrillions *
      Math.pow(params.gateVoltageV / 0.6, 2) *
      (params.clockThz / 2.0) *
      util
    ).toFixed(2)
  );

  // Static leakage power rises sharply when On/Off ratio drops
  const leakageScale = 100 / Math.max(10, Math.pow(10, Math.min(6, onOffRatioExp)));
  const leakagePowerWatts = Number(
    (0.8 * params.activePoresTrillions * params.gateVoltageV * (1 + leakageScale * 8)).toFixed(2)
  );

  const totalPowerWatts = Number((dynamicPowerWatts + leakagePowerWatts).toFixed(2));

  // AI Matrix Throughput in TOPS (trillions of MAC operations/sec)
  const throughputTops = Number(
    (params.activePoresTrillions * 6 * params.clockThz * util * 0.45).toFixed(1)
  );

  // Energy efficiency (fJ per MAC operation) = Watts / (TOPS * 10^12) -> in fJ (10^-15 J)
  const energyPerMacFj =
    throughputTops > 0 ? Number(((totalPowerWatts / throughputTops) * 1000).toFixed(2)) : 0;

  // Johnson-Nyquist thermal noise amplitude in mV over THz bandwidth
  const thermalNoiseMv = Number((0.42 * Math.sqrt(peakTempK / 300) * Math.sqrt(params.clockThz)).toFixed(2));

  // Signal-to-noise ratio (dB) combining thermal noise + off-state leakage floor
  const signalMv = params.gateVoltageV * 1000;
  const leakageFloorMv = signalMv / Math.max(2, onOffRatio);
  const totalNoiseMv = Math.sqrt(thermalNoiseMv * thermalNoiseMv + leakageFloorMv * leakageFloorMv);
  const snrDb = Number((20 * Math.log10(signalMv / Math.max(0.05, totalNoiseMv))).toFixed(1));

  const peakTempC = Number((peakTempK - 273.15).toFixed(1));

  let statusLevel: 'nominal' | 'warning' | 'critical' = 'nominal';
  let statusLabelAr = 'مستقر كمياً وحرارياً';

  if (onOffRatioExp < 2.2 || peakTempK >= 430) {
    statusLevel = 'critical';
    statusLabelAr = peakTempK >= 430 ? 'تجاوز الحد الحراري الآمن' : 'انهيار نسبة التبديل المنطقي';
  } else if (onOffRatioExp < 3.5 || peakTempK >= 375 || snrDb < 26) {
    statusLevel = 'warning';
    statusLabelAr = 'تسرّب تيار / إجهاد حراري متوسط';
  }

  return {
    bandgapEv,
    onOffRatioExp,
    onOffRatio,
    mobilityCm2Vs,
    meanFreePathUm,
    dynamicPowerWatts,
    leakagePowerWatts,
    totalPowerWatts,
    throughputTops,
    energyPerMacFj,
    peakTempK: Number(peakTempK.toFixed(1)),
    peakTempC,
    avgTempK: Number(avgTempK.toFixed(1)),
    thermalNoiseMv,
    snrDb,
    statusLevel,
    statusLabelAr,
  };
}

/**
 * Simulates physical Kirchhoff Current Law matrix-vector multiplication I_i = sum_j G_ij * V_j
 * including finite On/Off leakage conductance and deterministic thermal noise perturbation.
 */
export function simulatePhysicalMatrixInference(
  inputs: number[],
  weights: number[][],
  metrics: PhysicsMetricsSnapshot,
  gateVoltageV: number
): MatrixInferenceResult {
  const rows = weights.length;
  const cols = inputs.length;
  const idealOutputs: number[] = [];
  const physicalOutputs: number[] = [];

  const leakageRatio = 1 / Math.max(5, metrics.onOffRatio);
  const noiseScale = metrics.thermalNoiseMv / Math.max(100, gateVoltageV * 1000);

  let sqErrSum = 0;
  let sqIdealSum = 0;

  for (let i = 0; i < rows; i++) {
    let ideal = 0;
    let phys = 0;
    for (let j = 0; j < cols; j++) {
      const w = weights[i][j] ?? 0;
      const x = inputs[j] ?? 0;
      ideal += w * x;

      // Physical conductance includes off-state residual leakage floor when w is near 0
      const effectiveG = w + (1 - Math.abs(w)) * leakageRatio * 2.5;
      // Deterministic sinusoidal thermal perturbation seeded by cell indices & peakTemp
      const thermalJitter =
        Math.sin((i + 1) * 1.7 + (j + 1) * 2.3 + metrics.peakTempK * 0.13) * noiseScale * 1.6;
      phys += effectiveG * x + thermalJitter;
    }

    const idealRounded = Number(ideal.toFixed(3));
    const physRounded = Number(phys.toFixed(3));
    idealOutputs.push(idealRounded);
    physicalOutputs.push(physRounded);

    const diff = phys - ideal;
    sqErrSum += diff * diff;
    sqIdealSum += ideal * ideal;
  }

  const rmsErrorPct =
    sqIdealSum > 1e-6
      ? Number(((Math.sqrt(sqErrSum / rows) / Math.sqrt(sqIdealSum / rows)) * 100).toFixed(2))
      : 0;

  return {
    idealOutputs,
    physicalOutputs,
    rmsErrorPct,
    snrDb: metrics.snrDb,
  };
}
