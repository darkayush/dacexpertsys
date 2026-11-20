import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { createConsolidatedPayment, getFineSummary } from '../../services/api';
import { Icon } from '../cases/parts';
import CheckoutModal from './CheckoutModal';
import FineBreakdownModal from './FineBreakdownModal';
import { formatINR } from './format';

/**
 * Student dashboard: total outstanding fine across the student's cases, with a case-wise
 * breakdown and a consolidated payment that reuses the case page's CheckoutModal.
 * All figures come from GET /api/payments/summary and are reloaded after every payment.
 * onPaid() lets the dashboard refresh other payment views (payment history).
 */
export default function OutstandingFinePanel({ studentName, onPaid }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [reloadToken, setReloadToken] = useState(0);
  // Which dialog is open: null | { view: 'breakdown', notice } | { view: 'checkout', cases, total }
  const [flow, setFlow] = useState(null);
  const [breakdownVersion, setBreakdownVersion] = useState(0);

  useEffect(() => {
    let active = true;
    getFineSummary()
      .then((data) => {
        if (!active) return;
        setState({ status: 'done', data, error: '' });
        setBreakdownVersion((v) => v + 1); // rebuild the selection from fresh amounts
      })
      .catch((error) => active && setState((prev) => ({ status: prev.data ? 'done' : 'error', data: prev.data, error: error?.message || 'Could not load your fines.' })));
    return () => { active = false; };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);
  const closeFlow = useCallback(() => setFlow(null), []);

  const handlePaid = useCallback(() => {
    reload();
    onPaid?.();
  }, [reload, onPaid]);

  // The server refused because fines changed during checkout: reload and review again.
  const reviewAgain = useCallback(() => {
    reload();
    setFlow({ view: 'breakdown', notice: 'Your fines changed while you were checking out. Please review the updated amounts.' });
  }, [reload]);

  const data = state.data;
  const hasOutstanding = Boolean(data && data.outstanding_count > 0);

  const checkoutProps = (() => {
    if (flow?.view !== 'checkout') return null;
    const { cases, total } = flow;
    const lines = cases.map((c) => ({ case_id: c.case_id, case_ref: c.case_ref, amount: c.outstanding }));
    if (lines.length === 1) {
      // One case: exactly the case page's single-case payment.
      return { caseId: lines[0].case_id, caseRef: lines[0].case_ref, amount: lines[0].amount };
    }
    return {
      cases: lines,
      amount: total,
      pay: (checkoutKey) => createConsolidatedPayment({ caseIds: lines.map((l) => l.case_id), expectedTotal: total, idempotencyKey: checkoutKey }),
    };
  })();

  return (
    <>
      {/* Compact card in the dashboard's top row: amount due + Pay now. */}
      <section aria-label="Total fine due" className="flex-1 flex flex-col justify-center rounded-2xl border border-slate-200/80 bg-white px-5 py-5">
        {state.status === 'loading' && (
          <div className="flex items-center gap-4" aria-busy="true" aria-label="Loading your fines">
            <span className="h-11 w-11 rounded-full bg-slate-100 animate-pulse" />
            <span className="flex-1 space-y-2">
              <span className="block h-3 w-24 rounded bg-slate-100 animate-pulse" />
              <span className="block h-7 w-32 rounded bg-slate-100 animate-pulse" />
            </span>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-rose-700">{state.error}</p>
            <button type="button" onClick={reload} className="shrink-0 text-sm font-medium text-rose-700 underline underline-offset-2">Try again</button>
          </div>
        )}

        {state.status === 'done' && data && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <span className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center ${hasOutstanding ? 'bg-[#f1d0d7] text-[#b42b44]' : 'bg-[#d2e8da] text-[#2f7a4d]'}`}>
                <Icon name="account_balance_wallet" className="text-[24px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">Total fine due</span>
                <span className={`block text-3xl font-semibold tabular-nums ${hasOutstanding ? 'text-slate-900' : 'text-[#2f7a4d]'}`}>
                  {formatINR(data.total_outstanding)}
                </span>
                {!hasOutstanding && <span className="block text-xs text-slate-500">No dues</span>}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFlow({ view: 'breakdown', notice: '' })}
              disabled={!hasOutstanding}
              className="group h-12 w-full sm:w-auto px-6 rounded-xl bg-[#3d3793] text-white text-sm font-semibold shadow-lg shadow-indigo-900/15 hover:bg-[#332e7d] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 flex items-center justify-center gap-2"
            >
              Pay now
              {hasOutstanding && <Icon name="arrow_forward" className="text-[18px] transition-transform group-hover:translate-x-0.5" />}
            </button>
          </div>
        )}
      </section>

      {createPortal(
        <AnimatePresence mode="wait">
          {flow?.view === 'breakdown' && data && (
            <FineBreakdownModal
              key={`breakdown-${breakdownVersion}`}
              summary={data}
              notice={flow.notice}
              onClose={closeFlow}
              onProceed={({ cases, total }) => setFlow({ view: 'checkout', cases, total })}
            />
          )}
          {checkoutProps && (
            <CheckoutModal
              key="checkout"
              {...checkoutProps}
              studentName={studentName}
              doneLabel="Back to dashboard"
              onReview={reviewAgain}
              onClose={closeFlow}
              onPaid={handlePaid}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
