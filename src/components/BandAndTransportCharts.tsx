import { useState } from 'react';
import {
  generateDispersionCurve,
  generateTransportCurve,
  PhysicsMetricsSnapshot,
  PhysicsSimParams,
} from '../utils/quantumGrapheneSim';

interface BandAndTransportChartsProps {
  params: PhysicsSimParams;
  metrics: PhysicsMetricsSnapshot;
}

export function BandAndTransportCharts({ params, metrics }: BandAndTransportChartsProps) {
  const dispersion = generateDispersionCurve(metrics.bandgapEv);
  const transport = generateTransportCurve(metrics.bandgapEv, params.ribbonWidthNm);

  const [hoverDispIdx, setHoverDispIdx] = useState<number | null>(null);
  const [hoverTransIdx, setHoverTransIdx] = useState<number | null>(null);

  // Chart 1 geometry: E(k)
  const w1 = 380;
  const h1 = 250;
  const pad1 = { top: 22, right: 20, bottom: 34, left: 44 };
  const innerW1 = w1 - pad1.left - pad1.right;
  const innerH1 = h1 - pad1.top - pad1.bottom;
  const maxE = 1.0;

  const mapK = (k: number) => pad1.left + ((k + 1.2) / 2.4) * innerW1;
  const mapE = (e: number) => pad1.top + ((maxE - e) / (2 * maxE)) * innerH1;

  const condPath = dispersion
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${mapK(pt.kNmInv).toFixed(1)} ${mapE(pt.conductionEv).toFixed(1)}`)
    .join(' ');
  const valPath = dispersion
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${mapK(pt.kNmInv).toFixed(1)} ${mapE(pt.valenceEv).toFixed(1)}`)
    .join(' ');
  const pristineCondPath = dispersion
    .map(
      (pt, i) =>
        `${i === 0 ? 'M' : 'L'} ${mapK(pt.kNmInv).toFixed(1)} ${mapE(pt.pristineConductionEv).toFixed(1)}`
    )
    .join(' ');
  const pristineValPath = dispersion
    .map(
      (pt, i) =>
        `${i === 0 ? 'M' : 'L'} ${mapK(pt.kNmInv).toFixed(1)} ${mapE(pt.pristineValenceEv).toFixed(1)}`
    )
    .join(' ');

  const activeDisp = hoverDispIdx !== null ? dispersion[hoverDispIdx] : dispersion[Math.floor(dispersion.length / 2)];

  // Chart 2 geometry: log10(Ion/Ioff) vs Temp (K)
  const w2 = 380;
  const h2 = 250;
  const pad2 = { top: 22, right: 20, bottom: 34, left: 44 };
  const innerW2 = w2 - pad2.left - pad2.right;
  const innerH2 = h2 - pad2.top - pad2.bottom;
  const maxLog = 8.5;

  const mapT = (t: number) => pad2.left + ((t - 80) / 320) * innerW2;
  const mapLog = (l: number) => pad2.top + ((maxLog - Math.min(maxLog, l)) / maxLog) * innerH2;

  const ratioPath = transport
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${mapT(pt.tempK).toFixed(1)} ${mapLog(pt.log10OnOff).toFixed(1)}`)
    .join(' ');

  const clampedMarkerT = Math.min(400, Math.max(80, metrics.peakTempK));
  const activeTrans =
    hoverTransIdx !== null
      ? transport[hoverTransIdx]
      : {
          tempK: metrics.peakTempK,
          log10OnOff: metrics.onOffRatioExp,
          mobilityCm2Vs: metrics.mobilityCm2Vs,
        };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Chart 1: Dirac Cone Dispersion */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-900">تشتت ديراك وفجوة الطاقة E(k)</span>
          <span className="font-mono text-sky-700 tabular-nums" dir="ltr">
            Eg = {metrics.bandgapEv.toFixed(3)} eV
          </span>
        </div>

        <div dir="ltr" className="mt-2">
          <svg
            viewBox={`0 0 ${w1} ${h1}`}
            className="h-auto w-full select-none"
            role="img"
            aria-label="منحنى طاقة ديراك للغرافين النقي مقارنة بالشريط النانوي"
            onPointerLeave={() => setHoverDispIdx(null)}
          >
          {/* Fermi Level E=0 & k=0 axes */}
          <line
            x1={pad1.left}
            y1={mapE(0)}
            x2={w1 - pad1.right}
            y2={mapE(0)}
            stroke="#94A3B8"
            strokeDasharray="3 3"
          />
          <line
            x1={mapK(0)}
            y1={pad1.top}
            x2={mapK(0)}
            y2={h1 - pad1.bottom}
            stroke="#CBD5E1"
          />

          {/* Y axis labels */}
          {[-0.8, 0, 0.8].map((val) => (
            <text
              key={val}
              x={pad1.left - 8}
              y={mapE(val) + 3}
              textAnchor="end"
              className="fill-slate-500 font-mono text-[10px]"
            >
              {val.toFixed(1)}
            </text>
          ))}
          <text x={pad1.left - 8} y={pad1.top - 6} textAnchor="end" className="fill-slate-500 font-mono text-[10px]">
            E (eV)
          </text>
          <text
            x={pad1.left + innerW1 / 2}
            y={h1 - 8}
            textAnchor="middle"
            className="fill-slate-500 font-mono text-[10px]"
          >
            k (nm⁻¹)
          </text>

          {/* Pristine massless Dirac cone (dashed) */}
          <path d={pristineCondPath} fill="none" stroke="#94A3B8" strokeWidth={1.2} strokeDasharray="4 4" />
          <path d={pristineValPath} fill="none" stroke="#94A3B8" strokeWidth={1.2} strokeDasharray="4 4" />

          {/* Engineered GNR bands (solid) */}
          <path d={condPath} fill="none" stroke="#0284C7" strokeWidth={2.2} />
          <path d={valPath} fill="none" stroke="#0F172A" strokeWidth={2.2} />

          {/* Interactive hover columns */}
          {dispersion.map((pt, i) => (
            <rect
              key={pt.kNmInv}
              x={mapK(pt.kNmInv) - innerW1 / dispersion.length / 2}
              y={pad1.top}
              width={innerW1 / dispersion.length}
              height={innerH1}
              fill="transparent"
              onPointerEnter={() => setHoverDispIdx(i)}
            />
          ))}

          {activeDisp && (
            <g>
              <line
                x1={mapK(activeDisp.kNmInv)}
                y1={pad1.top}
                x2={mapK(activeDisp.kNmInv)}
                y2={h1 - pad1.bottom}
                stroke="#0284C7"
                strokeWidth={1}
                strokeOpacity={0.45}
              />
              <circle cx={mapK(activeDisp.kNmInv)} cy={mapE(activeDisp.conductionEv)} r={3.5} fill="#0284C7" />
              <circle cx={mapK(activeDisp.kNmInv)} cy={mapE(activeDisp.valenceEv)} r={3.5} fill="#0F172A" />
            </g>
          )}
          </svg>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 font-mono text-[11px] text-slate-600 tabular-nums" dir="ltr">
          <span>k={activeDisp.kNmInv} nm⁻¹</span>
          <span>Ec=+{activeDisp.conductionEv} eV / Ev={activeDisp.valenceEv} eV</span>
        </div>
      </div>

      {/* Chart 2: Landauer Switching Ratio vs Temperature */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-900">نسبة التبديل مقابل الحرارة T</span>
          <span className="font-mono text-sky-700 tabular-nums" dir="ltr">
            10^{metrics.onOffRatioExp} @ {metrics.peakTempK} K
          </span>
        </div>

        <div dir="ltr" className="mt-2">
          <svg
            viewBox={`0 0 ${w2} ${h2}`}
            className="h-auto w-full select-none"
            role="img"
            aria-label="منحنى نسبة التشغيل والإيقاف مقابل درجة الحرارة"
            onPointerLeave={() => setHoverTransIdx(null)}
          >
          {/* Logic minimum threshold line (10^3.5) */}
          <line
            x1={pad2.left}
            y1={mapLog(3.5)}
            x2={w2 - pad2.right}
            y2={mapLog(3.5)}
            stroke="#F59E0B"
            strokeDasharray="4 4"
            strokeWidth={1.2}
          />
          <text
            x={pad2.left + 6}
            y={mapLog(3.5) - 6}
            textAnchor="start"
            className="fill-amber-700 font-mono text-[9px]"
          >
            Min Logic (10^3.5)
          </text>

          {/* Grid lines */}
          {[2, 4, 6, 8].map((v) => (
            <g key={v}>
              <line x1={pad2.left} y1={mapLog(v)} x2={w2 - pad2.right} y2={mapLog(v)} stroke="#E2E8F0" />
              <text x={pad2.left - 8} y={mapLog(v) + 3} textAnchor="end" className="fill-slate-500 font-mono text-[10px]">
                10^{v}
              </text>
            </g>
          ))}

          {[100, 200, 300, 400].map((t) => (
            <text key={t} x={mapT(t)} y={h2 - 14} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
              {t}K
            </text>
          ))}

          <path d={ratioPath} fill="none" stroke="#0284C7" strokeWidth={2.2} />

          {/* Current live T_peak marker */}
          <line
            x1={mapT(clampedMarkerT)}
            y1={pad2.top}
            x2={mapT(clampedMarkerT)}
            y2={h2 - pad2.bottom}
            stroke="#0F172A"
            strokeDasharray="3 3"
          />
          <circle
            cx={mapT(clampedMarkerT)}
            cy={mapLog(metrics.onOffRatioExp)}
            r={4.5}
            fill="#0284C7"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />

          {transport.map((pt, i) => (
            <rect
              key={pt.tempK}
              x={mapT(pt.tempK) - innerW2 / transport.length / 2}
              y={pad2.top}
              width={innerW2 / transport.length}
              height={innerH2}
              fill="transparent"
              onPointerEnter={() => setHoverTransIdx(i)}
            />
          ))}
          </svg>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 font-mono text-[11px] text-slate-600 tabular-nums" dir="ltr">
          <span>T={activeTrans.tempK} K</span>
          <span>
            Ion/Ioff=10^{activeTrans.log10OnOff} · μ={activeTrans.mobilityCm2Vs.toLocaleString('en-US')} cm²/Vs
          </span>
        </div>
      </div>
    </div>
  );
}
