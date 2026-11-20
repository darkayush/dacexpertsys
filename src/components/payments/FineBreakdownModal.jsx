import { useMemo, useState } from 'react';
import { statusLabel, toTitleCase } from '../cases/caseUi';
import { Icon } from '../cases/parts';
import PaymentSheet from './PaymentSheet';
import { formatINR } from './format';

// Unpaid fines before a payment: only payable cases (resolved, fined, unpaid) are listed, all
// selected by default. Amounts come from GET /api/payments/summary and are re-checked by the
// server when the payment is made.

const STATE_STYLES = {
  payable: { label: 'Payable', className: 'bg-amber-50 text-amber-800 ring-amber-200', icon: 'schedule' },
  awaiting_resolution: { label: 'Awaiting resolution', className: 'bg-slate-100 text-slate-600 ring-slate-200', icon: 'hourglass_top' },
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: 'check_circle' },
  no_fine: { label: 'No fine', className: 'bg-slate-50 text-slate-500 ring-slate-200', icon: 'remove' },
};

const GROUPS = [{ state: 'payable', title: 'Unpaid cases' }];

const formatDay = (value) => (value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—');

function StateBadge({ state }) {
  const style = STATE_STYLES[state] || STATE_STYLES.no_fine;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style.className}`}>
      <Icon name={style.icon} className="text-[13px]" /> {style.label}
    </span>
  );
}

function CaseRow({ item, selectable, selected, onToggle }) {
  const amountLabel = item.state === 'paid' ? 'Paid' : item.state === 'awaiting_resolution' ? 'Provisional fine' : 'Outstanding';
  const amountValue = item.state === 'paid' ? item.paid_amount : item.state === 'payable' ? item.outstanding : item.fine;
  const body = (
    <>
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Include ${item.case_ref} in this payment`}
          className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 accent-[#3d3793] cursor-pointer"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-slate-900">{item.case_ref}</span>
          <StateBadge state={item.state} />
        </div>
        <p className="mt-0.5 text-sm text-slate-600 truncate">{toTitleCase(item.offense_type) || '—'}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {statusLabel(item.status)} · {formatDay(item.incident_date)}
        </p>
        {item.state === 'paid' && item.payment?.transaction_id && (
          <p className="mt-0.5 text-xs text-slate-400 font-mono truncate">{item.payment.transaction_id}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] text-slate-400">{amountLabel}</p>
        <p className={`text-base font-semibold tabular-nums ${item.state === 'payable' ? 'text-slate-900' : item.state === 'paid' ? 'text-emerald-700' : 'text-slate-500'}`}>
          {item.state === 'no_fine' ? '—' : formatINR(amountValue)}
        </p>
        {item.state === 'payable' && <p className="text-[11px] text-slate-400">Fine {formatINR(item.fine)} · Paid {formatINR(item.paid_amount)}</p>}
      </div>
    </>
  );
  return selectable ? (
    <label className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition-colors ${selected ? 'border-[#3d3793]/40 bg-indigo-50/40' : 'border-slate-200 hover:bg-slate-50'}`}>
      {body}
    </label>
  ) : (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5">{body}</div>
  );
}

/**
 * Props: summary (from GET /api/payments/summary), onClose, onProceed({ cases, total }).
 * Re-mount (change `key`) after the summary is refreshed so the selection is rebuilt.
 */
export default function FineBreakdownModal({ summary, notice = '', onClose, onProceed }) {
  const items = useMemo(() => summary?.items || [], [summary]);
  const payable = useMemo(() => items.filter((i) => i.payable), [items]);
  const [selected, setSelected] = useState(() => new Set(payable.map((i) => i.case_id)));

  const chosen = payable.filter((i) => selected.has(i.case_id));
  const selectedTotal = Math.round(chosen.reduce((sum, i) => sum + i.outstanding, 0) * 100) / 100;
  const allSelected = payable.length > 0 && chosen.length === payable.length;

  const toggle = (caseId) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(caseId)) next.delete(caseId); else next.add(caseId);
    return next;
  });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(payable.map((i) => i.case_id)));

  return (
    <PaymentSheet onClose={onClose} labelledBy="breakdown-title" maxWidth="sm:max-w-2xl" scroll={false}>
      {/* Header */}
      <div className="shrink-0 px-5 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="breakdown-title" className="text-lg font-semibold text-slate-900">Unpaid fines</h2>
            <p className="text-sm text-slate-500">Select the cases you want to pay.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close unpaid fines" className="h-9 w-9 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>
        {notice && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <Icon name="info" className="text-[16px] mt-px" /> {notice}
          </p>
        )}
      </div>

      {/* Case list: scrolls on its own so the summary below stays visible */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 space-y-5">
        {payable.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">You have no unpaid fines.</p>
        )}
        {GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.state === group.state);
          if (!groupItems.length) return null;
          const selectable = group.state === 'payable';
          return (
            <section key={group.state} aria-labelledby={`group-${group.state}`}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 id={`group-${group.state}`} className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {group.title} ({groupItems.length})
                </h3>
                {selectable && groupItems.length > 1 && (
                  <button type="button" onClick={toggleAll} className="text-xs font-medium text-[#3d3793] hover:underline">
                    {allSelected ? 'Clear selection' : 'Select all'}
                  </button>
                )}
              </div>
              {group.note && <p className="mb-2 text-xs text-slate-500">{group.note}</p>}
              <div className="space-y-2">
                {groupItems.map((item) => (
                  <CaseRow
                    key={item.case_id}
                    item={item}
                    selectable={selectable}
                    selected={selected.has(item.case_id)}
                    onToggle={() => toggle(item.case_id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Payment summary, pinned to the bottom */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-5 sm:px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment summary</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-500">Eligible cases</dt>
          <dd className="text-right text-slate-800">{chosen.length} of {payable.length} selected</dd>
          <dt className="text-slate-500">Total due</dt>
          <dd className="text-right tabular-nums text-slate-800">{formatINR(summary?.total_outstanding)}</dd>
        </dl>
        <div className="mt-3 flex items-end justify-between gap-3 border-t border-dashed border-slate-200 pt-3">
          <span className="text-sm font-semibold text-slate-900">Final payable</span>
          <span className="text-2xl font-semibold tabular-nums text-slate-900" aria-live="polite">{formatINR(selectedTotal)}</span>
        </div>
        <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
          <button type="button" onClick={onClose} className="h-12 px-5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all">
            Cancel
          </button>
          <button
            type="button"
            disabled={!chosen.length}
            onClick={() => onProceed({ cases: chosen, total: selectedTotal })}
            className="h-12 rounded-xl bg-[#3d3793] text-white text-sm font-semibold shadow-lg shadow-indigo-900/20 hover:bg-[#332e7d] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 flex items-center justify-center gap-2"
          >
            {chosen.length ? <>Proceed to pay · {formatINR(selectedTotal)}</> : 'Select a case to pay'}
          </button>
        </div>
      </div>
    </PaymentSheet>
  );
}
