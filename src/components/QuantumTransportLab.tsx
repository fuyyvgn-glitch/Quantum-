import { useEffect, useRef } from 'react';
import {
  BoltzmannTransportResult,
  computeKleinTunnelingProfile,
  computeThzElectrodynamics,
  EntropyAndGradientResult,
} from '../utils/multiPhysicsEngine';
import { PhysicsMetricsSnapshot, PhysicsSimParams } from '../utils/quantumGrapheneSim';

interface QuantumTransportLabProps {
  params: PhysicsSimParams;
  metrics: PhysicsMetricsSnapshot;
  boltzmann: BoltzmannTransportResult;
  entropy: EntropyAndGradientResult;
  isRunning: boolean;
}

export function QuantumTransportLab({
  params,
  metrics,
  boltzmann,
  entropy,
  isRunning,
}: QuantumTransportLabProps) {
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef(0);

  const { points: kleinPoints, barrierSuppressionPct } = computeKleinTunnelingProfile(
    metrics.bandgapEv,
    params.gateVoltageV
  );
  const thz = computeThzElectrodynamics(params, boltzmann);

  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cachedW = 640;
    let cachedH = 190;
    let rafId = 0;
    let lastDraw = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cachedW = Math.max(300, Math.floor(rect.width));
      cachedH = Math.max(150, Math.floor(rect.height));
      if (canvas.width !== cachedW * dpr || canvas.height !== cachedH * dpr) {
        canvas.width = cachedW * dpr;
        canvas.height = cachedH * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawWave = (phase: number) => {
      const w = cachedW;
      const h = cachedH;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#0B1120';
      ctx.fillRect(0, 0, w, h);

      const barrierStart = w * 0.42;
      const barrierEnd = w * 0.58;
      const barrierFactor = Math.min(1, metrics.bandgapEv / 0.5);
      const transmissionAmp = Math.max(0.08, 1 - barrierFactor * 0.88);

      // Gate potential barrier region
      ctx.fillStyle = `rgba(2, 132, 199, ${0.12 + barrierFactor * 0.25})`;
      ctx.fillRect(barrierStart, 18, barrierEnd - barrierStart, h - 40);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(barrierStart, 18, barrierEnd - barrierStart, h - 40);
      ctx.setLineDash([]);

      // Baseline y
      const midY = h * 0.56;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.beginPath();
      ctx.moveTo(16, midY);
      ctx.lineTo(w - 16, midY);
      ctx.stroke();

      // Probability density |psi(x,t)|^2 wavepacket
      ctx.beginPath();
      for (let x = 16; x <= w - 16; x += 2) {
        let amp = 1.0;
        let kPhase = x * 0.09 - phase * (1 + params.clockThz * 0.25);

        if (x < barrierStart) {
          // Incident + reflected standing wave interference
          const refl = 1 - transmissionAmp;
          const interference = 1 + refl * 0.7 * Math.cos(x * 0.18 + phase * 1.4);
          amp = 0.72 * interference;
        } else if (x <= barrierEnd) {
          // Evanescent decay inside bandgap barrier
          const progress = (x - barrierStart) / (barrierEnd - barrierStart);
          amp = Math.max(transmissionAmp, Math.exp(-3.2 * barrierFactor * progress));
        } else {
          // Transmitted wave
          amp = transmissionAmp * 0.85;
        }

        const psi = Math.sin(kPhase) * amp * (h * 0.26);
        const py = midY - Math.abs(psi) * 0.85 - psi * 0.25;
        if (x === 16) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.fillText('Incident |ψ_in|²', 20, 32);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7DD3FC';
      ctx.fillText(`Gate Barrier Eg=${metrics.bandgapEv.toFixed(2)}eV`, w * 0.5, 32);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`Transmitted T=${(transmissionAmp * 100).toFixed(0)}%`, w - 20, 32);
    };

    let isVisible = true;
    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              isVisible = entry ? entry.isIntersecting : true;
              if (isVisible && isRunning && !rafId) {
                rafId = window.requestAnimationFrame(tick);
              }
            },
            { threshold: 0.05 }
          )
        : null;
    if (observer) observer.observe(canvas);

    resize();
    drawWave(phaseRef.current);

    const tick = (now: number) => {
      if (!isVisible || !isRunning) {
        rafId = 0;
        return;
      }
      if (now - lastDraw >= 40) {
        lastDraw = now;
        phaseRef.current += 0.14;
        drawWave(phaseRef.current);
      }
      rafId = window.requestAnimationFrame(tick);
    };

    if (isRunning) {
      rafId = window.requestAnimationFrame(tick);
    }

    const onResize = () => {
      resize();
      drawWave(phaseRef.current);
    };
    window.addEventListener('resize', onResize);

    return () => {
      if (observer) observer.disconnect();
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, [metrics.bandgapEv, params.clockThz, isRunning]);

  // SVG Klein Transmission chart geometry
  const kw = 360;
  const kh = 195;
  const kPad = { top: 18, right: 16, bottom: 28, left: 38 };
  const mapEnergy = (e: number) => kPad.left + ((e + 0.6) / 1.2) * (kw - kPad.left - kPad.right);
  const mapTrans = (t: number) => kPad.top + (1 - t) * (kh - kPad.top - kPad.bottom);

  const gappedPath = kleinPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapEnergy(p.energyEv).toFixed(1)} ${mapTrans(p.gappedTransmission).toFixed(1)}`)
    .join(' ');
  const pristinePath = kleinPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapEnergy(p.energyEv).toFixed(1)} ${mapTrans(p.pristineKleinTransmission).toFixed(1)}`)
    .join(' ');

  // SVG THz Waveform geometry
  const tw = 360;
  const th = 195;
  const tPad = { top: 18, right: 16, bottom: 28, left: 38 };
  const maxV = Math.max(0.3, params.gateVoltageV * 1.15);
  const mapTime = (t: number) => tPad.left + (t / 1.44) * (tw - tPad.left - tPad.right);
  const mapVolt = (v: number) => tPad.top + ((maxV - v) / (2 * maxV)) * (th - tPad.top - tPad.bottom);

  const vInPath = thz.waveform
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapTime(p.tPs).toFixed(1)} ${mapVolt(p.vIn).toFixed(1)}`)
    .join(' ');
  const vOutPath = thz.waveform
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapTime(p.tPs).toFixed(1)} ${mapVolt(p.vOut).toFixed(1)}`)
    .join(' ');

  return (
    <div className="space-y-4">
      {/* Live Quantum Wavepacket Tunneling Canvas */}
      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
        <canvas
          ref={waveCanvasRef}
          data-testid="quantum-wave-canvas"
          className="block h-44 w-full"
          aria-label="محاكاة كثافة الاحتمال الكمّي للموجة الإلكترونية عبر حاجز البوابة"
        />
      </div>

      {/* Klein Transmission & THz Signal Integrity Charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900">نفق كلاين مقابل حجب فجوة الطاقة T(E)</span>
            <span className="font-mono text-sky-700 tabular-nums" dir="ltr">
              Block: {barrierSuppressionPct}%
            </span>
          </div>
          <div dir="ltr" className="mt-2">
            <svg viewBox={`0 0 ${kw} ${kh}`} className="h-auto w-full" role="img" aria-label="احتمالية النفاذ الكمي عبر حاجز البوابة">
              {[0, 0.5, 1].map((v) => (
                <g key={v}>
                  <line x1={kPad.left} y1={mapTrans(v)} x2={kw - kPad.right} y2={mapTrans(v)} stroke="#E2E8F0" />
                  <text x={kPad.left - 6} y={mapTrans(v) + 3} textAnchor="end" className="fill-slate-500 font-mono text-[9px]">
                    {v.toFixed(1)}
                  </text>
                </g>
              ))}
              {[-0.5, 0, 0.5].map((e) => (
                <text key={e} x={mapEnergy(e)} y={kh - 10} textAnchor="middle" className="fill-slate-500 font-mono text-[9px]">
                  {e} eV
                </text>
              ))}
              <path d={pristinePath} fill="none" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={1.4} />
              <path d={gappedPath} fill="none" stroke="#0284C7" strokeWidth={2.2} />
            </svg>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900">استجابة الإشارة الكهرومغناطيسية THz</span>
            <span className="font-mono text-sky-700 tabular-nums" dir="ltr">
              τ_delay: {thz.propagationDelayPs} ps
            </span>
          </div>
          <div dir="ltr" className="mt-2">
            <svg viewBox={`0 0 ${tw} ${th}`} className="h-auto w-full" role="img" aria-label="موجة الجهد عند التردد فائق السرعة">
              <line x1={tPad.left} y1={mapVolt(0)} x2={tw - tPad.right} y2={mapVolt(0)} stroke="#CBD5E1" />
              {[0, 0.7, 1.4].map((t) => (
                <text key={t} x={mapTime(t)} y={th - 10} textAnchor="middle" className="fill-slate-500 font-mono text-[9px]">
                  {t} ps
                </text>
              ))}
              <path d={vInPath} fill="none" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={1.4} />
              <path d={vOutPath} fill="none" stroke="#0284C7" strokeWidth={2.2} />
            </svg>
          </div>
        </div>
      </div>

      {/* Boltzmann & Electrodynamics Telemetry Matrix */}
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs sm:grid-cols-4">
        <div>
          <div className="text-slate-500">زمن الاسترخاء الكلي (τ)</div>
          <div className="mt-1 font-mono font-semibold text-slate-900 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
            {boltzmann.tauTotalFs} fs
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">{boltzmann.regimeAr}</div>
        </div>
        <div>
          <div className="text-slate-500">كثافة الحاملات / فيرمي</div>
          <div className="mt-1 font-mono font-semibold text-slate-900 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
            {boltzmann.carrierDensity1e12Cm2}×10¹² cm⁻²
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-500" dir="ltr" style={{ textAlign: 'right' }}>
            E_F = {boltzmann.fermiEnergyEv} eV
          </div>
        </div>
        <div>
          <div className="text-slate-500">السعة الكمية / الحث</div>
          <div className="mt-1 font-mono font-semibold text-slate-900 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
            {thz.quantumCapacitanceUfCm2} μF/cm²
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-500" dir="ltr" style={{ textAlign: 'right' }}>
            L_K = {thz.kineticInductancePhSq} pH/sq
          </div>
        </div>
        <div>
          <div className="text-slate-500">توليد الإنتروبيا الحراري</div>
          <div className="mt-1 font-mono font-semibold text-slate-900 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
            {entropy.entropyGenerationMwK} mW/K
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-500" dir="ltr" style={{ textAlign: 'right' }}>
            |∇T|_max = {entropy.maxGradientKMm} K/mm
          </div>
        </div>
      </div>
    </div>
  );
}
