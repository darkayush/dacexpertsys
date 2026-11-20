import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Shared shell for payment dialogs: dimmed overlay, bottom sheet on phones and centred card on
 * larger screens, spring entrance, Escape / backdrop to close (unless `busy`), and the page
 * behind kept still. Used by CheckoutModal and FineBreakdownModal so both look and move alike.
 * Render inside <AnimatePresence> for the exit animation.
 */
export default function PaymentSheet({ onClose, busy = false, labelledBy, maxWidth = 'sm:max-w-md', scroll = true, children }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[2px] sm:px-4"
      data-lenis-prevent
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative flex flex-col w-full ${maxWidth} max-h-[92dvh] ${scroll ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'} rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl`}
        initial={reduce ? false : { y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduce ? { opacity: 0 } : { y: 48, opacity: 0 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34 }}
      >
        <div className="sm:hidden flex justify-center pt-3 shrink-0" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
