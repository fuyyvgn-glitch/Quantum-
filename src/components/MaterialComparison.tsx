import { useState } from 'react';
import { Layers } from 'lucide-react';
import { MATERIAL_PROFILES, MaterialId, MaterialProfile } from '../utils/graphenePhysics';

const LATTICE_IMAGE_PATH = '/src/assets/images/graphene_lattice_macro_1795788286998.jpg';

const RADAR_AXES: { key: keyof MaterialProfile['scores']; label: string }[] = [
  { key: 'conductivity', label: 'التوصيل الإلكتروني' },
  { key: 'thermal', label: 'التبديد الحراري' },
  { key: 'density', label: 'الكثافة السطحية' },
  { key: 'abundanceCost', label: 'الوفرة والتكلفة' },
  { key: 'logicControl', label: 'التحكم المنطقي' },
  { key: 'scalability', label: 'قابلية التصنيع' },
];

function computePolygonPoints(
  scores: MaterialProfile['scores'],
  cx: number,
  cy: number,
  maxRadius: number
): string {
  return RADAR_AXES.map((axis, idx) => {
    const angle = (Math.PI * 2 * idx) / RADAR_AXES.length - Math.PI / 2;
    const r = (scores[axis.key] / 100) * maxRadius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export function MaterialComparison() {
  const [selectedId, setSelectedId] = useState<MaterialId>('graphene');
  const [imgFailed, setImgFailed] = useState(false);

  const selectedMaterial =
    MATERIAL_PROFILES.find((m) => m.id === selectedId) ?? MATERIAL_PROFILES[0];
  const grapheneBaseline = MATERIAL_PROFILES[0];

  const cx = 220;
  const cy = 175;
  const maxRadius = 104;

  return (
    <section id="materials" className="border-b border-slate-200 bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-slate-500">02. تحليل المواد البديلة</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              لماذا الغرافين الأحادي بدل الغرافيت أو فوليرين C60؟
            </h2>
            <p className="mt-3 text-base text-slate-600">
              رغم اشتراكها في ذرات الكربون، تختلف البنية الهندسية جذرياً في حركة الإلكترونات
              وتبديد الحرارة وكفاءة المساحة على مستوى الشريحة.
            </p>
          </div>

          <div
            className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 self-start"
            role="tablist"
            aria-label="اختيار المادة للمقارنة"
          >
            {MATERIAL_PROFILES.map((mat) => {
              const active = mat.id === selectedId;
              return (
                <button
                  key={mat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedId(mat.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mat.nameAr}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* Radar Chart Panel */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-6 lg:col-span-6">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>مخطط التقييم الهندسي (0 – 100)</span>
                <span className="font-mono" dir="ltr">
                  {selectedMaterial.formula}
                </span>
              </div>

              <div className="mt-4 flex justify-center">
                <svg
                  viewBox="0 0 440 350"
                  className="h-auto w-full max-w-md"
                  role="img"
                  aria-label={`مخطط مقارنة خصائص ${selectedMaterial.nameAr}`}
                >
                  {/* Concentric reference hexagons */}
                  {[0.25, 0.5, 0.75, 1].map((scale) => {
                    const pts = RADAR_AXES.map((_, idx) => {
                      const angle = (Math.PI * 2 * idx) / RADAR_AXES.length - Math.PI / 2;
                      const x = cx + maxRadius * scale * Math.cos(angle);
                      const y = cy + maxRadius * scale * Math.sin(angle);
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    }).join(' ');
                    return (
                      <polygon
                        key={scale}
                        points={pts}
                        fill="none"
                        stroke="#CBD5E1"
                        strokeWidth={1}
                      />
                    );
                  })}

                  {/* Radial axis lines & labels */}
                  {RADAR_AXES.map((axis, idx) => {
                    const angle = (Math.PI * 2 * idx) / RADAR_AXES.length - Math.PI / 2;
                    const x2 = cx + maxRadius * Math.cos(angle);
                    const y2 = cy + maxRadius * Math.sin(angle);
                    const lx = cx + (maxRadius + 36) * Math.cos(angle);
                    const ly = cy + (maxRadius + 24) * Math.sin(angle);
                    return (
                      <g key={axis.key}>
                        <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#CBD5E1" strokeWidth={1} />
                        <text
                          x={lx}
                          y={ly}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-slate-600 text-[11px] font-medium"
                        >
                          {axis.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Dashed Graphene reference polygon when comparing another material */}
                  {selectedId !== 'graphene' && (
                    <polygon
                      points={computePolygonPoints(grapheneBaseline.scores, cx, cy, maxRadius)}
                      fill="none"
                      stroke="#64748B"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  )}

                  {/* Selected Material polygon */}
                  <polygon
                    points={computePolygonPoints(selectedMaterial.scores, cx, cy, maxRadius)}
                    fill="rgba(2, 132, 199, 0.18)"
                    stroke="#0284C7"
                    strokeWidth={2}
                  />
                </svg>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-slate-600">
              <span>المسار الأزرق المتصل: {selectedMaterial.nameAr}</span>
              {selectedId !== 'graphene' && (
                <span>الخط المتقطع: خط أساس الغرافين الأحادي</span>
              )}
            </div>
          </div>

          {/* Selected Material Details + Lattice Render */}
          <div className="flex flex-col justify-between gap-6 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
            <div>
              <div className="text-xs text-slate-500">{selectedMaterial.structureAr}</div>
              <h3 className="mt-1 text-xl font-bold text-slate-900">{selectedMaterial.nameAr}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {selectedMaterial.summaryAr}
              </p>
              <p className="mt-3 rounded-lg bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700 border border-slate-200">
                {selectedMaterial.limitationOrAdvantageAr}
              </p>
            </div>

            <figure className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {!imgFailed ? (
                <img
                  src={LATTICE_IMAGE_PATH}
                  alt="بنية الشبكة السداسية للغرافين فوق مسارات التوصيل الكربونية"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-slate-100 p-6 text-slate-500">
                  <Layers className="h-8 w-8 text-sky-700" />
                  <span className="text-xs font-medium">الشبكة السداسية أحادية الذرة (sp²)</span>
                </div>
              )}
            </figure>
          </div>
        </div>

        {/* Quantitative Comparison Table */}
        <div className="mt-10 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] border-collapse text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-4 py-3.5">المادة</th>
                <th className="px-4 py-3.5">التوصيل الحراري</th>
                <th className="px-4 py-3.5">حركية الإلكترون</th>
                <th className="px-4 py-3.5">فجوة الطاقة</th>
                <th className="px-4 py-3.5">التكلفة الأولية / كغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {MATERIAL_PROFILES.map((row) => {
                const isSelected = row.id === selectedId;
                return (
                  <tr
                    key={row.id}
                    className={isSelected ? 'bg-sky-50/60' : 'hover:bg-slate-50/70'}
                  >
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className="text-right hover:text-sky-700 cursor-pointer"
                      >
                        {row.nameAr}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
                      {row.thermalConductivityWmK.toLocaleString('en-US')} W/m·K
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
                      {row.electronMobilityCm2Vs.toLocaleString('en-US')} cm²/V·s
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
                      {row.bandgapText}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
                      ${row.rawCostPerKgUsd.toLocaleString('en-US')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
