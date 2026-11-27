import { useState } from 'react';
import {
  PhysicsMetricsSnapshot,
  PhysicsSimParams,
  simulatePhysicalMatrixInference,
} from '../utils/quantumGrapheneSim';

interface MatrixComputeLabProps {
  params: PhysicsSimParams;
  metrics: PhysicsMetricsSnapshot;
}

interface MatrixPreset {
  id: string;
  label: string;
  inputs: number[];
  weights: number[][];
}

const PRESETS: MatrixPreset[] = [
  {
    id: 'attention',
    label: 'طبقة انتباه AI',
    inputs: [0.85, 0.25, 0.9, 0.4],
    weights: [
      [0.9, 0.1, 0.4, 0.0],
      [0.2, 0.8, 0.1, 0.5],
      [0.5, 0.0, 0.9, 0.3],
      [0.1, 0.6, 0.2, 0.7],
    ],
  },
  {
    id: 'edge',
    label: 'مرشح كشف حواف',
    inputs: [1.0, 0.15, 0.8, 0.2],
    weights: [
      [1.0, 0.0, 0.5, 0.1],
      [0.0, 1.0, 0.2, 0.6],
      [0.4, 0.2, 0.9, 0.0],
      [0.1, 0.7, 0.0, 0.8],
    ],
  },
  {
    id: 'sparse',
    label: 'مصفوفة متناثرة',
    inputs: [0.95, 0.0, 0.7, 0.1],
    weights: [
      [0.9, 0.0, 0.0, 0.2],
      [0.0, 0.85, 0.1, 0.0],
      [0.2, 0.0, 0.95, 0.0],
      [0.0, 0.3, 0.0, 0.8],
    ],
  },
];

export function MatrixComputeLab({ params, metrics }: MatrixComputeLabProps) {
  const [presetId, setPresetId] = useState<string>('attention');
  const [inputs, setInputs] = useState<number[]>(PRESETS[0].inputs);
  const [weights, setWeights] = useState<number[][]>(PRESETS[0].weights);

  const selectPreset = (preset: MatrixPreset) => {
    setPresetId(preset.id);
    setInputs([...preset.inputs]);
    setWeights(preset.weights.map((row) => [...row]));
  };

  const cycleWeight = (r: number, c: number) => {
    setWeights((prev) =>
      prev.map((row, ri) =>
        ri === r
          ? row.map((val, ci) => (ci === c ? Number(((val + 0.25) > 1.01 ? 0 : val + 0.25).toFixed(2)) : val))
          : row
      )
    );
  };

  const result = simulatePhysicalMatrixInference(inputs, weights, metrics, params.gateVoltageV);
  const maxVal = Math.max(1.5, ...result.idealOutputs, ...result.physicalOutputs);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            محاكاة الضرب المصفوفي الفيزيائي عبر الموصلية السداسية (I = G · V)
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            تتحول الأوزان العصبية إلى قيم توصيل فيزيائية G_ij، وتظهر دقة الناتج مقارنة بالتسرب
            والضوضاء الحرارية الفعلية للشريحة.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="قوالب المصفوفة">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPreset(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                presetId === p.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Input Voltage Vector + Conductance Matrix */}
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:col-span-6">
          <div>
            <div className="text-xs font-semibold text-slate-800">جهود الدخل (x₁ – x₄)</div>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {inputs.map((val, idx) => (
                <div key={idx} className="rounded-md border border-slate-200 bg-white p-2">
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-600" dir="ltr">
                    <span>x{idx + 1}</span>
                    <span className="font-semibold text-sky-700">{val.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    aria-label={`قيمة الدخل ${idx + 1}`}
                    value={val}
                    onChange={(e) => {
                      const nextVal = Number(e.target.value);
                      setInputs((prev) => prev.map((v, i) => (i === idx ? nextVal : v)));
                    }}
                    className="mt-1.5 w-full accent-sky-700 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">مصفوفة الموصلية G_ij (انقر لتعديل الوزن)</span>
              <span className="font-mono text-[11px] text-slate-500">4 × 4 Crossbar</span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5" dir="ltr">
              {weights.map((row, r) =>
                row.map((w, c) => (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => cycleWeight(r, c)}
                    aria-label={`الوزن صف ${r + 1} عمود ${c + 1} القيمة ${w}`}
                    className="rounded-md border border-slate-200 py-2 font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer hover:border-sky-600"
                    style={{
                      backgroundColor: `rgba(2, 132, 199, ${0.06 + w * 0.28})`,
                      color: '#0F172A',
                    }}
                  >
                    {w.toFixed(2)}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Ideal vs Physical Output Bars */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 lg:col-span-6">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">مقارنة الخرج الرياضي بالخرج الفيزيائي</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  result.rmsErrorPct > 8 ? 'text-rose-700' : result.rmsErrorPct > 3 ? 'text-amber-700' : 'text-emerald-700'
                }`}
                dir="ltr"
              >
                RMS Error: {result.rmsErrorPct.toFixed(2)}%
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {result.idealOutputs.map((ideal, idx) => {
                const phys = result.physicalOutputs[idx];
                const idealPct = Math.min(100, (ideal / maxVal) * 100);
                const physPct = Math.min(100, Math.max(0, (phys / maxVal) * 100));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px] tabular-nums" dir="ltr">
                      <span className="font-semibold text-slate-800">y{idx + 1}</span>
                      <span className="text-slate-600">
                        Ideal: {ideal.toFixed(3)} · Physical: {phys.toFixed(3)}
                      </span>
                    </div>
                    <div className="space-y-1" dir="ltr">
                      <div className="h-2 w-full overflow-hidden rounded-xs bg-slate-200">
                        <div className="h-full bg-slate-800" style={{ width: `${idealPct}%` }} />
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-xs bg-slate-200">
                        <div className="h-full bg-sky-600" style={{ width: `${physPct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
            <span>الداكن: الناتج الرياضي المثالي · الأزرق: ناتج الشريحة الفيزيائي</span>
            <span className="font-mono tabular-nums" dir="ltr">
              SNR: {result.snrDb} dB · Noise: {metrics.thermalNoiseMv} mV
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
