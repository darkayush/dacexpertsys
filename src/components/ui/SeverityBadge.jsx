export default function SeverityBadge({ severity = 'low' }) {
  const norm = String(severity || '').toLowerCase();

  let bg = 'bg-slate-100 text-slate-600';
  if (norm.includes('critical')) {
    bg = 'bg-[#ffe4e6] text-[#e11d48]';
  } else if (norm.includes('high')) {
    bg = 'bg-[#ffeae6] text-[#ea580c]';
  } else if (norm.includes('med')) {
    bg = 'bg-[#fef3c7] text-[#d97706]';
  } else if (norm.includes('low')) {
    bg = 'bg-[#f1f5f9] text-[#64748b]';
  }

  const label = norm.charAt(0).toUpperCase() + norm.slice(1);

  return (
    <span
      className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${bg} select-none`}
    >
      {label || 'Low'}
    </span>
  );
}
