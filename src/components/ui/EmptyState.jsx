export default function EmptyState({
  icon = 'inbox',
  title = 'No records found',
  description = 'There are currently no items matching your criteria.',
  action,
  actionLabel,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-white border border-[#edf2f7] shadow-xs ${className}`}
    >
      <div className="h-16 w-16 rounded-3xl bg-gradient-to-tr from-sky-50 to-indigo-50 border border-sky-100 flex items-center justify-center text-sky-500 mb-4 shadow-xs">
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>
      <h4 className="text-base font-bold text-[#0f172a]">{title}</h4>
      <p className="text-sm text-[#64748b] max-w-sm mt-1 mb-5">{description}</p>
      {action && actionLabel && (
        <button
          type="button"
          onClick={action}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
