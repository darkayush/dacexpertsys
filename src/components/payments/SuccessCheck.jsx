import { motion, useReducedMotion } from 'framer-motion';

/** Animated success checkmark: the circle draws in, then the tick, with one soft ripple. */
export default function SuccessCheck({ size = 88 }) {
  const reduce = useReducedMotion();
  const draw = (delay, duration) => (reduce
    ? { initial: { pathLength: 1 }, animate: { pathLength: 1 } }
    : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { delay, duration, ease: [0.65, 0, 0.35, 1] } });

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} aria-hidden="true">
      {!reduce && (
        <motion.span
          className="absolute inset-0 rounded-full bg-emerald-400/30"
          initial={{ scale: 0.6, opacity: 0.9 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ delay: 0.55, duration: 0.9, ease: 'easeOut' }}
        />
      )}
      <motion.svg
        viewBox="0 0 88 88"
        width={size}
        height={size}
        className="relative"
        initial={reduce ? false : { scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <circle cx="44" cy="44" r="40" fill="#ecfdf5" />
        <motion.circle cx="44" cy="44" r="40" fill="none" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" {...draw(0.05, 0.45)} />
        <motion.path d="M27 45.5 L39 57 L62 33" fill="none" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" {...draw(0.45, 0.35)} />
      </motion.svg>
    </div>
  );
}
