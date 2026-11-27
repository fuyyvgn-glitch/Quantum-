/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Header } from './components/Header';
import {
  DEFAULT_PHYSICS_PARAMS,
  PhysicsWorkbench,
} from './components/PhysicsWorkbench';
import { PhysicsEquationsSection } from './components/PhysicsEquationsSection';
import { MaterialComparison } from './components/MaterialComparison';
import { EngineeringRoadmap } from './components/EngineeringRoadmap';
import { InquiryForm } from './components/InquiryForm';
import { Footer } from './components/Footer';
import {
  createInitialThermalGrid,
  evaluatePhysicsMetrics,
  PhysicsMetricsSnapshot,
  PhysicsSimParams,
} from './utils/quantumGrapheneSim';
import {
  computeBoltzmannTransport,
  computeKleinTunnelingProfile,
  computeThzElectrodynamics,
} from './utils/multiPhysicsEngine';

export default function App() {
  const [params, setParams] = useState<PhysicsSimParams>(DEFAULT_PHYSICS_PARAMS);
  const [pdfRequestCount, setPdfRequestCount] = useState<number>(0);
  const [latestMetrics, setLatestMetrics] = useState<PhysicsMetricsSnapshot>(() =>
    evaluatePhysicsMetrics(
      DEFAULT_PHYSICS_PARAMS,
      createInitialThermalGrid(DEFAULT_PHYSICS_PARAMS.ambientTempK)
    )
  );

  const handleExportJson = () => {
    const boltzmann = computeBoltzmannTransport(params, latestMetrics);
    const klein = computeKleinTunnelingProfile(latestMetrics.bandgapEv, params.gateVoltageV);
    const thz = computeThzElectrodynamics(params, boltzmann);
    const payload = {
      timestamp: new Date().toISOString(),
      architecture: 'Pure Monolayer Graphene AI Die (18mm x 55mm)',
      parameters: params,
      computedPhysics: latestMetrics,
      boltzmannTransport: boltzmann,
      kleinBarrierSuppressionPct: klein.barrierSuppressionPct,
      thzElectrodynamics: {
        quantumCapacitanceUfCm2: thz.quantumCapacitanceUfCm2,
        kineticInductancePhSq: thz.kineticInductancePhSq,
        plasmonVelocityMs: thz.plasmonVelocityMs,
        propagationDelayPs: thz.propagationDelayPs,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `karbonix-physics-sim-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="top" className="min-h-screen bg-slate-50 text-slate-900">
      <Header onPrimaryAction={() => setPdfRequestCount((c) => c + 1)} />
      <main>
        <PhysicsWorkbench
          params={params}
          onChangeParams={setParams}
          onMetricsUpdate={setLatestMetrics}
          onExportJson={handleExportJson}
          pdfRequestCount={pdfRequestCount}
        />
        <PhysicsEquationsSection />
        <MaterialComparison />
        <EngineeringRoadmap />
        <InquiryForm />
      </main>
      <Footer />
    </div>
  );
}
