import { useEffect, useRef, useState } from 'react';
import { getCaseRecommendation } from '../../services/api';
import { Button, Card, Icon } from './parts';

const FACTOR_STYLES = {
  aggravating: { icon: 'warning', box: 'bg-orange-50 border-orange-100', tint: 'text-orange-500', label: 'Aggravating' },
  history: { icon: 'history', box: 'bg-red-50 border-red-100', tint: 'text-red-500', label: 'History' },
  evidence: { icon: 'priority_high', box: 'bg-red-50 border-red-100', tint: 'text-red-500', label: 'Evidence' },
  mitigating: { icon: 'info', box: 'bg-blue-50 border-blue-100', tint: 'text-blue-500', label: 'Mitigating' },
  policy: { icon: 'policy', box: 'bg-slate-50 border-slate-200', tint: 'text-slate-500', label: 'Policy' },
};

const RISK_TEXT = {
  Critical: 'text-red-600',
  High: 'text-red-600',
  Moderate: 'text-orange-500',
  Low: 'text-emerald-600',
};

const list = (value) => (Array.isArray(value) ? value : []);

/**
 * AI penalty recommendation (Groq) for a case awaiting the Admin's final decision.
 * Generated only when the Admin clicks "Generate recommendation" (each call uses Groq quota).
 * Advisory only: "Use in decision" fills the decision form, nothing is saved here.
 */
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The student's earlier offences (warnings included): exact counts from the backend plus the
// AI's short note on how they affect this penalty.
function RepeatOffences({ counts, note }) {
  if (!counts) return null;
  if (!counts.earlier_cases) {
    return (
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
        <p className="text-sm font-medium text-emerald-800">First offence: no earlier cases.</p>
      </div>
    );
  }
  const outcomes = [
    counts.warnings ? plural(counts.warnings, 'warning') : null,
    counts.penalised ? `${counts.penalised} penalised` : null,
    counts.pending ? `${counts.pending} not resolved yet` : null,
  ].filter(Boolean).join(', ');
  const same = `${counts.same_type} of the same type${counts.same_offence ? ` (${counts.same_offence} same offence)` : ''}`;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
      <p className="text-xs font-medium text-amber-900">
        Repeat offences: {plural(counts.earlier_cases, 'earlier case')}{outcomes ? `: ${outcomes}` : ''} · {same}
      </p>
      {note && <p className="text-sm text-amber-900 leading-relaxed">{note}</p>}
    </div>
  );
}

export default function AiRecommendationCard({ caseId, onApply }) {
  // { status: 'idle' | 'loading' | 'done' | 'error', data, error }
  const [rec, setRec] = useState({ status: 'idle', data: null, error: '' });
  const [showFactors, setShowFactors] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // refresh: true (Regenerate) asks the server for a new recommendation instead of a recent one.
  const generate = async ({ refresh = false } = {}) => {
    setRec({ status: 'loading', data: null, error: '' });
    try {
      const data = await getCaseRecommendation(caseId, { refresh });
      if (mountedRef.current) setRec({ status: 'done', data, error: '' });
    } catch (recError) {
      if (mountedRef.current) {
        setRec({ status: 'error', data: null, error: recError?.message || 'Could not generate the recommendation.' });
      }
    }
  };

  const r = rec.data;
  const factors = list(r?.factors);
  const measures = list(r?.additional_measures);
  const references = list(r?.policy_references);
  const missing = list(r?.missing_information);

  return (
    <Card
      title="AI Recommendation"
      icon="auto_awesome"
      action={rec.status === 'done' && (
        <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => generate({ refresh: true })}>
          <Icon name="refresh" className="text-[16px]" />
          Regenerate
        </Button>
      )}
    >
      <div className="px-6 pb-6">
        {rec.status === 'idle' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              Get an AI-suggested penalty based on this case, the student&apos;s history and the DAC policy.
            </p>
            <Button className="shrink-0" onClick={() => generate()}>
              <Icon name="auto_awesome" className="text-[18px]" />
              Generate recommendation
            </Button>
          </div>
        )}

        {rec.status === 'loading' && (
          <div>
            <div className="flex items-center gap-3 text-[#3d3793]">
              <Icon name="progress_activity" className="animate-spin text-[20px]" />
              <p className="text-sm font-medium">Analysing the case, the student&apos;s history and the DAC policy…</p>
            </div>
            <div className="mt-5 space-y-3">
              <div className="h-5 w-2/3 rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
        )}

        {rec.status === 'error' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3">
            <p className="text-sm text-rose-700">{rec.error}</p>
            <Button variant="outline" className="shrink-0 h-8 px-3 text-xs" onClick={() => generate()}>Try again</Button>
          </div>
        )}

        {rec.status === 'done' && r && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 leading-snug break-words">{r.recommended_action}</h3>
              {r.summary && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{r.summary}</p>}
            </div>

            <RepeatOffences counts={r.repeat_offences} note={r.repeat_offence_note} />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Penalty points</p>
                <p className="text-xl font-semibold text-slate-900 tabular-nums">{r.penalty_points ?? 0}</p>
                {r.dac_level && <p className="text-[11px] text-slate-500">Level {r.dac_level}</p>}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Fine</p>
                <p className="text-xl font-semibold text-slate-900 tabular-nums">₹{Number(r.fine || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Risk level</p>
                <p className={`text-xl font-semibold ${RISK_TEXT[r.risk_level] || 'text-slate-900'}`}>{r.risk_level || '—'}</p>
                {r.confidence && <p className="text-[11px] text-slate-500">Confidence: {r.confidence}</p>}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Points after case</p>
                <p className="text-xl font-semibold text-slate-900 tabular-nums">{r.points_after_case ?? '—'}</p>
                <p className="text-[11px] text-slate-500">
                  {r.prior_cases ?? 0} earlier · {r.repeat_offences?.warnings ?? 0} warning{r.repeat_offences?.warnings === 1 ? '' : 's'} · {r.prior_points ?? 0} pts
                </p>
              </div>
            </div>

            {r.threshold_warning && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{r.threshold_warning}</p>
            )}

            {measures.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Additional measures</p>
                <ul className="space-y-1">
                  {measures.map((m) => <li key={m} className="text-sm text-slate-700">• {m}</li>)}
                </ul>
              </div>
            )}

            {factors.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowFactors((v) => !v)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#3d3793] hover:underline"
                >
                  <Icon name={showFactors ? 'expand_less' : 'expand_more'} className="text-[18px]" />
                  {showFactors ? 'Hide' : 'Show'} contributing factors ({factors.length})
                </button>
                {showFactors && (
                  <div className="mt-3 space-y-2">
                    {factors.map((f, index) => {
                      const style = FACTOR_STYLES[f.type] || FACTOR_STYLES.policy;
                      return (
                        <div key={`${f.title}-${index}`} className={`flex gap-3 p-3 rounded-lg border ${style.box}`}>
                          <Icon name={style.icon} className={`text-[18px] mt-0.5 ${style.tint}`} />
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {f.title} <span className="ml-1 text-xs font-normal text-slate-400">{style.label}</span>
                            </p>
                            <p className="text-sm text-slate-600">{f.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {references.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Policy references</p>
                <ul className="space-y-1">
                  {references.map((ref) => (
                    <li key={ref} className="text-sm text-slate-600 border-l-2 border-[#3d3793]/40 pl-3">{ref}</li>
                  ))}
                </ul>
              </div>
            )}

            {missing.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Missing information</p>
                <ul className="space-y-1">
                  {missing.map((m) => <li key={m} className="text-sm text-slate-600">• {m}</li>)}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-md">
                Generated by AI{r.model ? ` (${r.model})` : ''} from the case, the student&apos;s history and the DAC &amp; Unfair
                Means policies. Advisory only: the Committee makes the final decision.
              </p>
              <Button
                onClick={() => onApply?.({
                  penalty_points: Number(r.penalty_points ?? 0),
                  fine: Number(r.fine ?? 0),
                  decision: String(r.recommended_action || ''),
                })}
              >
                <Icon name="input" className="text-[18px]" />
                Use in decision
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
