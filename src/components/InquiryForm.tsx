import { useState } from 'react';
import {
  InquiryFormInput,
  InquiryValidationErrors,
  validateInquiryForm,
} from '../utils/graphenePhysics';

export function InquiryForm() {
  const [form, setForm] = useState<InquiryFormInput>({
    name: '',
    email: '',
    organization: '',
    focus: 'architecture',
  });
  const [errors, setErrors] = useState<InquiryValidationErrors>({});
  const [submittedSummary, setSubmittedSummary] = useState<InquiryFormInput | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateInquiryForm(form);
    if (!result.valid) {
      setErrors(result.errors);
      setSubmittedSummary(null);
      return;
    }
    setErrors({});
    setSubmittedSummary({ ...form });
  };

  return (
    <section id="contact" className="bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-medium text-slate-500">04. الشراكة والبحث والتطوير</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              شارك في تأسيس الجيل الكربوني لشرائح الذكاء الاصطناعي
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              اطلب الورقة الهندسية التفصيلية لبنية الغرافين ثنائية الأبعاد، أو تواصل لترتيب
              شراكة بحثية في مجال الطباعة النانوية واختبار الرقائق التجريبية.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-8 lg:col-span-7">
            {submittedSummary ? (
              <div
                role="status"
                className="rounded-lg border border-emerald-200 bg-white p-6 text-slate-900"
              >
                <div className="text-sm font-semibold text-emerald-700">
                  ● تم تسجيل طلب الدراسة التقنية بنجاح
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  شكراً لك، {submittedSummary.name} ({submittedSummary.organization}). تم حفظ
                  طلبك المرتبط بالبريد{' '}
                  <span className="font-mono text-slate-800" dir="ltr">
                    {submittedSummary.email}
                  </span>{' '}
                  للمراجعة الهندسية.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedSummary(null);
                    setForm({ name: '', email: '', organization: '', focus: 'architecture' });
                  }}
                  className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  إرسال طلب آخر
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="inquiry-name" className="block text-sm font-medium text-slate-800">
                      الاسم الكامل
                    </label>
                    <input
                      id="inquiry-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="مثال: طارق المنصور"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs font-medium text-rose-600">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="inquiry-email" className="block text-sm font-medium text-slate-800">
                      البريد الإلكتروني
                    </label>
                    <input
                      id="inquiry-email"
                      type="email"
                      dir="ltr"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="name@lab.org"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs font-medium text-rose-600">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="inquiry-org" className="block text-sm font-medium text-slate-800">
                      الجهة أو التخصص البحثي
                    </label>
                    <input
                      id="inquiry-org"
                      type="text"
                      value={form.organization}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, organization: e.target.value }))
                      }
                      placeholder="مختبر مواد النانو / مستثمر تقني"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                    />
                    {errors.organization && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {errors.organization}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="inquiry-focus" className="block text-sm font-medium text-slate-800">
                      مسار التعاون
                    </label>
                    <select
                      id="inquiry-focus"
                      value={form.focus}
                      onChange={(e) => setForm((prev) => ({ ...prev, focus: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                    >
                      <option value="architecture">مراجعة المعمارية السداسية</option>
                      <option value="fab">شراكة تصنيع رقائق CVD</option>
                      <option value="investment">تمويل النموذج المخبري الأولي</option>
                    </select>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white whitespace-nowrap transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 cursor-pointer"
                  >
                    إرسال طلب الدراسة التقنية
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
