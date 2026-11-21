import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import DACLayout from '../components/layout/DACLayout';
import AiRecommendationCard from '../components/cases/AiRecommendationCard';
import PaymentPanel from '../components/payments/PaymentPanel';
import StaffPaymentStatus from '../components/payments/StaffPaymentStatus';
import { scrollToElement } from '../hooks/useLenis';
import { Avatar, Button, Card, EmptyState, Icon, SeverityPill, StatusText } from '../components/cases/parts';
import StudentProfileLink from '../components/cases/StudentProfileLink';
import { caseFineText, caseLink, casePointsText, formatDate, formatDateTime, safeReturnPath, statusLabel, toTitleCase } from '../components/cases/caseUi';
import { useAuth } from '../context/AuthContext';
import { approveCase, getCaseById, getCaseEvidence, getCaseMeetings, getCaseTimeline, getGroupCases, scheduleCaseMeeting, updateCase, warnCase } from '../services/api';

const STEPS = [
  { key: 'registered', label: 'Registered', role: 'Warden' },
  { key: 'pending_chief', label: 'Chief Warden', role: 'First review' },
  { key: 'pending_dsw', label: 'DSW', role: 'Second review' },
  { key: 'pending_admin', label: 'Admin', role: 'Final decision' },
  { key: 'resolved', label: 'Resolved', role: 'Closed' },
];

const LIST_LINKS = {
  warden: { to: '/warden/cases', label: 'My Cases' },
  chief_warden: { to: '/chief-warden/cases', label: 'Review Cases' },
  student: { to: '/student/cases', label: 'My Cases' },
  dsw: { to: '/dashboard', label: 'Case Roster' },
  admin: { to: '/dashboard', label: 'Dashboard' },
};

const ROLE_NAMES = { warden: 'Warden', chief_warden: 'Chief Warden', dsw: 'DSW', admin: 'Admin' };

// Timeline entries for workflow steps the case has not completed yet (shown with an empty circle).
const PENDING_STEP_LABELS = {
  pending_chief: 'Chief Warden review',
  pending_dsw: 'DSW review',
  pending_admin: 'Admin decision',
  resolved: 'Case resolved',
};

function pendingSteps(status) {
  if (status === 'resolved') return [];
  const current = STEPS.findIndex((s) => s.key === status);
  if (current < 0) return [];
  return STEPS.slice(current).map((s) => ({ key: s.key, label: PENDING_STEP_LABELS[s.key] || s.label }));
}

const FORWARD_LABELS = {
  chief_warden: { button: 'Approve & forward to DSW', done: 'Case forwarded to the DSW.' },
  dsw: { button: 'Approve & forward to Admin', done: 'Case forwarded to the Admin for a final decision.' },
};

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children || '—'}</dd>
    </div>
  );
}

function Stepper({ status }) {
  const current = status === 'resolved' ? STEPS.length : STEPS.findIndex((s) => s.key === status);
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
    <ol className="grid grid-cols-5 gap-2 min-w-[520px] px-1">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.key} className="flex flex-col items-center text-center">
            <div className="flex items-center w-full">
              <span className={`flex-1 h-0.5 ${i === 0 ? 'invisible' : done || active ? 'bg-[#3d3793]' : 'bg-slate-200'}`} />
              <span
                className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
                  done ? 'bg-[#3d3793] text-white' : active ? 'bg-white border-2 border-[#3d3793] text-[#3d3793]' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? <Icon name="check" className="text-[18px]" /> : i + 1}
              </span>
              <span className={`flex-1 h-0.5 ${i === STEPS.length - 1 ? 'invisible' : done ? 'bg-[#3d3793]' : 'bg-slate-200'}`} />
            </div>
            <p className={`mt-2 text-xs font-medium ${active ? 'text-[#3d3793]' : 'text-slate-700'}`}>{step.label}</p>
            <p className="text-[11px] text-slate-400">{step.role}</p>
          </li>
        );
      })}
    </ol>
    </div>
  );
}

function AdminDecision({ caseItem, busy, onSubmit, initial = null }) {
  const [points, setPoints] = useState(initial?.penalty_points ?? caseItem.penalty_points ?? 0);
  const [fine, setFine] = useState(Number(initial?.fine ?? caseItem.fine ?? 0));
  const [decision, setDecision] = useState(initial?.decision ?? '');
  const input = 'w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#3d3793] focus:ring-4 focus:ring-indigo-100';

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ penalty_points: Number(points), fine: Number(fine), decision: decision.trim() });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-slate-500">
          Penalty points
          <input type="number" min="0" value={points} onChange={(e) => setPoints(e.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="text-xs text-slate-500">
          Fine (₹)
          <input type="number" min="0" value={fine} onChange={(e) => setFine(e.target.value)} className={`${input} mt-1`} />
        </label>
      </div>
      <label className="block text-xs text-slate-500">
        Decision
        <textarea
          required
          rows={3}
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          placeholder="e.g. 25 penalty points and ₹2,500 fine with counselling."
          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#3d3793] focus:ring-4 focus:ring-indigo-100"
        />
      </label>
      <Button type="submit" className="w-full" disabled={busy || !decision.trim()}>
        <Icon name="gavel" className="text-[18px]" />
        Resolve case
      </Button>
    </form>
  );
}

const MEETING_ROLES = ['admin', 'dsw', 'chief_warden', 'student'];
const DEFAULT_MEETING_LOCATION = 'Office of the Dean, Student Welfare';

function formatMeetingTime(value) {
  return new Date(value).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// Value for <input type="datetime-local"> in the browser's local time.
function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * In-person DAC meetings. The Admin schedules one while the case waits for the final decision;
 * the student is notified in the app and by email. Everyone else sees the list.
 */
function MeetingsCard({ meetings, canSchedule, isStudent, busy, onSchedule }) {
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState('');
  const [place, setPlace] = useState(DEFAULT_MEETING_LOCATION);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [minWhen, setMinWhen] = useState('');
  // Captured once per load: decides which meetings are labelled upcoming vs past.
  const [now] = useState(() => Date.now());

  if (!canSchedule && meetings.length === 0) return null;

  const openForm = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    setWhen(toLocalInputValue(tomorrow));
    setMinWhen(toLocalInputValue(new Date()));
    setPlace(DEFAULT_MEETING_LOCATION);
    setNotes('');
    setFormError('');
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const date = new Date(when);
    if (!when || Number.isNaN(date.getTime())) return setFormError('Pick a date and time.');
    if (date.getTime() <= Date.now()) return setFormError('The meeting must be in the future.');
    if (!place.trim()) return setFormError('Enter where the meeting is held.');
    setFormError('');
    const ok = await onSchedule({ scheduled_at: date.toISOString(), location: place.trim(), notes: notes.trim() });
    if (ok) setOpen(false);
  };

  return (
    <Card title="DAC Meeting" icon="event">
      <div className="px-6 pb-6 space-y-4">
        {meetings.length === 0 ? (
          <p className="text-sm text-slate-600">No meeting scheduled yet. Call the student for an in-person meeting before deciding.</p>
        ) : (
          <ul className="space-y-3">
            {meetings.map((m) => {
              const upcoming = new Date(m.scheduled_at).getTime() >= now;
              return (
                <li key={m.id} className={`rounded-lg border px-3 py-2.5 ${upcoming ? 'border-[#d9d6f3] bg-[#f6f5fd]' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-sm font-semibold text-slate-900">{formatMeetingTime(m.scheduled_at)}</p>
                  <p className="text-sm text-slate-700">{m.location}</p>
                  {m.notes && <p className="text-xs text-slate-600 mt-1">{m.notes}</p>}
                  <p className="text-xs text-slate-500 mt-1">
                    {upcoming ? 'Upcoming' : 'Past'}
                    {!isStudent && (m.email_sent ? ' · Email sent' : ` · No email: ${m.email_status || 'not sent'}`)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {canSchedule && !open && (
          <Button variant="outline" className="w-full" disabled={busy} onClick={openForm}>
            <Icon name="event_available" className="text-[18px]" />
            Send meeting reminder
          </Button>
        )}

        {canSchedule && open && (
          <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 p-3">
            <label className="block">
              <span className="text-xs text-slate-500">Date and time</span>
              <input
                type="datetime-local"
                value={when}
                min={minWhen}
                onChange={(e) => setWhen(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#3d3793] focus:ring-4 focus:ring-indigo-100"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Location</span>
              <input
                type="text"
                value={place}
                maxLength={200}
                onChange={(e) => setPlace(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#3d3793] focus:ring-4 focus:ring-indigo-100"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Note to the student (optional)</span>
              <textarea
                rows={2}
                value={notes}
                maxLength={1000}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Bring a parent/guardian and any supporting documents."
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#3d3793] focus:ring-4 focus:ring-indigo-100"
              />
            </label>
            {formError && <p className="text-xs text-rose-700">{formError}</p>}
            <p className="text-xs text-slate-500">The student is notified on their dashboard and by email.</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={busy}>
                <Icon name="send" className="text-[18px]" />
                Send
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}

/**
 * One case page for every role. The workflow action is shown only to the role
 * the case is currently assigned to (Chief Warden -> DSW -> Admin).
 */
export default function CaseDetail() {
  const params = useParams();
  const location = useLocation();
  // Set by the student profile when it opens a case, so Back returns to that profile.
  const returnTo = safeReturnPath(location.state?.from);
  const caseId = params.id || params.token;
  const { role } = useAuth();
  const [caseItem, setCaseItem] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [groupCases, setGroupCases] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [evidenceError, setEvidenceError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  // Values from the AI recommendation copied into the decision form; version re-mounts the form.
  const [prefill, setPrefill] = useState({ caseId: null, values: null, version: 0 });
  const decisionRef = useRef(null);

  const applyRecommendation = (values) => {
    setPrefill((prev) => ({ caseId: caseItem?.id, values, version: prev.version + 1 }));
    // Wait for the form to re-render, then bring it into view.
    requestAnimationFrame(() => {
      scrollToElement(decisionRef.current);
      decisionRef.current?.querySelector('textarea')?.focus({ preventScroll: true });
    });
  };

  const load = useCallback(async () => {
    try {
      const [item, events, files] = await Promise.all([
        getCaseById(caseId),
        getCaseTimeline(caseId).catch(() => []),
        getCaseEvidence(caseId).catch(() => []),
      ]);
      setCaseItem(item);
      setTimeline(events);
      setEvidence(Array.isArray(files) ? files : []);
      // Other students' cases from the same group incident: staff only.
      const linked = item?.incident_group_id && role !== 'student'
        ? await getGroupCases(item.id).catch(() => [])
        : [];
      setGroupCases(Array.isArray(linked) ? linked : []);
      const caseMeetings = MEETING_ROLES.includes(role) ? await getCaseMeetings(item.id).catch(() => []) : [];
      setMeetings(Array.isArray(caseMeetings) ? caseMeetings : []);
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Case not found.');
    } finally {
      setLoading(false);
    }
  }, [caseId, role]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (action, successMessage) => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await action();
      await load();
      setNotice({ type: 'success', text: typeof successMessage === 'function' ? successMessage(result) : successMessage });
    } catch (actionError) {
      setNotice({ type: 'error', text: actionError?.message || 'Action failed.' });
    } finally {
      setBusy(false);
    }
  };

  const back = returnTo
    ? { to: returnTo, label: 'Back to Student Profile' }
    : LIST_LINKS[role] || LIST_LINKS.admin;
  const status = String(caseItem?.status || '').toLowerCase();
  const assigned = String(caseItem?.assigned_to_role || '').toLowerCase();
  const canAct = Boolean(caseItem) && status !== 'resolved' && assigned === role;
  // Only use AI-filled values for the case they were generated for.
  const decisionPrefill = prefill.caseId === caseItem?.id ? prefill.values : null;

  // Storage links expire after 10 minutes, so fetch a fresh one on every click. The tab is
  // opened synchronously first; opening it after the await would be blocked as a popup.
  const openEvidence = async (index) => {
    setEvidenceError('');
    const tab = window.open('', '_blank');
    try {
      const fresh = await getCaseEvidence(caseItem.id);
      setEvidence(fresh);
      const url = fresh[index]?.url;
      if (!url) throw new Error('This evidence file is not available.');
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (openError) {
      tab?.close();
      setEvidenceError(openError?.message || 'Could not open the evidence file.');
    }
  };
  const scheduleMeeting = async (payload) => {
    let ok = false;
    await runAction(async () => {
      const meeting = await scheduleCaseMeeting(caseItem.id, payload);
      ok = true;
      return meeting;
    }, (meeting) => (meeting?.email_sent
      ? 'Meeting scheduled. The student was notified on their dashboard and by email.'
      : `Meeting scheduled and shown on the student's dashboard. No email sent: ${meeting?.email_status || 'unknown reason'}.`));
    return ok;
  };

  const resolvedWithWarning = status === 'resolved' && caseItem?.resolution_type === 'warning';
  const pending = caseItem ? pendingSteps(status) : [];

  const resolveWithWarning = () => {
    const confirmed = window.confirm(
      'Resolve this case by giving the student a warning? The case will be closed and all members will be notified.'
    );
    if (!confirmed) return;
    runAction(() => warnCase(caseItem.id), 'Case resolved with a warning to the student.');
  };

  const warningButton = (
    <Button
      variant="outline"
      className="w-full border-amber-300 text-amber-800 hover:bg-amber-50"
      disabled={busy}
      onClick={resolveWithWarning}
    >
      <Icon name="warning" className="text-[18px]" />
      Resolve with warning
    </Button>
  );

  return (
    <DACLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <Link to={back.to} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <Icon name="arrow_back" className="text-[18px]" />
          {back.label}
        </Link>

        {loading && <div className="h-40 rounded-2xl bg-white border border-slate-200/80 animate-pulse" />}

        {!loading && error && (
          <Card>
            <EmptyState icon="search_off">{error}</EmptyState>
          </Card>
        )}

        {!loading && caseItem && (
          <>
            {/* Header */}
            <Card className="px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">Case</p>
                  <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                    {caseItem.external_case_id || `#${caseItem.id}`}
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    {toTitleCase(caseItem.offense_type)}
                    {caseItem.substance_type ? ` · ${caseItem.substance_type}` : ''} · Reported {formatDate(caseItem.incident_date || caseItem.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <SeverityPill severity={caseItem.severity} />
                  <span className="px-3 py-1 rounded-full bg-slate-100">
                    <StatusText status={status} />
                  </span>
                </div>
              </div>
              <div className="mt-6">
                <Stepper status={status} />
              </div>
            </Card>

            {notice && (
              <p
                role="status"
                className={`text-sm rounded-xl px-4 py-3 border ${
                  notice.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-700'
                }`}
              >
                {notice.text}
              </p>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-8 space-y-6">
                {canAct && role === 'admin' && (
                  <AiRecommendationCard key={caseItem.id} caseId={caseItem.id} onApply={applyRecommendation} />
                )}

                <Card title="Incident Details" icon="report">
                  <dl className="px-6 pb-6 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
                    <Field label="Policy offence" className="col-span-2 md:col-span-3">{caseItem.policy_offence}</Field>
                    <Field label="Offence">{toTitleCase(caseItem.offense_type)}</Field>
                    <Field label="Substance">{caseItem.substance_type}</Field>
                    <Field label="Offence level">{caseItem.offense_level ? `Level ${caseItem.offense_level}` : null}</Field>
                    <Field label="Incident date">{formatDate(caseItem.incident_date)}</Field>
                    <Field label="Incident time">{caseItem.incident_time ? String(caseItem.incident_time).slice(0, 5) : null}</Field>
                    <Field label="Location">{caseItem.incident_location || caseItem.location}</Field>
                    {caseItem.alcohol_reading != null && <Field label="Alcohol reading">{caseItem.alcohol_reading}</Field>}
                    <Field label="Penalty points">{casePointsText(caseItem)}</Field>
                    <Field label="Fine">{caseFineText(caseItem)}</Field>
                  </dl>
                  <div className="px-6 pb-6 border-t border-slate-100 pt-5 space-y-4">
                    <div>
                      <p className="text-xs text-slate-500">Description</p>
                      <p className="mt-1 text-sm text-slate-800 leading-relaxed">{caseItem.description || '—'}</p>
                    </div>
                    {caseItem.notes && (
                      <div>
                        <p className="text-xs text-slate-500">Additional details</p>
                        <p className="mt-1 text-sm text-slate-800 leading-relaxed whitespace-pre-line">{caseItem.notes}</p>
                      </div>
                    )}
                    {caseItem.decision && (
                      <div>
                        <p className="text-xs text-slate-500">Decision</p>
                        <p className="mt-1 text-sm text-slate-800 leading-relaxed">{caseItem.decision}</p>
                      </div>
                    )}
                    {evidence.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500">Evidence</p>
                        <ul className="mt-1 space-y-1">
                          {evidence.map((file, index) => (
                            <li key={file.id ?? `legacy-${index}`}>
                              <button
                                type="button"
                                onClick={() => openEvidence(index)}
                                disabled={!file.url}
                                title={file.url ? file.name : 'File not available'}
                                className="inline-flex items-center gap-2 text-sm font-medium text-[#3d3793] hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                              >
                                <Icon name="attach_file" className="text-[18px]" />
                                View evidence{evidence.length > 1 ? ` ${index + 1}` : ''}
                                {!file.url && <span className="text-xs font-normal">(not available)</span>}
                              </button>
                            </li>
                          ))}
                        </ul>
                        {evidenceError && <p className="mt-1 text-xs text-rose-700">{evidenceError}</p>}
                      </div>
                    )}
                  </div>
                </Card>

                <Card title="Timeline" icon="history">
                  {timeline.length === 0 && pending.length === 0 ? (
                    <EmptyState icon="history">No timeline entries yet.</EmptyState>
                  ) : (
                    <ol className="px-6 pb-6">
                      {/* Recorded events are done: filled circle with a tick. */}
                      {timeline.map((event, i) => (
                        <li key={event.id} className="relative flex gap-4 pb-5 last:pb-0">
                          {i < timeline.length - 1 + pending.length && <span className="absolute left-[9px] top-5 bottom-0 w-px bg-slate-200" />}
                          <span className="relative mt-0.5 h-5 w-5 shrink-0 rounded-full bg-[#3d3793] text-white flex items-center justify-center" aria-label="Completed">
                            <Icon name="check" className="text-[14px]" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">{event.event}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {[event.performed_by_name, ROLE_NAMES[event.performed_by_role] || toTitleCase(event.performed_by_role)]
                                .filter(Boolean)
                                .join(' · ') || 'System'}{' '}
                              · {formatDateTime(event.timestamp)}
                            </p>
                            {event.notes && <p className="text-xs text-slate-600 mt-1">{event.notes}</p>}
                          </div>
                        </li>
                      ))}
                      {/* Workflow steps still to come: empty circle. */}
                      {pending.map((step, i) => (
                        <li key={`pending-${step.key}`} className="relative flex gap-4 pb-5 last:pb-0">
                          {i < pending.length - 1 && <span className="absolute left-[9px] top-5 bottom-0 w-px bg-slate-200" />}
                          <span className="relative mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 bg-white" aria-label="Pending" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-400">{step.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Pending</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </div>

              <div className="xl:col-span-4 space-y-6">
                {caseItem.incident_group_id && (
                  <Card title="Group Incident" icon="groups">
                    <div className="px-6 pb-6 space-y-3">
                      <p className="text-sm text-slate-600">
                        {role === 'student'
                          ? 'This case was registered as part of a group incident. Each student involved has a separate case.'
                          : `Registered together with ${groupCases.length} other student${groupCases.length === 1 ? '' : 's'}. Each student has a separate case.`}
                      </p>
                      {role !== 'student' && groupCases.length > 0 && (
                        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                          {groupCases.map((g) => (
                            <li key={g.id}>
                              <Link to={caseLink(role, g.id)} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50">
                                <span className="min-w-0">
                                  <span className="block text-sm font-medium text-slate-900 truncate">{g.student_name}</span>
                                  <span className="block text-xs text-slate-500">{g.external_case_id || `#${g.id}`} · {g.enrollment_no}</span>
                                </span>
                                <span className="shrink-0 text-xs text-slate-500">{statusLabel(g.status)}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Card>
                )}

                <Card title="Student" icon="person">
                  <div className="px-6 pb-6">
                    <div className="flex items-center gap-3">
                      <Avatar name={caseItem.student_name || ''} seed={caseItem.id} square size="h-11 w-11" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{caseItem.student_name}</p>
                        <p className="text-xs text-slate-500">{caseItem.enrollment_no}</p>
                        <StudentProfileLink enrollment={caseItem.enrollment_no} className="mt-1" />
                      </div>
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
                      <Field label="Program">{caseItem.program ? String(caseItem.program).toUpperCase() : null}</Field>
                      <Field label="Gender">{toTitleCase(caseItem.gender)}</Field>
                      <Field label="Hostel">{caseItem.hostel}</Field>
                      <Field label="Room">{caseItem.room}</Field>
                    </dl>
                  </div>
                </Card>

                <MeetingsCard
                  meetings={meetings}
                  canSchedule={canAct && role === 'admin'}
                  isStudent={role === 'student'}
                  busy={busy}
                  onSchedule={scheduleMeeting}
                />

                <Card title="Workflow" icon="account_tree">
                  <div className="px-6 pb-6 space-y-4">
                    {resolvedWithWarning && (
                      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                        <Icon name="warning" className="text-[18px] mt-0.5" />
                        <span>
                          Resolved by <span className="font-medium">{ROLE_NAMES[caseItem.resolved_by_role] || 'a reviewer'}</span> with a
                          warning to the student{caseItem.resolved_at ? ` on ${formatDate(caseItem.resolved_at)}` : ''}.
                        </span>
                      </p>
                    )}

                    {status === 'resolved' && !resolvedWithWarning && (
                      <p className="text-sm text-slate-600">
                        Resolved{caseItem.resolved_at ? ` on ${formatDate(caseItem.resolved_at)}` : ''}. No further action needed.
                      </p>
                    )}

                    {status === 'resolved' && role !== 'student' && <StaffPaymentStatus caseId={caseItem.id} />}

                    {status !== 'resolved' && !canAct && (
                      <p className="text-sm text-slate-600">
                        Waiting on the <span className="font-medium">{ROLE_NAMES[assigned] || 'next reviewer'}</span>.
                        {role === 'warden' && ' Registering the case already sent it to the Chief Warden.'}
                      </p>
                    )}

                    {canAct && FORWARD_LABELS[role] && (
                      <>
                        <p className="text-sm text-slate-600">This case is waiting on your review.</p>
                        <Button
                          className="w-full"
                          disabled={busy}
                          onClick={() => runAction(() => approveCase(caseItem.id), FORWARD_LABELS[role].done)}
                        >
                          <Icon name="send" className="text-[18px]" />
                          {FORWARD_LABELS[role].button}
                        </Button>
                        {warningButton}
                      </>
                    )}

                    {canAct && role === 'admin' && (
                      <div ref={decisionRef} className="space-y-4">
                        <p className="text-sm text-slate-600">Record the final decision to close this case.</p>
                        {decisionPrefill && (
                          <p className="text-xs text-[#3d3793]">Filled in from the AI recommendation. Review and edit before resolving.</p>
                        )}
                        <AdminDecision
                          key={prefill.version}
                          initial={decisionPrefill}
                          caseItem={caseItem}
                          busy={busy}
                          onSubmit={(values) =>
                            runAction(async () => {
                              await updateCase(caseItem.id, values);
                              return approveCase(caseItem.id);
                            }, (result) => {
                              const email = result?.email;
                              if (email?.sent) return `Case resolved and the decision recorded. Email sent to ${email.to}.`;
                              if (email?.reason) return `Case resolved and the decision recorded. No email sent: ${email.reason}.`;
                              return 'Case resolved and the decision recorded.';
                            })
                          }
                        />
                        {warningButton}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Fine payment (demo), directly below the Workflow panel, for resolved cases only.
                    The backend re-checks ownership and eligibility on every request. */}
                {role === 'student' && status === 'resolved' && <PaymentPanel caseItem={caseItem} />}
              </div>
            </div>
          </>
        )}
      </div>
    </DACLayout>
  );
}
