export default function StudentPlaceholder({ title }) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-12 flex flex-col items-center justify-center text-center gap-3">
      <span className="material-symbols-outlined text-[48px] text-[#cbd5e1]">construction</span>
      <p className="text-[#0f172a] font-semibold">{title}</p>
      <p className="text-sm text-[#64748b]">This page is coming soon.</p>
    </div>
  );
}
