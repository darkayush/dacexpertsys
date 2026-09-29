import { motion } from 'framer-motion';

const VARIANTS = {
  cyan: {
    bg: 'from-[#38bdf8] via-[#0ea5e9] to-[#0284c7]',
    wave: '#7dd3fc',
    shadow: 'shadow-sky-500/15',
    badgeBg: 'bg-white/25 text-white',
  },
  emerald: {
    bg: 'from-[#34d399] via-[#10b981] to-[#059669]',
    wave: '#a7f3d0',
    shadow: 'shadow-emerald-500/15',
    badgeBg: 'bg-white/25 text-white',
  },
  violet: {
    bg: 'from-[#818cf8] via-[#6366f1] to-[#4f46e5]',
    wave: '#c7d2fe',
    shadow: 'shadow-indigo-500/15',
    badgeBg: 'bg-white/25 text-white',
  },
  blue: {
    bg: 'from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8]',
    wave: '#bfdbfe',
    shadow: 'shadow-blue-500/15',
    badgeBg: 'bg-white/25 text-white',
  },
  amber: {
    bg: 'from-[#fbbf24] via-[#f59e0b] to-[#d97706]',
    wave: '#fde68a',
    shadow: 'shadow-amber-500/15',
    badgeBg: 'bg-white/25 text-white',
  },
  rose: {
    bg: 'from-[#fb7185] via-[#f43f5e] to-[#e11d48]',
    wave: '#fecdd3',
    shadow: 'shadow-rose-500/15',
    badgeBg: 'bg-white/25 text-white',
  },
};

export default function StatCard({
  label,
  value,
  icon = 'folder',
  variant = 'cyan',
  badge,
  trend,
  className = '',
  onClick,
}) {
  const style = VARIANTS[variant] || VARIANTS.cyan;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${style.bg} p-6 text-white shadow-xl ${style.shadow} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Background soft ambient radial glow */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />

      {/* Top row: Icon container + 3-dot action */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
          <span className="material-symbols-outlined text-[24px] text-white">
            {icon}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors">
          <span className="material-symbols-outlined text-[20px]">more_horiz</span>
        </div>
      </div>

      {/* Value & Label */}
      <div className="relative z-10">
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
            {value}
          </h3>
        </div>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/80">
          {label}
        </p>
      </div>

      {/* Bottom row: Sparkline wave curve + Badge */}
      <div className="relative z-10 mt-4 flex items-center justify-between pt-1">
        {/* Subtle decorative wave SVG inspired by reference */}
        <div className="w-24 h-6 opacity-80">
          <svg viewBox="0 0 96 24" fill="none" className="w-full h-full">
            <path
              d="M2 14C12 14 18 4 28 8C38 12 44 20 54 16C64 12 70 6 80 8C86 9 90 12 94 13"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-white/60"
            />
          </svg>
        </div>

        {(badge || trend) && (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${style.badgeBg} backdrop-blur-xs`}
          >
            {trend && <span>{trend}</span>}
            {badge && <span>{badge}</span>}
          </span>
        )}
      </div>
    </motion.div>
  );
}
