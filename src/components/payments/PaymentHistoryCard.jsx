import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyPayments } from '../../services/api';
import { Card, EmptyState, Icon } from '../cases/parts';
import ReceiptActions from './ReceiptActions';
import { formatINR, formatPaymentDate } from './format';

/** The signed-in student's demo payments (from GET /api/payments/mine), with receipt actions. */
export default function PaymentHistoryCard() {
  const [state, setState] = useState({ status: 'loading', rows: [], error: '' });

  useEffect(() => {
    let active = true;
    getMyPayments()
      .then((rows) => active && setState({ status: 'done', rows: Array.isArray(rows) ? rows : [], error: '' }))
      .catch((error) => active && setState({ status: 'error', rows: [], error: error?.message || 'Could not load your payments.' }));
    return () => { active = false; };
  }, []);

  return (
    <Card title="Payment History" icon="receipt_long">
      {state.status === 'loading' && (
        <div className="px-6 pb-6 space-y-2" aria-busy="true">
          <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
        </div>
      )}
      {state.status === 'error' && <p className="px-6 pb-6 text-sm text-rose-700">{state.error}</p>}
      {state.status === 'done' && state.rows.length === 0 && (
        <EmptyState icon="receipt_long">No payments yet. Fines for resolved cases can be paid from the case page.</EmptyState>
      )}
      {state.status === 'done' && state.rows.length > 0 && (
        <>
          {/* Desktop and tablet: table */}
          <div className="hidden md:block overflow-x-auto px-6 pb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-4 font-medium">Case</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Transaction ID</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.rows.map((p) => (
                  <tr key={p.transaction_id} className="align-middle">
                    <td className="py-3 pr-4">
                      <Link to={`/student/cases/${p.case_id}`} className="font-medium text-[#3d3793] hover:underline">{p.case_ref}</Link>
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-slate-900">{formatINR(p.amount)}</td>
                    <td className="py-3 pr-4 font-mono text-[13px] text-slate-700">{p.transaction_id}</td>
                    <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">{formatPaymentDate(p.payment_date)}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        <Icon name="check_circle" className="text-[14px]" /> Paid
                      </span>
                    </td>
                    <td className="py-3"><ReceiptActions transactionId={p.transaction_id} layout="inline" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <ul className="md:hidden px-4 pb-4 space-y-3">
            {state.rows.map((p) => (
              <li key={p.transaction_id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/student/cases/${p.case_id}`} className="font-medium text-[#3d3793] hover:underline">{p.case_ref}</Link>
                    <p className="text-xs text-slate-500 mt-0.5">{formatPaymentDate(p.payment_date)}</p>
                  </div>
                  <p className="text-lg font-semibold text-slate-900 tabular-nums">{formatINR(p.amount)}</p>
                </div>
                <p className="mt-2 font-mono text-xs text-slate-600 break-all">{p.transaction_id}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    <Icon name="check_circle" className="text-[14px]" /> Paid
                  </span>
                  <ReceiptActions transactionId={p.transaction_id} layout="inline" />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
