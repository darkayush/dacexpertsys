export default function StatusBadge({ status = '' }) {
  const norm = String(status || '').toLowerCase().replace(/_/g, ' ');

  let bg = 'bg-slate-100 text-slate-700';
  let dot = 'bg-slate-400';

  if (norm.includes('resolve')) {
    bg = 'bg-[#e6f9f3] text-[#0d9488]';
    dot = 'bg-[#14b8a6]';
  } else if (norm.includes('dsw') || norm.includes('admin') || norm.includes('escalat')) {
    bg = 'bg-[#ede9fe] text-[#6366f1]';
    dot = 'bg-[#818cf8]';
  } else if (norm.includes('chief') || norm.includes('review') || norm.includes('investigat')) {
    bg = 'bg-[#fef3c7] text-[#d97706]';
    dot = 'bg-[#f59e0b]';
  } else if (norm.includes('pending') || norm.includes('new')) {
    bg = 'bg-[#e0f2fe] text-[#0284c7]';
    dot = 'bg-[#38bdf8]';
  } else if (norm.includes('reject') || norm.includes('critical')) {
    bg = 'bg-[#ffe4e6] text-[#e11d48]';
    dot = 'bg-[#fb7185]';
  }

  // Capitalize words
  const label = norm
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${bg} transition-colors select-none`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot} shrink-0 animate-pulse`} />
      <span>{label || 'Unknown'}</span>
    </span>
  );
}
