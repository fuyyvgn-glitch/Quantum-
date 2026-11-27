import { useEffect, useState } from 'react';
import { FileDown, Pause, Play, RotateCcw, SlidersHorizontal, StepForward } from 'lucide-react';
import {
  createInitialThermalGrid,
  evaluatePhysicsMetrics,
  PhysicsMetricsSnapshot,
  PhysicsSimParams,
  simulatePhysicalMatrixInference,
  stepThermalGrid,
} from '../utils/quantumGrapheneSim';
import {
  computeBoltzmannTransport,
  computeEntropyAndGradient,
  computeKleinTunnelingProfile,
  computeThzElectrodynamics,
  OptimizationObjective,
  runSmartPhysicsOptimizer,
  SmartOptimizationResult,
} from '../utils/multiPhysicsEngine';
import {
  buildEngineeringReportData,
  generateAndDownloadPdfReport,
  PhysicsReportPayload,
} from '../utils/pdfReportGenerator';
import { PhysicsFieldCanvas } from './PhysicsFieldCanvas';
import { BandAndTransportCharts } from './BandAndTransportCharts';
import { MatrixComputeLab } from './MatrixComputeLab';
import { QuantumTransportLab } from './QuantumTransportLab';

type WorkbenchTab = 'field' | 'quantum' | 'bands' | 'matrix';

export const DEFAULT_PHYSICS_PARAMS: PhysicsSimParams = {
  ribbonWidthNm: 3.1,
  gateVoltageV: 0.65,
  ambientTempK: 300,
  clockThz: 2.0,
  activePoresTrillions: 2.0,
  thermalMaterial: 'graphene',
  utilizationPct: 75,
};

interface PhysicsWorkbenchProps {
  params: PhysicsSimParams;
  onChangeParams: React.Dispatch<React.SetStateAction<PhysicsSimParams>>;
  onMetricsUpdate: (metrics: PhysicsMetricsSnapshot) => void;
  onExportJson: () => void;
  pdfRequestCount: number;
}

export function PhysicsWorkbench({
  params,
  onChangeParams,
  onMetricsUpdate,
  onExportJson,
  pdfRequestCount,
}: PhysicsWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('field');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [optimizationReport, setOptimizationReport] = useState<SmartOptimizationResult | null>(null);
  const [lastPdfReport, setLastPdfReport] = useState<PhysicsReportPayload | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [thermalGrid, setThermalGrid] = useState<number[]>(() =>
    stepThermalGrid(
      createInitialThermalGrid(DEFAULT_PHYSICS_PARAMS.ambientTempK),
      DEFAULT_PHYSICS_PARAMS,
      18,
      20
    )
  );
  const [timeHistory, setTimeHistory] = useState<{ step: number; peakTempK: number }[]>(() => [
    { step: 0, peakTempK: DEFAULT_PHYSICS_PARAMS.ambientTempK },
    { step: 1, peakTempK: 308.4 },
    { step: 2, peakTempK: 314.2 },
  ]);

  const metrics = evaluatePhysicsMetrics(params, thermalGrid);
  const boltzmann = computeBoltzmannTransport(params, metrics);
  const entropy = computeEntropyAndGradient(thermalGrid, params);

  useEffect(() => {
    onMetricsUpdate(metrics);
  }, [metrics.peakTempK, metrics.bandgapEv, metrics.onOffRatioExp, metrics.totalPowerWatts, metrics.snrDb]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setIsRunning(false);
    }
  }, []);

  const advanceSimulationStep = (stepsCount = 2) => {
    setThermalGrid((prevGrid) => {
      const currentSnap = evaluatePhysicsMetrics(params, prevGrid);
      const nextGrid = stepThermalGrid(prevGrid, params, currentSnap.totalPowerWatts, stepsCount);
      const nextPeak = Number(Math.max(...nextGrid).toFixed(1));
      setTimeHistory((prevHist) => {
        const nextStep = (prevHist[prevHist.length - 1]?.step ?? 0) + 1;
        return [...prevHist.slice(-39), { step: nextStep, peakTempK: nextPeak }];
      });
      return nextGrid;
    });
  };

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      advanceSimulationStep(2);
    }, 350);
    return () => window.clearInterval(timer);
  }, [isRunning, params]);

  const handleRunOptimizer = (objective: OptimizationObjective) => {
    const result = runSmartPhysicsOptimizer(params, objective);
    onChangeParams(result.optimalParams);
    const settledGrid = stepThermalGrid(
      createInitialThermalGrid(result.optimalParams.ambientTempK),
      result.optimalParams,
      result.afterMetrics.totalPowerWatts,
      25
    );
    setThermalGrid(settledGrid);
    setTimeHistory([
      { step: 0, peakTempK: result.optimalParams.ambientTempK },
      { step: 1, peakTempK: Number(Math.max(...settledGrid).toFixed(1)) },
    ]);
    setOptimizationReport(result);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const klein = computeKleinTunnelingProfile(metrics.bandgapEv, params.gateVoltageV);
      const thz = computeThzElectrodynamics(params, boltzmann);
      const matrixEval = simulatePhysicalMatrixInference(
        [0.85, 0.25, 0.9, 0.4],
        [
          [0.9, 0.1, 0.4, 0.0],
          [0.2, 0.8, 0.1, 0.5],
          [0.5, 0.0, 0.9, 0.3],
          [0.1, 0.6, 0.2, 0.7],
        ],
        metrics,
        params.gateVoltageV
      );
      const payload = buildEngineeringReportData({
        params,
        metrics,
        boltzmann,
        kleinSuppressionPct: klein.barrierSuppressionPct,
        thz,
        entropy,
        matrixRmsErrorPct: matrixEval.rmsErrorPct,
      });
      await generateAndDownloadPdfReport(payload);
      setLastPdfReport(payload);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (pdfRequestCount > 0) {
      void handleDownloadPdf();
    }
  }, [pdfRequestCount]);

  const handleReset = () => {
    onChangeParams(DEFAULT_PHYSICS_PARAMS);
    setOptimizationReport(null);
    const freshGrid = stepThermalGrid(
      createInitialThermalGrid(DEFAULT_PHYSICS_PARAMS.ambientTempK),
      DEFAULT_PHYSICS_PARAMS,
      18,
      12
    );
    setThermalGrid(freshGrid);
    setTimeHistory([
      { step: 0, peakTempK: DEFAULT_PHYSICS_PARAMS.ambientTempK },
      { step: 1, peakTempK: Number(Math.max(...freshGrid).toFixed(1)) },
    ]);
  };

  const statusColorClass =
    metrics.statusLevel === 'critical'
      ? 'text-rose-700'
      : metrics.statusLevel === 'warning'
      ? 'text-amber-700'
      : 'text-emerald-700';

  const statusGlyph =
    metrics.statusLevel === 'critical' ? '✖ ' : metrics.statusLevel === 'warning' ? '▲ ' : '● ';

  return (
    <section id="workbench" className="border-b border-slate-200 bg-slate-50 py-8 lg:py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-medium text-slate-500">
            01. المحاكاة الفيزيائية الشاملة المترابطة · أبعاد الشريحة 18 × 55 مم
          </p>
          <h1
            className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl"
            style={{ textWrap: 'balance' }}
          >
            محاكاة ذكية متعددة الفيزياء لشريحة الغرافين الكربونية
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            نظام عددي مترابط يحل معادلات ميكانيكا الكم، ونفق كلاين، وتشتت بولتزمان،
            والانتشار الحراري ثنائي الأبعاد، والحوسبة المصفوفية مع محرك تحسين فيزيائي ذاتي.
          </p>
        </div>

        {/* Coupled 5-Domain Live Physics Pipeline */}
        <div className="mt-5 grid grid-cols-2 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0 lg:divide-x lg:divide-x-reverse">
          <div className="p-3.5">
            <div className="text-[11px] font-medium text-slate-500">1. الكمّي (Dirac Gap)</div>
            <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
              {metrics.bandgapEv.toFixed(3)} eV
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-[11px] font-medium text-slate-500">2. بولتزمان (τ / μ)</div>
            <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
              {boltzmann.tauTotalFs} fs
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-[11px] font-medium text-slate-500">3. التبديل (Ion/Ioff)</div>
            <div className="mt-1 font-mono text-base font-bold text-sky-700 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
              10^{metrics.onOffRatioExp}
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-[11px] font-medium text-slate-500">4. الحراري (T_peak)</div>
            <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
              {metrics.peakTempK} K
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-[11px] font-medium text-slate-500">5. الأداء والكفاءة</div>
            <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
              {metrics.throughputTops} TOPS
            </div>
            <div className="font-mono text-[11px] text-slate-500 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
              {metrics.energyPerMacFj} fJ/OP
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-[11px] font-medium text-slate-500">الاستقرار الفيزيائي</div>
            <div className={`mt-1 text-xs font-semibold ${statusColorClass}`}>
              {statusGlyph}
              {metrics.statusLabelAr}
            </div>
          </div>
        </div>

        {/* Asymmetric Split Console */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Control & Smart Optimizer Column */}
          <div className="flex flex-col justify-between gap-5 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-4">
            <div className="space-y-4">
              {/* Smart Physics Inverse-Design Optimizer */}
              <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-sky-700" />
                  <span>المُحسِّن الفيزيائي الذكي (375 حالة)</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  يستكشف فضاء المتغيرات الفيزيائية تلقائياً لإيجاد نقطة التشغيل المثلى ضمن حدود الأمان.
                </p>
                <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRunOptimizer('efficiency')}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-800 hover:border-sky-600 hover:text-sky-700 cursor-pointer"
                  >
                    أقل طاقة
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunOptimizer('accuracy')}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-800 hover:border-sky-600 hover:text-sky-700 cursor-pointer"
                  >
                    أعلى دقة AI
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunOptimizer('throughput')}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-800 hover:border-sky-600 hover:text-sky-700 cursor-pointer"
                  >
                    أقصى سرعة
                  </button>
                </div>

                {optimizationReport && (
                  <div className="mt-2.5 rounded-md border border-sky-200 bg-white p-2.5 text-[11px] leading-relaxed text-slate-700">
                    <div className="font-semibold text-sky-800">
                      تم فحص {optimizationReport.evaluatedStates} حالة فيزيائية:
                    </div>
                    <p className="mt-1">{optimizationReport.rationaleAr}</p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <label htmlFor="sim-ribbon-width">عرض الشريط النانوي (W)</label>
                  <span className="font-mono text-sky-700 tabular-nums" dir="ltr">
                    {params.ribbonWidthNm.toFixed(1)} nm
                  </span>
                </div>
                <input
                  id="sim-ribbon-width"
                  type="range"
                  min={2.0}
                  max={12.0}
                  step={0.1}
                  value={params.ribbonWidthNm}
                  onChange={(e) =>
                    onChangeParams((prev) => ({ ...prev, ribbonWidthNm: Number(e.target.value) }))
                  }
                  className="mt-1.5 w-full accent-sky-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <label htmlFor="sim-ambient-temp">درجة الحرارة المحيطة (T_amb)</label>
                  <span className="font-mono text-sky-700 tabular-nums" dir="ltr">
                    {params.ambientTempK} K
                  </span>
                </div>
                <input
                  id="sim-ambient-temp"
                  type="range"
                  min={77}
                  max={360}
                  step={5}
                  value={params.ambientTempK}
                  onChange={(e) => {
                    const nextAmb = Number(e.target.value);
                    onChangeParams((prev) => ({ ...prev, ambientTempK: nextAmb }));
                    setThermalGrid(createInitialThermalGrid(nextAmb));
                  }}
                  className="mt-1.5 w-full accent-sky-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <label htmlFor="sim-gate-voltage">جهد البوابة (V_g)</label>
                  <span className="font-mono text-sky-700 tabular-nums" dir="ltr">
                    {params.gateVoltageV.toFixed(2)} V
                  </span>
                </div>
                <input
                  id="sim-gate-voltage"
                  type="range"
                  min={0.2}
                  max={1.2}
                  step={0.05}
                  value={params.gateVoltageV}
                  onChange={(e) =>
                    onChangeParams((prev) => ({ ...prev, gateVoltageV: Number(e.target.value) }))
                  }
                  className="mt-1.5 w-full accent-sky-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <label htmlFor="sim-clock-thz">تردد الساعة الكمّي (f)</label>
                  <span className="font-mono text-sky-700 tabular-nums" dir="ltr">
                    {params.clockThz.toFixed(1)} THz
                  </span>
                </div>
                <input
                  id="sim-clock-thz"
                  type="range"
                  min={0.5}
                  max={5.0}
                  step={0.5}
                  value={params.clockThz}
                  onChange={(e) =>
                    onChangeParams((prev) => ({ ...prev, clockThz: Number(e.target.value) }))
                  }
                  className="mt-1.5 w-full accent-sky-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <label htmlFor="sim-pores">الفجوات السداسية النشطة</label>
                  <span className="font-mono text-sky-700 tabular-nums" dir="ltr">
                    {params.activePoresTrillions.toFixed(1)} T
                  </span>
                </div>
                <input
                  id="sim-pores"
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  value={params.activePoresTrillions}
                  onChange={(e) =>
                    onChangeParams((prev) => ({
                      ...prev,
                      activePoresTrillions: Number(e.target.value),
                    }))
                  }
                  className="mt-1.5 w-full accent-sky-700 cursor-pointer"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-900">
                  معامل التوصيل الحراري في معادلة PDE
                </span>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    aria-pressed={params.thermalMaterial === 'graphene'}
                    onClick={() =>
                      onChangeParams((prev) => ({ ...prev, thermalMaterial: 'graphene' }))
                    }
                    className={`rounded-md px-2 py-2 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      params.thermalMaterial === 'graphene'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    غرافين 5,000 W/m·K
                  </button>
                  <button
                    type="button"
                    aria-pressed={params.thermalMaterial === 'silicon'}
                    onClick={() =>
                      onChangeParams((prev) => ({ ...prev, thermalMaterial: 'silicon' }))
                    }
                    className={`rounded-md px-2 py-2 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      params.thermalMaterial === 'silicon'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    سيليكون 148 W/m·K
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsRunning((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white whitespace-nowrap hover:bg-sky-700 cursor-pointer"
                >
                  {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{isRunning ? 'إيقاف الزمن' : 'تشغيل الزمن'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => advanceSimulationStep(4)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 whitespace-nowrap hover:bg-slate-50 cursor-pointer"
                >
                  <StepForward className="h-3.5 w-3.5" />
                  <span>خطوة Δt</span>
                </button>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 whitespace-nowrap hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>إعادة ضبط الشروط الابتدائية</span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={() => void handleDownloadPdf()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white whitespace-nowrap hover:bg-sky-800 disabled:opacity-60 cursor-pointer"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>{isGeneratingPdf ? 'جاري التوليد...' : 'تقرير PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={onExportJson}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50 cursor-pointer"
                >
                  تصدير JSON
                </button>
              </div>

              {lastPdfReport && (
                <div
                  role="status"
                  className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-[11px] leading-relaxed text-slate-800"
                >
                  <div className="font-semibold text-emerald-800">
                    ● تم تنزيل التقرير الهندسي PDF بنجاح
                  </div>
                  <div className="mt-1 text-slate-700">
                    {lastPdfReport.analysis.efficiencyGradeAr} · هامش حراري{' '}
                    <span className="font-mono" dir="ltr">
                      {lastPdfReport.analysis.thermalMarginPct}%
                    </span>{' '}
                    · تحسن الطاقة{' '}
                    <span className="font-mono" dir="ltr">
                      {lastPdfReport.analysis.energyGainFactor}×
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Main Stage */}
          <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-8">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
              <div
                className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 self-start"
                role="tablist"
                aria-label="أوضاع التحليل الفيزيائي"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'field'}
                  onClick={() => setActiveTab('field')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeTab === 'field' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الحقل الحراري 2D
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'quantum'}
                  onClick={() => setActiveTab('quantum')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeTab === 'quantum' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  النقل الكمّي والـ THz
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'bands'}
                  onClick={() => setActiveTab('bands')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeTab === 'bands' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  نطاقات ديراك والتبديل
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'matrix'}
                  onClick={() => setActiveTab('matrix')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeTab === 'matrix' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الحوسبة المصفوفية (I = G·V)
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-slate-500 tabular-nums" dir="ltr">
                <span>μ={metrics.mobilityCm2Vs.toLocaleString('en-US')} cm²/V·s · λ_mfp={metrics.meanFreePathUm} μm</span>
                <span>E_F={boltzmann.fermiEnergyEv} eV · dS/dt={entropy.entropyGenerationMwK} mW/K</span>
              </div>
            </div>

            {activeTab === 'field' && (
              <PhysicsFieldCanvas
                thermalGrid={thermalGrid}
                params={params}
                metrics={metrics}
                timeHistory={timeHistory}
                isRunning={isRunning}
              />
            )}

            {activeTab === 'quantum' && (
              <QuantumTransportLab
                params={params}
                metrics={metrics}
                boltzmann={boltzmann}
                entropy={entropy}
                isRunning={isRunning}
              />
            )}

            {activeTab === 'bands' && (
              <BandAndTransportCharts params={params} metrics={metrics} />
            )}

            {activeTab === 'matrix' && (
              <MatrixComputeLab params={params} metrics={metrics} />
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-xs sm:grid-cols-4">
              <div>
                <div className="text-slate-500">الاستطاعة الديناميكية</div>
                <div className="mt-1 font-mono font-semibold text-slate-900 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
                  {metrics.dynamicPowerWatts} W
                </div>
              </div>
              <div>
                <div className="text-slate-500">قدرة التسرب الساكنة</div>
                <div className="mt-1 font-mono font-semibold text-slate-900 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
                  {metrics.leakagePowerWatts} W
                </div>
              </div>
              <div>
                <div className="text-slate-500">إجمالي الحمل الحراري</div>
                <div className="mt-1 font-mono font-semibold text-sky-700 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
                  {metrics.totalPowerWatts} W
                </div>
              </div>
              <div>
                <div className="text-slate-500">نسبة الإشارة للضوضاء</div>
                <div className="mt-1 font-mono font-semibold text-slate-900 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
                  {metrics.snrDb} dB
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
