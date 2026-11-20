import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createDemoPayment } from '../../services/api';
import { Icon } from '../cases/parts';
import ReceiptActions from './ReceiptActions';
import SuccessCheck from './SuccessCheck';
import { formatINR, formatPaymentDate } from './format';

// What the server does inside the one POST request (payments.service.js). The list is ticked
// only after the server confirms the saved transaction, so it never shows progress that did
// not happen.
const SERVER_STEPS = [
  'Verifying case eligibility',
  'Generating transaction reference',
  'Saving transaction',
  'Confirming payment',
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const newCheckoutKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}-checkout`);

function SummaryRow({ label, children, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className={`text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{label}</dt>
      <dd className={`text-sm text-right break-all ${strong ? 'font-semibold text-slate-900' : 'text-slate-800'}`}>{children}</dd>
    </div>
  );
}

/**
 * Demo checkout for one case's fine: confirm → processing → success | error.
 * Rendered by PaymentPanel inside <AnimatePresence>; onPaid(payment) runs as soon as the
 * server confirms the payment, onClose when the student closes the sheet.
 */
export default function CheckoutModal({ caseId, caseRef, amount, studentName, onClose, onPaid }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState('confirm'); // confirm | processing | success | error
  const [doneSteps, setDoneSteps] = useState(0);
  const [payment, setPayment] = useState(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [error, setError] = useState('');
  // One key per checkout: retrying after an error can never create a second payment.
  const [checkoutKey] = useState(newCheckoutKey);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  const primaryRef = useRef(null);
  const busy = step === 'processing';

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Keep the page behind still while the sheet is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  // Escape closes the sheet, except while the payment is being processed.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  // Move focus to the main action of each step (keyboard and screen-reader users).
  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });
  }, [step]);

  const confirm = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setStep('processing');
    setDoneSteps(0);
    setError('');
    try {
      const result = await createDemoPayment(caseId, checkoutKey);
      if (!mountedRef.current) return;
      for (let i = 1; i <= SERVER_STEPS.length; i += 1) {
        setDoneSteps(i);
        await wait(reduce ? 0 : 170);
      }
      setPayment(result.payment);
      setStep('success');
      onPaid?.(result.payment);
    } catch (payError) {
      if (!mountedRef.current) return;
      // Paid in another tab or session: show that payment instead of an error.
      if (payError?.code === 'ALREADY_PAID' && payError.payload?.payment) {
        setPayment(payError.payload.payment);
        setAlreadyPaid(true);
        setStep('success');
        onPaid?.(payError.payload.payment);
      } else {
        setError(payError?.message || 'The payment could not be completed.');
        setStep('error');
      }
    } finally {
      submittingRef.current = false;
    }
  };

  const stepMotion = reduce
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } };

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
        aria-labelledby="checkout-title"
        className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl"
        initial={reduce ? false : { y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduce ? { opacity: 0 } : { y: 48, opacity: 0 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34 }}
      >
        <div className="sm:hidden flex justify-center pt-3" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {step === 'confirm' && (
            <motion.div key="confirm" {...stepMotion} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="checkout-title" className="text-lg font-semibold text-slate-900">Checkout</h2>
                  <p className="text-sm text-slate-500">Review and confirm your payment.</p>
                </div>
                <button type="button" onClick={onClose} aria-label="Close checkout" className="h-9 w-9 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                  <Icon name="close" className="text-[20px]" />
                </button>
              </div>

              <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#3d3793] to-[#231f52] p-5 text-white">
                <p className="text-sm text-indigo-100">Amount to pay</p>
                <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">{formatINR(amount)}</p>
                <p className="mt-1 text-sm text-indigo-100">DAC fine · Case {caseRef}</p>
              </div>

              <section className="mt-5" aria-label="Payment summary">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment summary</h3>
                <dl className="mt-1 divide-y divide-slate-100">
                  <SummaryRow label="Student">{studentName || '—'}</SummaryRow>
                  <SummaryRow label="Case reference">{caseRef}</SummaryRow>
                  <SummaryRow label="Fine (DAC decision)">{formatINR(amount)}</SummaryRow>
                  <SummaryRow label="Total payable" strong>{formatINR(amount)}</SummaryRow>
                </dl>
              </section>


              <div className="mt-5 grid grid-cols-[auto_1fr] gap-2 sticky bottom-0 bg-white pt-1 pb-[max(0px,env(safe-area-inset-bottom))]">
                <button type="button" onClick={onClose} className="h-12 px-5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all">
                  Cancel
                </button>
                <button
                  ref={primaryRef}
                  type="button"
                  onClick={confirm}
                  className="h-12 rounded-xl bg-[#3d3793] text-white text-sm font-semibold shadow-lg shadow-indigo-900/20 hover:bg-[#332e7d] active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 flex items-center justify-center gap-2"
                >
                  <Icon name="lock" className="text-[18px]" />
                  Confirm payment · {formatINR(amount)}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div key="processing" {...stepMotion} className="px-6 py-10 text-center" aria-live="polite" aria-busy="true">
              <div className="relative mx-auto h-20 w-20">
                <span className={`absolute inset-0 rounded-full border-4 border-indigo-100 border-t-[#3d3793] ${reduce ? '' : 'animate-spin'}`} />
                <span className="absolute inset-0 flex items-center justify-center text-[#3d3793]">
                  <Icon name="lock" className="text-[28px]" />
                </span>
              </div>
              <h2 id="checkout-title" className="mt-5 text-lg font-semibold text-slate-900">Processing payment</h2>
              <p className="mt-1 text-sm text-slate-500">Please keep this window open.</p>
              <ol className="mt-6 mx-auto max-w-xs space-y-3 text-left">
                {SERVER_STEPS.map((label, i) => {
                  const done = i < doneSteps;
                  const active = !done && i === doneSteps;
                  return (
                    <li key={label} className="flex items-center gap-3 text-sm">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                        done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-50 text-[#3d3793]' : 'bg-slate-100 text-slate-300'
                      }`}
                      >
                        <Icon
                          name={done ? 'check' : active ? 'progress_activity' : 'radio_button_unchecked'}
                          className={`text-[16px] ${active && !reduce ? 'animate-spin' : ''}`}
                        />
                      </span>
                      <span className={done ? 'text-slate-900' : active ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
                    </li>
                  );
                })}
              </ol>
            </motion.div>
          )}

          {step === 'success' && payment && (
            <motion.div key="success" {...stepMotion} className="p-5 sm:p-6 text-center" aria-live="polite">
              <div className="pt-2">
                <SuccessCheck />
              </div>
              <h2 id="checkout-title" className="mt-4 text-xl font-semibold text-slate-900">
                {alreadyPaid ? 'Already paid' : 'Payment successful'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {alreadyPaid
                  ? 'This fine was already paid. Here is the recorded transaction.'
                  : 'Your payment has been completed successfully.'}
              </p>
              <p className="mt-4 text-4xl font-semibold text-slate-900 tabular-nums">{formatINR(payment.amount)}</p>

              <dl className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 text-left">
                <SummaryRow label="Transaction ID"><span className="font-mono">{payment.transaction_id}</span></SummaryRow>
                <SummaryRow label="Case reference">{payment.case_ref}</SummaryRow>
                <SummaryRow label="Date and time">{formatPaymentDate(payment.payment_date)}</SummaryRow>
                <SummaryRow label="Status"><span className="font-semibold text-emerald-700">Successful</span></SummaryRow>
              </dl>

              <div className="mt-5 text-left">
                <ReceiptActions transactionId={payment.transaction_id} />
              </div>

              <button
                ref={primaryRef}
                type="button"
                onClick={onClose}
                className="mt-4 h-11 w-full rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 active:scale-[0.98] transition-all"
              >
                Done
              </button>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div key="error" {...stepMotion} className="p-6 text-center" role="alert">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <Icon name="error" className="text-[34px]" />
              </div>
              <h2 id="checkout-title" className="mt-4 text-lg font-semibold text-slate-900">Payment not completed</h2>
              <p className="mt-1 text-sm text-slate-600">{error}</p>
              <p className="mt-3 text-xs text-slate-500">
                No duplicate payment can be created: trying again continues this same checkout.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all">
                  Cancel
                </button>
                <button ref={primaryRef} type="button" onClick={confirm} className="h-11 rounded-xl bg-[#3d3793] text-white text-sm font-semibold hover:bg-[#332e7d] active:scale-[0.98] transition-all">
                  Try again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
