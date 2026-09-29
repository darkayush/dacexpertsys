import { motion } from 'framer-motion';

export default function GreetingCard({
  role = 'Warden',
  name = '',
  subtitle = 'Manage disciplinary incidents, review evidence, and track campus policies.',
  activeCount = null,
  totalCount = null,
}) {
  const roleDisplay = name || role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col justify-between p-2">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl sm:text-4xl font-black text-[#1e1b4b] tracking-tight">
            Hi, {roleDisplay}!
          </h1>
          <div className="flex items-center -space-x-1.5">
            <span className="h-7 w-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs font-bold text-indigo-700 shadow-xs">
              ⚡
            </span>
            <span className="h-7 w-7 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-bold text-purple-700 shadow-xs">
              ⚖️
            </span>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#312e81] tracking-tight">
          What are your priorities today?
        </h2>

        <p className="mt-2.5 text-xs sm:text-sm font-medium text-slate-500 max-w-xl leading-relaxed">
          {subtitle}
        </p>
      </div>

      {(activeCount !== null || totalCount !== null) && (
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {activeCount !== null && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#5c54eb] animate-ping" />
              <span>{activeCount} Active Inquiries</span>
            </div>
          )}
          {totalCount !== null && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-50 text-slate-600 text-xs font-semibold border border-slate-200/60">
              <span className="material-symbols-outlined text-[15px] text-slate-400">inventory_2</span>
              <span>{totalCount.toLocaleString()} Total Records</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
