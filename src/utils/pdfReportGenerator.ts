import {
  BoltzmannTransportResult,
  EntropyAndGradientResult,
  ThzElectrodynamicsResult,
} from './multiPhysicsEngine';
import { PhysicsMetricsSnapshot, PhysicsSimParams } from './quantumGrapheneSim';

export interface EngineeringEfficiencyAnalysis {
  siliconBaselineFjPerOp: number;
  energyGainFactor: number;
  thermalMarginPct: number;
  switchingReadinessAr: string;
  efficiencyGradeAr: string;
  recommendationsAr: string[];
}

export interface PhysicsReportPayload {
  generatedAtIso: string;
  params: PhysicsSimParams;
  metrics: PhysicsMetricsSnapshot;
  boltzmann: BoltzmannTransportResult;
  kleinSuppressionPct: number;
  thz: ThzElectrodynamicsResult;
  entropy: EntropyAndGradientResult;
  matrixRmsErrorPct: number;
  analysis: EngineeringEfficiencyAnalysis;
}

export function buildEngineeringReportData(input: {
  params: PhysicsSimParams;
  metrics: PhysicsMetricsSnapshot;
  boltzmann: BoltzmannTransportResult;
  kleinSuppressionPct: number;
  thz: ThzElectrodynamicsResult;
  entropy: EntropyAndGradientResult;
  matrixRmsErrorPct: number;
}): PhysicsReportPayload {
  const { params, metrics, boltzmann, kleinSuppressionPct, thz, entropy, matrixRmsErrorPct } =
    input;

  const siliconBaselineFjPerOp = 850;
  const energyGainFactor = Number(
    (siliconBaselineFjPerOp / Math.max(1, metrics.energyPerMacFj)).toFixed(2)
  );
  const thermalMarginPct = Math.max(
    0,
    Math.min(
      100,
      Math.round(((430 - metrics.peakTempK) / Math.max(20, 430 - params.ambientTempK)) * 100)
    )
  );

  let switchingReadinessAr = 'جاهز للمنطق الرقمي الدقيق (نسبة تبديل عالية)';
  if (metrics.onOffRatioExp < 2.5) {
    switchingReadinessAr = 'غير كافٍ للمنطق الرقمي (تسرّب تيار مرتفع)';
  } else if (metrics.onOffRatioExp < 3.8) {
    switchingReadinessAr = 'ملائم للحوسبة التناظرية والمصفوفات الهجينة';
  }

  let efficiencyGradeAr = 'كفاءة فائقة (دون عتبة السيليكون)';
  if (metrics.statusLevel === 'critical') {
    efficiencyGradeAr = 'حالة حرجة — يتطلب تعديل معاملات التشغيل';
  } else if (metrics.energyPerMacFj > siliconBaselineFjPerOp) {
    efficiencyGradeAr = 'استهلاك طاقة مرتفع — يُنصح بخفض جهد البوابة';
  } else if (metrics.statusLevel === 'warning') {
    efficiencyGradeAr = 'كفاءة متوسطة مع إجهاد حراري أو تسرب جزئي';
  }

  const recommendationsAr: string[] = [];
  if (params.ribbonWidthNm > 4.2) {
    recommendationsAr.push(
      `تضييق عرض الشريط النانوي من ${params.ribbonWidthNm.toFixed(1)} nm إلى حدود 2.5–3.5 nm لرفع فجوة الطاقة E_g وتقليل نفق كلاين.`
    );
  }
  if (params.thermalMaterial === 'silicon') {
    recommendationsAr.push(
      'استبدال المشتت الحراري للسيليكون (148 W/m·K) بطبقة غرافين نقية (5,000 W/m·K) لخفض الذروة الحرارية والتدرج.'
    );
  }
  if (metrics.peakTempK > 370) {
    recommendationsAr.push(
      `خفض التردد (${params.clockThz.toFixed(1)} THz) أو جهد البوابة (${params.gateVoltageV.toFixed(2)} V) للحفاظ على T_peak دون 370 K.`
    );
  }
  if (matrixRmsErrorPct > 4) {
    recommendationsAr.push(
      `رفع نسبة التبديل أو خفض درجة الحرارة المحيطة لتقليل خطأ الحوسبة المصفوفية (${matrixRmsErrorPct}%).`
    );
  }
  if (recommendationsAr.length === 0) {
    recommendationsAr.push(
      `نقطة التشغيل متوازنة: تحقق ${metrics.throughputTops} TOPS بكفاءة ${metrics.energyPerMacFj} fJ/OP وهامش أمان حراري ${thermalMarginPct}%.`
    );
  }

  return {
    generatedAtIso: new Date().toISOString(),
    params,
    metrics,
    boltzmann,
    kleinSuppressionPct,
    thz,
    entropy,
    matrixRmsErrorPct,
    analysis: {
      siliconBaselineFjPerOp,
      energyGainFactor,
      thermalMarginPct,
      switchingReadinessAr,
      efficiencyGradeAr,
      recommendationsAr,
    },
  };
}

function asciiBytes(str: string): Uint8Array {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    out[i] = str.charCodeAt(i) & 0xff;
  }
  return out;
}

/**
 * Wraps raw JPEG image bytes into a standards-compliant single-page PDF 1.4 document
 * with exact byte-offset xref table.
 */
export function buildPdfFromJpegBytes(
  jpegBytes: Uint8Array,
  pixelWidth: number,
  pixelHeight: number,
  pageWidthPt = 595.28,
  pageHeightPt = 841.89
): Uint8Array {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let cursor = 0;

  const pushChunk = (bytes: Uint8Array) => {
    chunks.push(bytes);
    cursor += bytes.length;
  };
  const pushAscii = (str: string) => pushChunk(asciiBytes(str));

  pushAscii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // 1: Catalog
  offsets.push(cursor);
  pushAscii('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  offsets.push(cursor);
  pushAscii('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // 3: Page
  offsets.push(cursor);
  pushAscii(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  // 4: Image XObject
  offsets.push(cursor);
  pushAscii(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushChunk(jpegBytes);
  pushAscii('\nendstream\nendobj\n');

  // 5: Page Content Stream
  const contentStream = `q ${pageWidthPt.toFixed(2)} 0 0 ${pageHeightPt.toFixed(2)} 0 0 cm /Im0 Do Q`;
  offsets.push(cursor);
  pushAscii(
    `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
  );

  // Xref table
  const xrefStart = cursor;
  pushAscii(`xref\n0 ${offsets.length + 1}\n`);
  pushAscii('0000000000 65535 f \n');
  for (const off of offsets) {
    pushAscii(`${String(off).padStart(10, '0')} 00000 n \n`);
  }

  pushAscii(
    `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  );

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const c of chunks) {
    result.set(c, pos);
    pos += c.length;
  }
  return result;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export async function generateAndDownloadPdfReport(report: PhysicsReportPayload): Promise<void> {
  if (typeof document === 'undefined') return;
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const width = 1240;
  const height = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // White A4 background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const margin = 64;
  const contentW = width - margin * 2;

  // Top Header Band
  drawRoundedRect(ctx, margin, 52, contentW, 132, 12, '#0F172A');
  ctx.fillStyle = '#FFFFFF';
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = 'bold 34px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('كربونكس — التقرير الهندسي والفيزيائي للشريحة', width - margin - 32, 108);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '18px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(
    'ملخص معاملات التشغيل، القياسات الكمّية والحرارية، وتحليل الكفاءة الهندسية (18 × 55 مم)',
    width - margin - 32,
    148
  );

  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#38BDF8';
  ctx.font = '16px "IBM Plex Mono", monospace';
  ctx.fillText(report.generatedAtIso.slice(0, 19).replace('T', ' ') + ' UTC', margin + 28, 108);

  // Section 1: Simulation Parameters
  let y = 230;
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 24px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('1. معاملات المحاكاة الفيزيائية الحالية', width - margin, y);

  y += 22;
  const paramRows = [
    ['عرض الشريط النانوي (W)', `${report.params.ribbonWidthNm.toFixed(1)} nm`],
    ['درجة الحرارة المحيطة (T_amb)', `${report.params.ambientTempK} K`],
    ['جهد البوابة الكهربائية (V_g)', `${report.params.gateVoltageV.toFixed(2)} V`],
    ['تردد التشغيل الكمّي (f)', `${report.params.clockThz.toFixed(1)} THz`],
    ['الفجوات السداسية النشطة', `${report.params.activePoresTrillions.toFixed(1)} T`],
    [
      'معامل التوصيل الحراري (κ)',
      report.params.thermalMaterial === 'graphene'
        ? 'Graphene (5,000 W/m·K)'
        : 'Silicon (148 W/m·K)',
    ],
  ];

  const colW = (contentW - 20) / 2;
  paramRows.forEach((row, idx) => {
    const col = idx % 2;
    const rowIdx = Math.floor(idx / 2);
    const rx = col === 0 ? width - margin - colW : margin;
    const ry = y + rowIdx * 62;
    drawRoundedRect(ctx, rx, ry, colW, 50, 8, '#F8FAFC', '#E2E8F0');

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#475569';
    ctx.font = '17px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(row[0], rx + colW - 18, ry + 31);

    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 17px "IBM Plex Mono", monospace';
    ctx.fillText(row[1], rx + 18, ry + 31);
  });

  // Section 2: Computed Physics Metrics
  y += 235;
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 24px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('2. القياسات الفيزيائية والكمّية المحسوبة', width - margin, y);

  y += 22;
  const metricCards = [
    ['فجوة الطاقة (E_g)', `${report.metrics.bandgapEv.toFixed(3)} eV`],
    ['نسبة التبديل (Ion/Ioff)', `10^${report.metrics.onOffRatioExp}`],
    ['حركية الإلكترون (μ)', `${report.metrics.mobilityCm2Vs.toLocaleString('en-US')} cm²/Vs`],
    ['أقصى حرارة (T_peak)', `${report.metrics.peakTempK} K (${report.metrics.peakTempC}°C)`],
    ['القدرة الحوسبية (TOPS)', `${report.metrics.throughputTops} TOPS`],
    ['كفاءة الطاقة (Energy/OP)', `${report.metrics.energyPerMacFj} fJ/OP`],
    ['حجب نفق كلاين', `${report.kleinSuppressionPct}%`],
    ['زمن الاسترخاء (τ_total)', `${report.boltzmann.tauTotalFs} fs`],
    ['زمن تأخير الإشارة (THz)', `${report.thz.propagationDelayPs} ps`],
    ['إجمالي الاستطاعة الحرارية', `${report.metrics.totalPowerWatts} W`],
    ['نسبة الإشارة للضوضاء (SNR)', `${report.metrics.snrDb} dB`],
    ['توليد الإنتروبيا (dS/dt)', `${report.entropy.entropyGenerationMwK} mW/K`],
  ];

  const cardW = (contentW - 32) / 3;
  metricCards.forEach((card, idx) => {
    const col = idx % 3;
    const rowIdx = Math.floor(idx / 3);
    const cx = width - margin - (col + 1) * cardW - col * 16;
    const cy = y + rowIdx * 88;
    drawRoundedRect(ctx, cx, cy, cardW, 76, 8, '#FFFFFF', '#CBD5E1');

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748B';
    ctx.font = '15px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(card[0], cx + cardW - 16, cy + 28);

    ctx.direction = 'ltr';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0284C7';
    ctx.font = 'bold 20px "IBM Plex Mono", monospace';
    ctx.fillText(card[1], cx + cardW - 16, cy + 58);
  });

  // Section 3: Engineering Efficiency Analysis
  y += 395;
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 24px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('3. تحليل الكفاءة الهندسية والتوصيات التشغيلية', width - margin, y);

  y += 22;
  drawRoundedRect(ctx, margin, y, contentW, 470, 12, '#F8FAFC', '#CBD5E1');

  // Grade & Switching Readiness
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(`التقييم العام: ${report.analysis.efficiencyGradeAr}`, width - margin - 28, y + 46);

  ctx.fillStyle = '#334155';
  ctx.font = '18px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(
    `الجاهزية المنطقية: ${report.analysis.switchingReadinessAr}  ·  خطأ الحوسبة المصفوفية: ${report.matrixRmsErrorPct.toFixed(2)}%`,
    width - margin - 28,
    y + 82
  );

  // Efficiency Gauge Bars
  const gauges = [
    {
      label: `الهامش الحراري الآمن (${report.analysis.thermalMarginPct}%)`,
      pct: report.analysis.thermalMarginPct,
      color: report.analysis.thermalMarginPct > 45 ? '#0284C7' : '#D97706',
    },
    {
      label: `كفاءة الطاقة مقارنة بالسيليكون 3nm (${report.analysis.energyGainFactor}× تحسن)`,
      pct: Math.min(100, Math.round((report.analysis.energyGainFactor / 4) * 100)),
      color: '#0F172A',
    },
    {
      label: `كفاءة حجب نفق كلاين عبر الفجوة (${report.kleinSuppressionPct}%)`,
      pct: Math.min(100, report.kleinSuppressionPct),
      color: '#0284C7',
    },
  ];

  gauges.forEach((g, idx) => {
    const gy = y + 124 + idx * 62;
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#1E293B';
    ctx.font = '16px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(g.label, width - margin - 28, gy);

    drawRoundedRect(ctx, margin + 28, gy + 12, contentW - 56, 14, 7, '#E2E8F0');
    const barW = Math.max(12, ((contentW - 56) * g.pct) / 100);
    drawRoundedRect(ctx, width - margin - 28 - barW, gy + 12, barW, 14, 7, g.color);
  });

  // Recommendations
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('التوصيات الهندسية المستخلصة:', width - margin - 28, y + 328);

  report.analysis.recommendationsAr.slice(0, 3).forEach((rec, idx) => {
    ctx.fillStyle = '#334155';
    ctx.font = '16px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(`• ${rec}`, width - margin - 28, y + 364 + idx * 34);
  });

  // Footer
  ctx.strokeStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.moveTo(margin, height - 92);
  ctx.lineTo(width - margin, height - 92);
  ctx.stroke();

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = '15px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(
    'كربونكس لمحاكاة معالجات الغرافين — تم توليد التقرير محلياً من الحل العددي للمعادلات الفيزيائية الست',
    width - margin,
    height - 54
  );

  // Convert canvas to JPEG bytes and wrap in valid PDF
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const base64 = dataUrl.split(',')[1] ?? '';
  const binaryStr = atob(base64);
  const jpegBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    jpegBytes[i] = binaryStr.charCodeAt(i);
  }

  const pdfBytes = buildPdfFromJpegBytes(jpegBytes, width, height);
  const pdfCopy = new Uint8Array(pdfBytes.length);
  pdfCopy.set(pdfBytes);
  const blob = new Blob([pdfCopy.buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `karbonix-physics-report-${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
