const EQUATIONS = [
  {
    index: '01.',
    title: 'علاقة تشتت ديراك وفجوة الشريط النانوي',
    formula: 'E(k) = ± √[ (ℏ · v_F · k)² + (E_g / 2)² ] ,   E_g ≈ 1.38 eV·nm / W',
    explanation:
      'في الغرافين غير المقيد تكون E_g = 0 عند نقطة ديراك. تقييد الإلكترونات داخل شريط نانوي بعرض W نانومتر يفتح فجوة طاقة متناسبة عكسياً مع العرض.',
  },
  {
    index: '02.',
    title: 'نفق كلاين ونسبة التبديل الكمّي',
    formula: 'T(E) = exp(−2 κ_evanescent · d) ,   I_on / I_off ≈ exp( E_g / 2k_B T ) − α_tunnel',
    explanation:
      'الإلكترونات عديمة الكتلة تخترق الحواجز بنفق كلاين دون توقف، لذا نحتاج لفجوة الطاقة E_g لقمع النفاذية وتحقيق تبديل منطقي مستقر.',
  },
  {
    index: '03.',
    title: 'تشتت بولتزمان وقاعدة ماثيسن',
    formula: '1 / τ_total = 1 / τ_acoustic(T) + 1 / τ_optical(T) + 1 / τ_edge(W)',
    explanation:
      'يحدد زمن الاسترخاء الكلي τ_total حركية الإلكترون μ والمسار الحر المتوسط λ_mfp للتمييز بين النقل الباليستي الكمّي والنقل التصادمي.',
  },
  {
    index: '04.',
    title: 'الديناميكا الكهربائية THz والسعة الكمية',
    formula: 'C_Q = 2e²|E_F| / (π ℏ² v_F²) ,   L_K = ℏ R_Q / (2 v_F W_ch)',
    explanation:
      'تحكم السعة الكمية والحث الحركي سرعة انتشار الإشارة البلازمونية وزمن التأخير بالبيكوثانية عند العمل بترددات التيراهيرتز.',
  },
  {
    index: '05.',
    title: 'معادلة فورييه للانتشار الحراري وتوليد الإنتروبيا',
    formula: '∂T/∂t = α ∇²T + q/(ρ c_p d) − h(T−T₀) ,   dS/dt = ∫ κ |∇T|² / T² dV',
    explanation:
      'يحل المحاكي المعادلة عددياً على شبكة 16×8 مع حساب التدرج الحراري ومعدل توليد الإنتروبيا لإثبات تفوق الغرافين حرارياً على السيليكون.',
  },
  {
    index: '06.',
    title: 'الحوسبة المصفوفية وقانون الضوضاء الحرارية',
    formula: 'I_i = Σ_j [ G_ij(V_g) · V_j ] + η_th ,   σ_th = √(4 · k_B · T · Δf / G)',
    explanation:
      'تنفذ الشبكة السداسية عمليات ضرب المصفوفات التناظرية عبر قانون أوم وكيرشوف مع حساب نسبة الخطأ الناتج عن التسرب وضوضاء جونسون-نايكويست.',
  },
];

export function PhysicsEquationsSection() {
  return (
    <section id="equations" className="border-b border-slate-200 bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-medium text-slate-500">02. النموذج الرياضي الحاكم للمحاكاة</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            المعادلات الفيزيائية الست التي تشغّل الشريحة
          </h2>
          <p className="mt-3 text-base text-slate-600">
            كل رقم ومنحنى في المختبر أعلاه مشتق حسابياً لحظة بلحظة من هذه المنظومة الفيزيائية المتكاملة.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {EQUATIONS.map((eq) => (
            <div key={eq.index} className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-base font-bold text-slate-900">
                <span className="ml-2 font-mono text-sky-700" dir="ltr">
                  {eq.index}
                </span>{' '}
                {eq.title}
              </h3>
              <div
                className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-xs font-medium text-slate-900"
                dir="ltr"
              >
                {eq.formula}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{eq.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
