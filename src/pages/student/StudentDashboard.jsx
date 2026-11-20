import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DACLayout from '../../components/layout/DACLayout';
import CasesTable from '../../components/cases/CasesTable';
import OutstandingFinePanel from '../../components/payments/OutstandingFinePanel';
import PaymentHistoryCard from '../../components/payments/PaymentHistoryCard';
import { Card, Icon } from '../../components/cases/parts';
import { ACTIVE_STATUSES, fmtNumber, mapCase } from '../../components/cases/caseUi';
import { useAuth } from '../../context/AuthContext';
import { getCases, getMe, getMyMeetings } from '../../services/api';

// Total penalty points at which the DAC escalates a student's record.
const POINTS_THRESHOLD = 100;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const [me, setMe] = useState(null);
  const [cases, setCases] = useState([]);
  const [meetings, setMeetings] = useState([]);
  // Captured once per load: splits meetings into upcoming and past.
  const [now] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Bumped after a payment so the payment history reloads from the server.
  const [paymentsVersion, setPaymentsVersion] = useState(0);

  useEffect(() => {
    let mounted = true;
    Promise.all([getMe(), getCases(), getMyMeetings().catch(() => [])])
      .then(([user, rows, myMeetings]) => {
        if (!mounted) return;
        setMe(user);
        setCases(rows.map(mapCase));
        setMeetings(Array.isArray(myMeetings) ? myMeetings : []);
      })
      .catch((loadError) => mounted && setError(loadError?.message || 'Failed to load your record.'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const counts = useMemo(
    () => ({
      total: cases.length,
      active: cases.filter((c) => ACTIVE_STATUSES.includes(c.status)).length,
      resolved: cases.filter((c) => c.status === 'resolved').length,
    }),
    [cases]
  );

  const points = Number(me?.total_points || 0);
  const pct = Math.min(100, (points / POINTS_THRESHOLD) * 100);
  const tone =
    points >= POINTS_THRESHOLD
      ? { bar: 'bg-rose-500', text: 'text-[#9f1d35]', note: 'You have reached the escalation threshold. Your record is under DAC review.' }
      : points >= POINTS_THRESHOLD / 2
        ? { bar: 'bg-amber-500', text: 'text-[#9a5b16]', note: `${POINTS_THRESHOLD - points} points left before escalation.` }
        : { bar: 'bg-emerald-500', text: 'text-[#2f7a4d]', note: `${POINTS_THRESHOLD - points} points left before escalation.` };

  const firstName = (me?.name || currentUser?.name || '').split(' ')[0];

  const countCards = [
    { label: 'My cases', value: counts.total, icon: 'folder_open', card: 'bg-[#eeedfa] border-[#e0ddf6]', chip: 'bg-[#dcd9f5] text-[#4b44b5]' },
    { label: 'Active', value: counts.active, icon: 'schedule', card: 'bg-[#fbf1e5] border-[#f2e1cc]', chip: 'bg-[#f4dfc4] text-[#9a5b16]' },
    { label: 'Resolved', value: counts.resolved, icon: 'check', card: 'bg-[#eaf4ee] border-[#d5e9dc]', chip: 'bg-[#d2e8da] text-[#2f7a4d]' },
  ];

  return (
    <DACLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="border-l-4 border-[#3d3793] pl-4">
          <h1 className="text-2xl sm:text-[28px] text-slate-900 tracking-tight">
            {greeting()}{firstName ? ', ' : ''}<span className="font-semibold">{firstName}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Your disciplinary record and penalty points.</p>
        </div>

        {meetings.some((m) => new Date(m.scheduled_at).getTime() >= now) && (
          <Card title="DAC Meeting" icon="event">
            <div className="px-6 pb-6 space-y-3">
              <p className="text-sm text-slate-600">
                The Disciplinary Action Committee has called you for an in-person meeting. Attendance is required; the details were also emailed to you.
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {meetings
                  .filter((m) => new Date(m.scheduled_at).getTime() >= now)
                  .map((m) => (
                    <li key={m.id} className="rounded-xl border border-[#d9d6f3] bg-[#f6f5fd] px-4 py-3">
                      <p className="text-base font-semibold text-slate-900">
                        {new Date(m.scheduled_at).toLocaleString('en-IN', {
                          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
                        })}
                      </p>
                      <p className="text-sm text-slate-700 mt-0.5">{m.location}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Case {m.external_case_id || `#${m.case_id}`}{m.offense_type ? ` · ${m.offense_type}` : ''}
                      </p>
                      {m.notes && <p className="text-sm text-slate-700 mt-2">{m.notes}</p>}
                      <Link to={`/student/cases/${m.case_id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#3d3793] hover:underline">
                        View case <Icon name="arrow_forward" className="text-[18px]" />
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </Card>
        )}

        {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start xl:items-stretch">
          <Card title="Penalty Points" icon="speed" className="xl:col-span-5">
            <div className="px-6 pb-6">
              <p className="text-4xl font-semibold text-slate-900 tabular-nums">
                {loading ? '–' : fmtNumber(points)}
                <span className="text-base font-normal text-slate-500"> / {POINTS_THRESHOLD}</span>
              </p>
              <div className="mt-4 h-2.5 rounded-full bg-slate-100 overflow-hidden" role="meter" aria-valuenow={points} aria-valuemin={0} aria-valuemax={POINTS_THRESHOLD}>
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${loading ? 0 : pct}%` }} />
              </div>
              {!loading && <p className={`mt-3 text-sm ${tone.text}`}>{tone.note}</p>}
              <Link to="/student/disciplinary-policy" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#3d3793] hover:underline">
                How points work <Icon name="arrow_forward" className="text-[18px]" />
              </Link>
            </div>
          </Card>

          <div className="xl:col-span-7 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {countCards.map((item) => (
              <div key={item.label} className={`rounded-2xl border px-5 py-6 flex items-center gap-4 ${item.card}`}>
                <span className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center ${item.chip}`}>
                  <Icon name={item.icon} className="text-[24px]" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{item.label}</span>
                  <span className="block text-3xl font-semibold text-slate-900 tabular-nums">{loading ? '–' : fmtNumber(item.value)}</span>
                </span>
              </div>
            ))}
            </div>

            {/* Fine due, in the space under the count cards (right of Penalty Points). */}
            <OutstandingFinePanel studentName={me?.name || currentUser?.name} onPaid={() => setPaymentsVersion((v) => v + 1)} />
          </div>
        </div>

        <CasesTable cases={cases} loading={loading} role="student" title="My Cases" pageSize={5} showStudent={false} />

        <PaymentHistoryCard refreshKey={paymentsVersion} />
      </div>
    </DACLayout>
  );
}
