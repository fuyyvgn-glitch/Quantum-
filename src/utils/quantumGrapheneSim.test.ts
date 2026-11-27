import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBandgapEv,
  computeOnOffRatio,
  createInitialThermalGrid,
  evaluatePhysicsMetrics,
  generateDispersionCurve,
  simulatePhysicalMatrixInference,
  stepThermalGrid,
  PhysicsSimParams,
} from './quantumGrapheneSim';

const BASE_PARAMS: PhysicsSimParams = {
  ribbonWidthNm: 3.1,
  gateVoltageV: 0.65,
  ambientTempK: 300,
  clockThz: 2.0,
  activePoresTrillions: 2.0,
  thermalMaterial: 'graphene',
  utilizationPct: 75,
};

test('Dirac bandgap scales inversely with GNR confinement width and dispersion opens gap', () => {
  const narrowGap = computeBandgapEv(3.0);
  const wideGap = computeBandgapEv(10.0);
  assert.ok(narrowGap > wideGap);

  const curve = generateDispersionCurve(narrowGap);
  const kZero = curve.find((p) => p.kNmInv === 0);
  assert.ok(kZero);
  assert.equal(kZero.pristineConductionEv, 0);
  assert.ok(Math.abs(kZero.conductionEv * 2 - narrowGap) < 0.01);
});

test('On/Off switching ratio drops when temperature rises', () => {
  const eg = computeBandgapEv(3.1);
  const coldRatio = computeOnOffRatio(eg, 150, 3.1);
  const hotRatio = computeOnOffRatio(eg, 380, 3.1);
  assert.ok(coldRatio > hotRatio);
});

test('2D thermal PDE yields cooler peak temperature for graphene than silicon under equal power', () => {
  const grapheneGrid = stepThermalGrid(createInitialThermalGrid(300), BASE_PARAMS, 22, 40);
  const siliconGrid = stepThermalGrid(
    createInitialThermalGrid(300),
    { ...BASE_PARAMS, thermalMaterial: 'silicon' },
    22,
    40
  );

  const grapheneMetrics = evaluatePhysicsMetrics(BASE_PARAMS, grapheneGrid);
  const siliconMetrics = evaluatePhysicsMetrics(
    { ...BASE_PARAMS, thermalMaterial: 'silicon' },
    siliconGrid
  );

  assert.ok(grapheneMetrics.peakTempK < siliconMetrics.peakTempK);
});

test('physical matrix inference produces low error at nominal gap and higher error when gap collapses', () => {
  const inputs = [0.8, 0.2, 0.9, 0.4];
  const weights = [
    [0.9, 0.1, 0.4, 0.0],
    [0.2, 0.8, 0.1, 0.5],
    [0.5, 0.0, 0.9, 0.3],
    [0.1, 0.6, 0.2, 0.7],
  ];

  const nominalGrid = stepThermalGrid(createInitialThermalGrid(300), BASE_PARAMS, 18, 25);
  const nominalMetrics = evaluatePhysicsMetrics(BASE_PARAMS, nominalGrid);
  const nominalRes = simulatePhysicalMatrixInference(inputs, weights, nominalMetrics, BASE_PARAMS.gateVoltageV);

  const collapsedParams = { ...BASE_PARAMS, ribbonWidthNm: 12.0, ambientTempK: 360 };
  const hotGrid = stepThermalGrid(createInitialThermalGrid(360), collapsedParams, 28, 25);
  const hotMetrics = evaluatePhysicsMetrics(collapsedParams, hotGrid);
  const degradedRes = simulatePhysicalMatrixInference(inputs, weights, hotMetrics, collapsedParams.gateVoltageV);

  assert.ok(nominalRes.rmsErrorPct < degradedRes.rmsErrorPct);
});
