import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateChipTelemetry,
  validateInquiryForm,
  MATERIAL_PROFILES,
} from './graphenePhysics';

test('baseline 10 cm^2 GNR finger-sized chip yields 2.0T pores and 12.0T equivalent nodes', () => {
  const res = calculateChipTelemetry({
    areaCm2: 10,
    bandgapMode: 'gnr',
    clockThz: 2.0,
    parallelFactor: 6,
  });

  assert.equal(res.activePoresTrillions, 2);
  assert.equal(res.equivalentServersTrillions, 12);
  assert.equal(res.bandgapEv, 0.45);
  assert.equal(res.onOffRatioExp, 5);
  assert.ok(res.dimensionsMm.width > 15 && res.dimensionsMm.width < 22);
  assert.ok(res.dimensionsMm.length > 50 && res.dimensionsMm.length < 60);
});

test('clamps out-of-range simulator inputs safely', () => {
  const res = calculateChipTelemetry({
    areaCm2: 100,
    bandgapMode: 'superlattice',
    clockThz: 20,
    parallelFactor: 50,
  });

  // Clamped area=15, parallel=8, densityFactor=1.35 -> 15 * 0.2 * 1.35 = 4.05
  assert.equal(res.activePoresTrillions, 4.05);
  assert.equal(res.equivalentServersTrillions, 32.4);
});

test('material profiles contain graphene, graphite, c60, and silicon', () => {
  const ids = MATERIAL_PROFILES.map((m) => m.id);
  assert.deepEqual(ids, ['graphene', 'graphite', 'c60', 'silicon']);
});

test('validateInquiryForm rejects invalid inputs and accepts valid data', () => {
  const invalid = validateInquiryForm({
    name: '',
    email: 'not-an-email',
    organization: 'A',
    focus: 'rd',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.organization);

  const valid = validateInquiryForm({
    name: 'طارق المنصور',
    email: 'tarek@karbonix.io',
    organization: 'مختبر النانو والرقائق',
    focus: 'partnership',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});
