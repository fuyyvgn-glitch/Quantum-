import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEngineeringReportData,
  buildPdfFromJpegBytes,
} from './pdfReportGenerator';
import {
  createInitialThermalGrid,
  evaluatePhysicsMetrics,
  PhysicsSimParams,
  stepThermalGrid,
} from './quantumGrapheneSim';
import {
  computeBoltzmannTransport,
  computeEntropyAndGradient,
  computeKleinTunnelingProfile,
  computeThzElectrodynamics,
} from './multiPhysicsEngine';

const SAMPLE_PARAMS: PhysicsSimParams = {
  ribbonWidthNm: 3.1,
  gateVoltageV: 0.65,
  ambientTempK: 300,
  clockThz: 2.0,
  activePoresTrillions: 2.0,
  thermalMaterial: 'graphene',
  utilizationPct: 75,
};

test('buildEngineeringReportData derives efficiency gain, thermal margin, and recommendations', () => {
  const grid = stepThermalGrid(createInitialThermalGrid(300), SAMPLE_PARAMS, 15, 20);
  const metrics = evaluatePhysicsMetrics(SAMPLE_PARAMS, grid);
  const boltzmann = computeBoltzmannTransport(SAMPLE_PARAMS, metrics);
  const klein = computeKleinTunnelingProfile(metrics.bandgapEv, SAMPLE_PARAMS.gateVoltageV);
  const thz = computeThzElectrodynamics(SAMPLE_PARAMS, boltzmann);
  const entropy = computeEntropyAndGradient(grid, SAMPLE_PARAMS);

  const report = buildEngineeringReportData({
    params: SAMPLE_PARAMS,
    metrics,
    boltzmann,
    kleinSuppressionPct: klein.barrierSuppressionPct,
    thz,
    entropy,
    matrixRmsErrorPct: 0.14,
  });

  assert.ok(report.analysis.thermalMarginPct > 70);
  assert.ok(report.analysis.energyGainFactor > 0);
  assert.ok(report.analysis.recommendationsAr.length >= 1);

  // Degraded silicon + wide ribbon scenario triggers targeted recommendations
  const badParams: PhysicsSimParams = {
    ...SAMPLE_PARAMS,
    ribbonWidthNm: 8.5,
    thermalMaterial: 'silicon',
  };
  const hotGrid = stepThermalGrid(createInitialThermalGrid(300), badParams, 45, 35);
  const badMetrics = evaluatePhysicsMetrics(badParams, hotGrid);
  const badReport = buildEngineeringReportData({
    params: badParams,
    metrics: badMetrics,
    boltzmann: computeBoltzmannTransport(badParams, badMetrics),
    kleinSuppressionPct: 12,
    thz,
    entropy: computeEntropyAndGradient(hotGrid, badParams),
    matrixRmsErrorPct: 9.5,
  });

  assert.ok(badReport.analysis.recommendationsAr.length >= 2);
});

test('buildPdfFromJpegBytes produces valid PDF 1.4 structure with xref and EOF', () => {
  const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);
  const pdf = buildPdfFromJpegBytes(fakeJpeg, 1240, 1754);
  const text = Buffer.from(pdf).toString('latin1');

  assert.ok(text.startsWith('%PDF-1.4\n'));
  assert.ok(text.includes('/Subtype /Image'));
  assert.ok(text.includes(`/Length ${fakeJpeg.length}`));
  assert.ok(text.includes('xref\n0 6\n'));
  assert.ok(text.endsWith('%%EOF\n'));
});
