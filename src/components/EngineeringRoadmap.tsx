import { useState } from 'react';
import { Microscope } from 'lucide-react';

const WAFER_IMAGE_PATH = '/src/assets/images/graphene_wafer_lab_1795788286418.jpg';

const ENGINEERING_STEPS = [
  {
    index: '01.',
    title: 'فتح فجوة الطاقة المنطقية بدون إضافة عناصر أخرى',
    detail:
      'الغرافين النقي شبه موصل معدني لا يتوقف تياره بسهولة. الحل هو نقش أشرطة نانوية (GNR) بعرض دون 5 نانومتر أو تدوير طبقتين من الغرافين بزاوية كمية دقيقة لخلق حالات إغلاق وفتح رقمية بالكربون فقط.',
  },
  {
    index: '02.',
    title: 'الترسيب الأحادي الخالي من العيوب (CVD) على مساحة 10 سم²',
    detail:
      'لكي تعمل تريليونات الفجوات السداسية بتناغم في شريحة بحجم الإصبع، يجب نمو رقاقة غرافين ببلورة متصلة دون شوائب حدودية تشتت الإلكترونات أثناء عمليات ضرب المصفوفات.',
  },
  {
    index: '03.',
    title: 'توجيه التوازي الكمي عبر الفجوات السداسية',
    detail:
      'توظيف كل حلقة كربون سداسية ضمن عنقود توجيه متوازي يدمج الذاكرة والحوسبة في الطبقة ذاتها (In-Memory Compute)، لتجاوز عنق زجاجة نقل البيانات التقليدي بين المعالج والذاكرة.',
  },
];

export function EngineeringRoadmap() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <section id="challenges" className="border-b border-slate-200 bg-slate-50 py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <figure className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              {!imgFailed ? (
                <img
                  src={WAFER_IMAGE_PATH}
                  alt="منصة الفحص البصري لرقاقة الغرافين الأحادي داخل غرفة النظافة"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="aspect-[4/3] w-full flex-1 object-cover lg:h-full"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full flex-1 flex-col items-center justify-center gap-3 bg-slate-100 p-8 text-slate-600">
                  <Microscope className="h-9 w-9 text-sky-700" />
                  <span className="text-xs font-medium">مختبر الفحص البصري للغرافين الأحادي</span>
                </div>
              )}
              <figcaption className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                مرحلة الفحص البصري لرقائق الغرافين · تصنيع أحادي العنصر
              </figcaption>
            </figure>
          </div>

          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <p className="text-xs font-medium text-slate-500">03. المتطلبات الفيزيائية للتصنيع</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                من الفكرة إلى شريحة قابلة للتصنيع
              </h2>
              <p className="mt-3 text-base text-slate-600">
                رغم انخفاض تكلفة الكربون الخام ووفرته الهائلة، يتطلب بناء معالج ذكاء اصطناعي
                من الغرافين الخالص معالجة ثلاثة تحديات هندسية رئيسية في المختبر.
              </p>
            </div>

            <div className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {ENGINEERING_STEPS.map((step) => (
                <div key={step.index} className="p-5 sm:p-6">
                  <h3 className="text-base font-bold text-slate-900">
                    <span className="ml-2 font-mono text-sky-700" dir="ltr">
                      {step.index}
                    </span>{' '}
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
