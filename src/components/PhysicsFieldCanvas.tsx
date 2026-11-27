import { useEffect, useRef, useState } from 'react';
import {
  PhysicsMetricsSnapshot,
  PhysicsSimParams,
  THERMAL_GRID_COLS,
  THERMAL_GRID_ROWS,
} from '../utils/quantumGrapheneSim';

interface PhysicsFieldCanvasProps {
  thermalGrid: number[];
  params: PhysicsSimParams;
  metrics: PhysicsMetricsSnapshot;
  timeHistory: { step: number; peakTempK: number }[];
  isRunning: boolean;
}

interface ProbeReading {
  col: number;
  row: number;
  xMm: number;
  yMm: number;
  tempK: number;
  currentDensityAcm2: number;
}

function temperatureToRgb(tempK: number, minT: number, maxT: number): [number, number, number] {
  const ratio = Math.max(0, Math.min(1, (tempK - minT) / Math.max(15, maxT - minT)));
  // Discrete scientific ramp: Deep Slate-Cyan -> Sky Cyan -> Amber -> Crimson
  if (ratio < 0.33) {
    const t = ratio / 0.33;
    return [
      Math.round(15 + t * (14 - 15)),
      Math.round(45 + t * (165 - 45)),
      Math.round(95 + t * (233 - 95)),
    ];
  }
  if (ratio < 0.66) {
    const t = (ratio - 0.33) / 0.33;
    return [
      Math.round(14 + t * (245 - 14)),
      Math.round(165 + t * (158 - 165)),
      Math.round(233 + t * (11 - 233)),
    ];
  }
  const t = (ratio - 0.66) / 0.34;
  return [
    Math.round(245 + t * (225 - 245)),
    Math.round(158 + t * (29 - 158)),
    Math.round(11 + t * (72 - 11)),
  ];
}

export function PhysicsFieldCanvas({
  thermalGrid,
  params,
  metrics,
  timeHistory,
  isRunning,
}: PhysicsFieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [probe, setProbe] = useState<ProbeReading | null>(null);
  const pulsePhaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cachedW = 680;
    let cachedH = 340;
    let rafId = 0;
    let lastDraw = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cachedW = Math.max(320, Math.floor(rect.width));
      cachedH = Math.max(240, Math.floor(rect.height));
      if (canvas.width !== cachedW * dpr || canvas.height !== cachedH * dpr) {
        canvas.width = cachedW * dpr;
        canvas.height = cachedH * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = (phase: number) => {
      const w = cachedW;
      const h = cachedH;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#0B1120';
      ctx.fillRect(0, 0, w, h);

      // Finger-sized die footprint (55mm x 18mm scaled nicely inside viewport)
      const padX = 28;
      const padY = 26;
      const dieW = w - padX * 2;
      const dieH = h - padY * 2;
      const cellW = dieW / THERMAL_GRID_COLS;
      const cellH = dieH / THERMAL_GRID_ROWS;

      const minScaleT = Math.min(params.ambientTempK, 290);
      const maxScaleT = 440;

      // 1. Render solved 2D Fourier PDE thermal cells
      for (let r = 0; r < THERMAL_GRID_ROWS; r++) {
        for (let c = 0; c < THERMAL_GRID_COLS; c++) {
          const idx = r * THERMAL_GRID_COLS + c;
          const cellT = thermalGrid[idx] ?? params.ambientTempK;
          const [rr, gg, bb] = temperatureToRgb(cellT, minScaleT, maxScaleT);

          const x = padX + c * cellW;
          const y = padY + r * cellH;
          ctx.fillStyle = `rgba(${rr}, ${gg}, ${bb}, 0.72)`;
          ctx.fillRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
        }
      }

      // 2. Overlay graphene sp2 hexagonal lattice + quantum wave-packet propagation
      const hexR = Math.max(14, Math.min(20, dieW / 44));
      const hexW = Math.sqrt(3) * hexR;
      const hexVert = 1.5 * hexR;
      const hCols = Math.floor(dieW / hexW) + 1;
      const hRows = Math.floor(dieH / hexVert) + 1;

      ctx.save();
      ctx.beginPath();
      ctx.rect(padX, padY, dieW, dieH);
      ctx.clip();

      for (let hr = 0; hr <= hRows; hr++) {
        for (let hc = 0; hc <= hCols; hc++) {
          const cx = padX + hc * hexW + (hr % 2 === 1 ? hexW / 2 : 0);
          const cy = padY + hr * hexVert;

          const wave =
            0.5 +
            0.5 *
              Math.sin(
                (cx - padX) * 0.035 -
                  phase * (0.9 + params.clockThz * 0.3) +
                  Math.cos((cy - padY) * 0.05) * 2
              );

          const activeAlpha = wave > 0.65 ? 0.55 : 0.16;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const ang = (Math.PI / 180) * (60 * i - 30);
            const px = cx + hexR * Math.cos(ang);
            const py = cy + hexR * Math.sin(ang);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle =
            wave > 0.65
              ? `rgba(224, 242, 254, ${activeAlpha})`
              : `rgba(148, 163, 184, ${activeAlpha})`;
          ctx.lineWidth = wave > 0.65 ? 1.25 : 0.7;
          ctx.stroke();
        }
      }
      ctx.restore();

      // Die outline & millimeter ruler ticks
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(padX, padY, dieW, dieH);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.fillText('0 mm', padX, padY - 8);
      ctx.textAlign = 'right';
      ctx.fillText('55 mm (X)', padX + dieW, padY - 8);
      ctx.textAlign = 'left';
      ctx.fillText('18 mm (Y)', padX, padY + dieH + 16);

      // Highlight hovered PDE cell
      if (probe) {
        const hx = padX + probe.col * cellW;
        const hy = padY + probe.row * cellH;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx, hy, cellW, cellH);
      }
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
    render(pulsePhaseRef.current);

    const tick = (now: number) => {
      if (!isVisible || !isRunning) {
        rafId = 0;
        return;
      }
      if (now - lastDraw >= 40) {
        lastDraw = now;
        pulsePhaseRef.current += 0.09;
        render(pulsePhaseRef.current);
      }
      rafId = window.requestAnimationFrame(tick);
    };

    if (isRunning) {
      rafId = window.requestAnimationFrame(tick);
    }

    const onResize = () => {
      resize();
      render(pulsePhaseRef.current);
    };
    window.addEventListener('resize', onResize);

    return () => {
      if (observer) observer.disconnect();
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, [thermalGrid, params, probe, isRunning]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const padX = 28;
    const padY = 26;
    const dieW = rect.width - padX * 2;
    const dieH = rect.height - padY * 2;
    const relX = e.clientX - rect.left - padX;
    const relY = e.clientY - rect.top - padY;

    if (relX < 0 || relY < 0 || relX > dieW || relY > dieH) {
      setProbe(null);
      return;
    }

    const col = Math.min(
      THERMAL_GRID_COLS - 1,
      Math.max(0, Math.floor((relX / dieW) * THERMAL_GRID_COLS))
    );
    const row = Math.min(
      THERMAL_GRID_ROWS - 1,
      Math.max(0, Math.floor((relY / dieH) * THERMAL_GRID_ROWS))
    );
    const idx = row * THERMAL_GRID_COLS + col;
    const tempK = thermalGrid[idx] ?? params.ambientTempK;
    const xMm = Number(((relX / dieW) * 55).toFixed(1));
    const yMm = Number(((relY / dieH) * 18).toFixed(1));
    const currentDensityAcm2 = Number(
      ((metrics.totalPowerWatts / Math.max(0.2, params.gateVoltageV)) * 0.14 * (params.utilizationPct / 100)).toFixed(2)
    );

    setProbe({ col, row, xMm, yMm, tempK: Number(tempK.toFixed(1)), currentDensityAcm2 });
  };

  // Build mini SVG time-series path for T_peak(t)
  const chartW = 540;
  const chartH = 92;
  const minChartT = Math.min(280, params.ambientTempK - 10);
  const maxChartT = Math.max(450, ...timeHistory.map((p) => p.peakTempK + 15));
  const polyPoints = timeHistory
    .map((pt, i) => {
      const x = timeHistory.length > 1 ? (i / (timeHistory.length - 1)) * (chartW - 24) + 12 : 12;
      const normY = (pt.peakTempK - minChartT) / Math.max(20, maxChartT - minChartT);
      const y = chartH - 14 - normY * (chartH - 26);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="space-y-4">
      <div className="relative h-72 w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950 sm:h-80">
        <canvas
          ref={canvasRef}
          data-testid="physics-field-canvas"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setProbe(null)}
          className="block h-full w-full cursor-crosshair"
          aria-label="خريطة الانتشار الحراري ثنائية الأبعاد والموجة الكمية عبر شبكة الغرافين"
        />

        <div
          className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-slate-700 bg-slate-950/90 px-3 py-1.5 font-mono text-xs text-slate-100 tabular-nums"
          dir="ltr"
        >
          {probe ? (
            <span>
              ({probe.xMm}mm, {probe.yMm}mm) · T={probe.tempK} K · J={probe.currentDensityAcm2} A/cm²
            </span>
          ) : (
            <span>
              PDE 16×8 · {params.thermalMaterial === 'graphene' ? 'κ=5000 W/m·K' : 'κ=148 W/m·K'} · T_peak={metrics.peakTempK} K
            </span>
          )}
        </div>
      </div>

      {/* Discrete Color-Step Thermal Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-600">
        <span>مقياس الحرارة الفيزيائي (PDE 2D)</span>
        <div className="flex items-center gap-2 font-mono tabular-nums" dir="ltr">
          <span>{Math.min(params.ambientTempK, 290)} K</span>
          <div className="flex h-2.5 w-36 overflow-hidden rounded-xs border border-slate-300">
            <span className="flex-1 bg-[#0f2d5f]" />
            <span className="flex-1 bg-[#0ea5e9]" />
            <span className="flex-1 bg-[#f59e0b]" />
            <span className="flex-1 bg-[#e11d48]" />
          </div>
          <span>440 K</span>
        </div>
      </div>

      {/* Time-Series Thermal Transient Trajectory */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>المسار الزمني لذروة الحرارة على الشريحة T_peak(t)</span>
          <span className="font-mono tabular-nums" dir="ltr">
            t = {timeHistory.length * 10} ns · T_max = {metrics.peakTempK} K ({metrics.peakTempC}°C)
          </span>
        </div>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="mt-2 h-20 w-full" aria-label="مخطط تطور درجة الحرارة مع الزمن">
          <line x1={12} y1={chartH - 14} x2={chartW - 12} y2={chartH - 14} stroke="#CBD5E1" strokeWidth={1} />
          <line x1={12} y1={14} x2={chartW - 12} y2={14} stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth={1} />
          {timeHistory.length > 1 && (
            <polyline
              fill="none"
              stroke={metrics.statusLevel === 'critical' ? '#E11D48' : '#0284C7'}
              strokeWidth={2}
              points={polyPoints}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
