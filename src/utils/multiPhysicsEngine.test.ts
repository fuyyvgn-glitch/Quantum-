import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBoltzmannTransport,
  computeEntropyAndGradient,
  computeKleinTunnelingProfile,
  computeThzElectrodynamics,
  runSmartPhysicsOptimizer,
} from './multiPhysicsEngine';
import {
  createInitialThermalGrid,
  evaluatePhysicsMetrics,
  PhysicsSimParams,
  stepThermalGrid,
} from './quantumGrapheneSim';

const SAMPLE_PARAMS: PhysicsSimParams = {
  ribbonWidthNm: 3.1,
  gateVoltageV: 0.65,
  ambientTempK: 300,
  clockThz: 2.0,
  activePoresTrillions: 2.0,
  thermalMaterial: 'graphene',
  utilizationPct: 75,
};

test('Boltzmann transport computes positive scattering times and Fermi energy', () => {
  const grid = stepThermalGrid(createInitialThermalGrid(300), SAMPLE_PARAMS, 15, 20);
  const metrics = evaluatePhysicsMetrics(SAMPLE_PARAMS, grid);
  const boltzmann = computeBoltzmannTransport(SAMPLE_PARAMS, metrics);

  assert.ok(boltzmann.fermiEnergyEv > 0.1);
  assert.ok(boltzmann.tauTotalFs > 0 && boltzmann.tauTotalFs < boltzmann.tauAcousticFs);
});

test('Klein tunneling shows high pristine transmission and bandgap suppression when Eg > 0', () => {
  const { points, barrierSuppressionPct } = computeKleinTunnelingProfile(0.45, 0.7);
  const minGapped = Math.min(...points.map((p) => p.gappedTransmission));
  const minPristine = Math.min(...points.map((p) => p.pristineKleinTransmission));

  assert.ok(minGapped < 0.05);
  assert.ok(minPristine > 0.8);
  assert.ok(barrierSuppressionPct > 35);
});

test('THz electrodynamics computes quantum capacitance, kinetic inductance, and waveform', () => {
  const grid = stepThermalGrid(createInitialThermalGrid(300), SAMPLE_PARAMS, 15, 20);
  const metrics = evaluatePhysicsMetrics(SAMPLE_PARAMS, grid);
  const boltzmann = computeBoltzmannTransport(SAMPLE_PARAMS, metrics);
  const thz = computeThzElectrodynamics(SAMPLE_PARAMS, boltzmann);

  assert.ok(thz.quantumCapacitanceUfCm2 > 0);
  assert.ok(thz.kineticInductancePhSq > 0);
  assert.equal(thz.waveform.length, 37);
});

test('Entropy generation increases when silicon thermal gradient replaces graphene', () => {
  const gGrid = stepThermalGrid(createInitialThermalGrid(300), SAMPLE_PARAMS, 25, 30);
  const sGrid = stepThermalGrid(
    createInitialThermalGrid(300),
    { ...SAMPLE_PARAMS, thermalMaterial: 'silicon' },
    25,
    30
  );

  const gEnt = computeEntropyAndGradient(gGrid, SAMPLE_PARAMS);
  const sEnt = computeEntropyAndGradient(sGrid, { ...SAMPLE_PARAMS, thermalMaterial: 'silicon' });
  assert.ok(sEnt.maxGradientKMm > gEnt.maxGradientKMm);
});

test('Smart physics optimizer evaluates candidates and improves target objective', () => {
  const effResult = runSmartPhysicsOptimizer(SAMPLE_PARAMS, 'efficiency');
  assert.ok(effResult.evaluatedStates >= 100);
  assert.ok(effResult.afterMetrics.energyPerMacFj <= effResult.beforeMetrics.energyPerMacFj);

  const accResult = runSmartPhysicsOptimizer(
    { ...SAMPLE_PARAMS, ribbonWidthNm: 6.0, ambientTempK: 340 },
    'accuracy'
  );
  assert.ok(accResult.afterRmsErrorPct < accResult.beforeRmsErrorPct);
});
