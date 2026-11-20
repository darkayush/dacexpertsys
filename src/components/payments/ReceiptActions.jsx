import { useState } from 'react';
import { Icon } from '../cases/parts';
import { downloadReceipt, printReceipt, viewReceipt } from './receipt';

const ACTIONS = [
  { id: 'view', label: 'View receipt', short: 'View', icon: 'visibility', run: viewReceipt },
  { id: 'download', label: 'Download PDF', short: 'Download', icon: 'download', run: downloadReceipt },
  { id: 'print', label: 'Print', short: 'Print', icon: 'print', run: printReceipt },
];

const BASE = 'inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100';

/**
 * View / Download / Print buttons for one recorded demo payment.
 * layout: 'stack' (full-width buttons, used in panels and the success screen) or 'inline' (compact, tables).
 */
export default function ReceiptActions({ transactionId, layout = 'stack' }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const run = async (action) => {
    setBusy(action.id);
    setError('');
    try {
      await action.run(transactionId);
    } catch (runError) {
      setError(runError?.message || 'Could not load the receipt. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  if (layout === 'inline') {
    return (
      <div className="flex flex-wrap items-center gap-1">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => run(action)}
            disabled={Boolean(busy)}
            title={action.label}
            aria-label={`${action.label} for ${transactionId}`}
            className={`${BASE} h-8 px-2.5 text-[#3d3793] hover:bg-indigo-50`}
          >
            <Icon name={busy === action.id ? 'progress_activity' : action.icon} className={`text-[18px] ${busy === action.id ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">{action.short}</span>
          </button>
        ))}
        {error && <p role="alert" className="basis-full text-xs text-rose-700">{error}</p>}
      </div>
    );
  }

  const [primary, ...secondary] = ACTIONS;
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => run(primary)}
        disabled={Boolean(busy)}
        className={`${BASE} w-full h-11 bg-[#3d3793] text-white hover:bg-[#332e7d]`}
      >
        <Icon name={busy === primary.id ? 'progress_activity' : primary.icon} className={`text-[18px] ${busy === primary.id ? 'animate-spin' : ''}`} />
        {primary.label}
      </button>
      <div className="grid grid-cols-2 gap-2">
        {secondary.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => run(action)}
            disabled={Boolean(busy)}
            className={`${BASE} h-10 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300`}
          >
            <Icon name={busy === action.id ? 'progress_activity' : action.icon} className={`text-[18px] ${busy === action.id ? 'animate-spin' : ''}`} />
            {action.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}
