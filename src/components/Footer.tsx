export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div className="text-sm font-bold text-slate-900">كربونكس</div>
        <nav aria-label="روابط التذييل" className="flex flex-wrap items-center gap-6 text-xs text-slate-500">
          <a href="#workbench" className="hover:text-slate-900">
            مختبر المحاكاة
          </a>
          <a href="#equations" className="hover:text-slate-900">
            المعادلات الفيزيائية
          </a>
          <a href="#materials" className="hover:text-slate-900">
            مقارنة المواد
          </a>
          <a href="#challenges" className="hover:text-slate-900">
            التحديات التصنيعية
          </a>
        </nav>
        <p className="text-xs text-slate-500">© 2026 كربونكس لمحاكاة شرائح الغرافين</p>
      </div>
    </footer>
  );
}
