import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { getCasePayment } from '../../services/api';
import { Card, Icon } from '../cases/parts';
import CheckoutModal from './CheckoutModal';
import ReceiptActions from './ReceiptActions';
import { fineDueDate, formatINR, formatPaymentDate } from './format';

function StatusPill({ paid }) {
  return paid ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
      <Icon name="check_circle" className="text-[14px]" /> Paid
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
      <Icon name="schedule" className="text-[14px]" /> Unpaid
    </span>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 text-right break-all">{children}</dd>
    </div>
  );
}

/**
 * Student's payment panel for one case (placed below the Workflow panel).
 * All state comes from GET /api/payments/cases/:id; the backend decides eligibility.
 * Renders nothing for cases that are not resolved and have no recorded payment.
 */
export default function PaymentPanel({ caseItem }) {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [reloadToken, setReloadToken] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const payButtonRef = useRef(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    getCasePayment(caseItem.id)
      .then((data) => active && setState({ status: 'done', data, error: '' }))
      .catch((loadError) => active && setState({ status: 'error', data: null, error: loadError?.message || 'Could not load payment details.' }));
    return () => { active = false; };
  }, [caseItem.id, caseItem.status, reloadToken]);

  const reload = () => {
    setState((prev) => ({ ...prev, status: prev.data ? 'done' : 'loading', error: '' }));
    setReloadToken((n) => n + 1);
  };

  // The server confirmed the payment: show it in the panel straight away, then refresh.
  const handlePaid = useCallback((payment) => {
    setState((prev) => (prev.data
      ? { status: 'done', error: '', data: { ...prev.data, eligible: false, reason: 'ALREADY_PAID', payment } }
      : prev));
    setReloadToken((n) => n + 1);
  }, []);

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);
    requestAnimationFrame(() => payButtonRef.current?.focus({ preventScroll: true }));
  }, []);

  const data = state.data;
  if (state.status === 'done' && data && !data.payment && data.reason === 'NOT_RESOLVED') return null;

  const payment = data?.payment;
  const dueDate = fineDueDate(caseItem.resolved_at);
  const overdue = Boolean(dueDate) && dueDate.getTime() < now;
  const enter = reduce ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } };

  return (
    <>
      <Card title="Payment" icon="payments" action={data && (data.payment || data.eligible) ? <StatusPill paid={Boolean(payment)} /> : null}>
        <div className="px-6 pb-6">
          {state.status === 'loading' && (
            <div className="space-y-3" aria-busy="true" aria-label="Loading payment details">
              <div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse" />
              <div className="h-8 w-1/3 rounded bg-slate-100 animate-pulse" />
              <div className="h-11 w-full rounded-xl bg-slate-100 animate-pulse" />
            </div>
          )}

          {state.status === 'error' && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
              <p className="text-sm text-rose-700">{state.error}</p>
              <button type="button" onClick={reload} className="mt-2 text-sm font-medium text-rose-700 underline underline-offset-2">
                Try again
              </button>
            </div>
          )}

          {state.status === 'done' && data && payment && (
            <motion.div {...enter} className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Icon name="check" className="text-[22px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-emerald-800">Amount paid</p>
                  <p className="text-2xl font-semibold text-emerald-900 tabular-nums leading-tight">{formatINR(payment.amount)}</p>
                </div>
              </div>
              <dl className="space-y-2.5">
                <Row label="Case reference">{payment.case_ref}</Row>
                <Row label="Transaction ID"><span className="font-mono text-[13px]">{payment.transaction_id}</span></Row>
                <Row label="Date and time">{formatPaymentDate(payment.payment_date)}</Row>
                {payment.consolidated && payment.transaction_case_count > 1 && (
                  <Row label="Paid together">
                    {payment.transaction_case_count} cases · {formatINR(payment.transaction_total)}
                  </Row>
                )}
              </dl>
              <ReceiptActions transactionId={payment.transaction_id} />
            </motion.div>
          )}

          {state.status === 'done' && data && !payment && data.eligible && (
            <motion.div {...enter} className="space-y-4">
              <dl className="space-y-2.5">
                <Row label="Case reference">{data.case_ref}</Row>
                <Row label="Payment status"><span className="font-semibold text-amber-800">UNPAID</span></Row>
                {dueDate && (
                  <Row label={overdue ? 'Was due' : 'Pay by'}>
                    <span className={overdue ? 'font-medium text-rose-700' : ''}>{dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </Row>
                )}
              </dl>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Amount due</p>
                <p className="text-3xl font-semibold text-slate-900 tabular-nums tracking-tight">{formatINR(data.amount)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Fine set by the Disciplinary Action Committee. Paying it does not cancel the penalty points.
                </p>
              </div>

              {overdue && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  The one-week payment window has passed; the DAC Chairperson may increase the fine.
                </p>
              )}


              <button
                ref={payButtonRef}
                type="button"
                onClick={() => setCheckoutOpen(true)}
                className="group w-full h-12 rounded-xl bg-[#3d3793] text-white text-sm font-semibold shadow-lg shadow-indigo-900/15 hover:bg-[#332e7d] hover:shadow-indigo-900/25 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 flex items-center justify-center gap-2"
              >
                Pay now · {formatINR(data.amount)}
                <Icon name="arrow_forward" className="text-[18px] transition-transform group-hover:translate-x-0.5" />
              </button>
            </motion.div>
          )}

          {state.status === 'done' && data && !payment && data.reason === 'NO_FINE' && (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Icon name="task_alt" className="text-[18px] text-emerald-600" />
              No payment is due for this case.
            </p>
          )}
        </div>
      </Card>

      {createPortal(
        <AnimatePresence>
          {checkoutOpen && data && (
            <CheckoutModal
              key="checkout"
              caseId={caseItem.id}
              caseRef={data.case_ref}
              amount={data.amount}
              studentName={caseItem.student_name}
              onClose={closeCheckout}
              onPaid={handlePaid}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
