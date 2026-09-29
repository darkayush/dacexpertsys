import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function AddActionPlaceholderCard({ onClick, to, label = 'Add new action' }) {
  const content = (
    <div className="h-full min-h-[170px] w-full rounded-[26px] border-2 border-dashed border-indigo-200/80 bg-white/40 hover:bg-white/80 transition-all flex flex-col items-center justify-center p-5 group cursor-pointer">
      <div className="h-11 w-11 rounded-2xl bg-indigo-50 group-hover:bg-[#5c54eb] text-[#5c54eb] group-hover:text-white transition-all flex items-center justify-center shadow-xs">
        <span className="material-symbols-outlined text-[24px]">add</span>
      </div>
      <span className="mt-2.5 text-xs font-bold text-slate-500 group-hover:text-[#5c54eb] transition-colors text-center">
        {label}
      </span>
    </div>
  );

  if (to) {
    return <Link to={to} className="block h-full">{content}</Link>;
  }
  return <div onClick={onClick} role="button" tabIndex={0} className="h-full">{content}</div>;
}

export default function QuickActionCard({
  title,
  description,
  to,
  onClick,
  icon,
  illustrationType = 'document',
  value,
  badge,
  active = false,
}) {
  const illustrations = {
    document: (
      <svg className="w-12 h-12 text-[#5c54eb]" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="6" width="32" height="36" rx="8" stroke="currentColor" strokeWidth="2.5" fill="#f5f3ff" />
        <path d="M16 16H32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M16 23H28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M16 30H24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="31" cy="30" r="3" fill="#818cf8" />
      </svg>
    ),
    sync: (
      <svg className="w-12 h-12 text-teal-600" viewBox="0 0 48 48" fill="none">
        <path d="M10 18L18 8L26 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M38 30L30 40L22 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 10V32C18 35.3137 20.6863 38 24 38H30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 3" />
        <path d="M30 38V16C30 12.6863 27.3137 10 24 10H18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 3" />
      </svg>
    ),
    share: (
      <svg className="w-12 h-12 text-amber-500" viewBox="0 0 48 48" fill="none">
        <circle cx="16" cy="24" r="6" stroke="currentColor" strokeWidth="2.5" fill="#fef3c7" />
        <circle cx="34" cy="14" r="6" stroke="currentColor" strokeWidth="2.5" fill="#fef3c7" />
        <circle cx="34" cy="34" r="6" stroke="currentColor" strokeWidth="2.5" fill="#fef3c7" />
        <path d="M21.5 21L28.5 17" stroke="currentColor" strokeWidth="2" />
        <path d="M21.5 27L28.5 31" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    shield: (
      <svg className="w-12 h-12 text-purple-600" viewBox="0 0 48 48" fill="none">
        <path d="M24 6L38 12V23C38 32.5 32 40 24 43C16 40 10 32.5 10 23V12L24 6Z" stroke="currentColor" strokeWidth="2.5" fill="#ede9fe" />
        <path d="M20 23L23 26L29 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    alert: (
      <svg className="w-12 h-12 text-rose-500" viewBox="0 0 48 48" fill="none">
        <path d="M24 6L38 12V23C38 32.5 32 40 24 43C16 40 10 32.5 10 23V12L24 6Z" stroke="currentColor" strokeWidth="2.5" fill="#ffe4e6" />
        <path d="M24 16V26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="32" r="1.5" fill="currentColor" />
      </svg>
    ),
  };

  const hasValue = value !== undefined && value !== null;

  const cardContent = (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className={`h-full min-h-[170px] bg-white rounded-[26px] p-5 border transition-all flex flex-col justify-between group cursor-pointer ${
        active
          ? 'border-[#5c54eb] ring-2 ring-[#5c54eb]/20 shadow-[0_12px_36px_rgba(92,84,235,0.12)]'
          : 'border-slate-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgb(0,0,0,0.06)] hover:border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-2xl bg-slate-50/80 group-hover:bg-purple-50 transition-colors">
          {illustrations[illustrationType] || (
            <span className="material-symbols-outlined text-[32px] text-[#5c54eb]">
              {icon || 'layers'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
              active
                ? 'bg-[#5c54eb] text-white'
                : 'bg-slate-100 text-slate-600 group-hover:bg-purple-100 group-hover:text-[#5c54eb]'
            }`}>
              {badge}
            </span>
          )}
          <span className={`material-symbols-outlined transition-all text-[20px] ${
            active
              ? 'text-[#5c54eb]'
              : 'text-slate-300 group-hover:text-[#5c54eb] group-hover:translate-x-0.5 -translate-y-0.5'
          }`}>
            arrow_outward
          </span>
        </div>
      </div>

      <div className="mt-3">
        {hasValue && (
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1e1b4b] group-hover:text-[#5c54eb] transition-colors leading-none mb-1.5">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
        )}
        <h4 className="text-sm font-bold text-[#1e1b4b] group-hover:text-[#5c54eb] transition-colors leading-snug">
          {title}
        </h4>
        <p className="mt-1 text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );

  if (to) {
    return <Link to={to} className="block h-full">{cardContent}</Link>;
  }

  return (
    <div onClick={onClick} role="button" tabIndex={0} className="h-full">
      {cardContent}
    </div>
  );
}
