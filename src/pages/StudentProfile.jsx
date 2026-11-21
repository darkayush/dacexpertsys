import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import DACLayout from '../components/layout/DACLayout';
import { Avatar, Card, EmptyState, Icon, SeverityPill, StatusText } from '../components/cases/parts';
import { caseFineText, caseLink, casePointsText, fmtNumber, formatDate, statusLabel, toTitleCase } from '../components/cases/caseUi';
import { useAuth } from '../context/AuthContext';
import { getStudentProfile } from '../services/api';

const BACK_LINKS = {
  admin: { to: '/dashboard', label: 'Dashboard' },
  dsw: { to: '/dashboard', label: 'Dashboard' },
  warden: { to: '/warden/dashboard', label: 'Dashboard' },
  chief_warden: { to: '/chief-warden/dashboard', label: 'Dashboard' },
};

const ROLE_NAMES = { warden: 'Warden', chief_warden: 'Chief Warden', dsw: 'DSW', admin: 'Admin' };

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children || '—'}</dd>
    </div>
  );
}

function StatTile({ icon, label, value }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4">
      <span className="h-11 w-11 shrink-0 rounded-xl bg-[#f0eefc] text-[#3d3793] flex items-center justify-center">
        <Icon name={icon} className="text-[22px]" />
      </span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

/**
 * Student profile for staff roles (admin, DSW, warden, chief warden). Data comes
 * from GET /api/cases/student/:enrollmentNo/profile, which enforces the same roles.
 */
export default function StudentProfile() {
  const { enrollmentNo } = useParams();
  const location = useLocation();
  const { role } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setProfile(await getStudentProfile(enrollmentNo));
      setError('');
    } catch (loadError) {
      setProfile(null);
      setError(loadError?.message || 'Student not found.');
    } finally {
      setLoading(false);
    }
  }, [enrollmentNo]);

  useEffect(() => {
    load();
  }, [load]);

  const back = BACK_LINKS[role] || BACK_LINKS.admin;
  const student = profile?.student;
  const summary = profile?.summary;
  const cases = profile?.cases || [];

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

        {!loading && student && (
          <>
            <Card className="overflow-hidden">
              <div className="p-6 sm:p-8 flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
                <Avatar
                  name={student.name}
                  seed={Number(student.enrollment_no) || 0}
                  square
                  size="h-20 w-20 sm:h-24 sm:w-24"
                  textClass="text-2xl"
                />
                <div className="min-w-0 space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3d3793]">Student Profile</p>
                  <h1 className="text-2xl sm:text-3xl font-semibold leading-tight text-slate-900 tracking-tight break-words">
                    {student.name}
                  </h1>
                  <p className="inline-flex items-center gap-2 rounded-full bg-[#f0eefc] px-3 py-1 text-xs font-medium text-[#3d3793]">
                    <Icon name="badge" className="text-[15px]" />
                    Enrollment <span className="font-mono font-semibold">{student.enrollment_no}</span>
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile icon="folder_open" label="Total DAC cases" value={fmtNumber(summary.total_cases)} />
              <StatTile
                icon="report"
                label="Total DAC penalty points"
                value={fmtNumber(summary.total_points)}
              />
              <StatTile icon="pending_actions" label="Active cases" value={fmtNumber(summary.active_cases)} />
              <StatTile icon="task_alt" label="Resolved cases" value={fmtNumber(summary.resolved_cases)} />
            </div>

            <Card title="Student Information" icon="person">
              <dl className="px-6 pb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Email">{student.email}</Field>
                <Field label="Program / Department">{toTitleCase(student.program)}</Field>
                <Field label="Year">{student.year}</Field>
                <Field label="Gender">{toTitleCase(student.gender)}</Field>
                <Field label="Hostel">{student.hostel}</Field>
                <Field label="Room">{student.room}</Field>
                <Field label="Student status">{toTitleCase(student.student_status)}</Field>
              </dl>
            </Card>

            <Card title="All Disciplinary Cases" icon="gavel">
              {cases.length === 0 ? (
                <div className="px-6 pb-6">
                  <EmptyState icon="inbox">No DAC cases on record for this student.</EmptyState>
                </div>
              ) : (
                <ul className="px-6 pb-4 divide-y divide-slate-100">
                  {cases.map((c) => (
                    <li key={c.id} className="py-4 grid gap-3 md:grid-cols-[1.4fr_1fr_1.1fr_auto] md:items-center">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-[#3d3793]">{c.external_case_id || `#${c.id}`}</p>
                        <p className="text-sm font-medium text-slate-900">
                          {toTitleCase(c.offense_type) || '—'}
                          {c.substance_type ? ` · ${toTitleCase(c.substance_type)}` : ''}
                        </p>
                        <p className="text-xs text-slate-500">Incident: {formatDate(c.incident_date)}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <SeverityPill severity={c.severity} />
                        <StatusText status={c.status} />
                      </div>

                      <div className="text-xs text-slate-600 space-y-0.5">
                        <p>
                          {/* Points and fine are shown once the DAC resolves the case (a warning counts no points). */}
                          Points: <strong className="text-slate-900">{casePointsText(c)}</strong>
                          {c.status === 'resolved' && c.resolution_type === 'warning' && <span className="text-slate-500"> (warning: not counted)</span>}
                          {' '}· Fine: {caseFineText(c)}
                        </p>
                        <p className="text-slate-500">
                          Stage: {statusLabel(c.status)}
                          {c.status !== 'resolved' && c.assigned_to_role ? ` · ${ROLE_NAMES[c.assigned_to_role] || toTitleCase(c.assigned_to_role)}` : ''}
                        </p>
                      </div>

                      <Link
                        to={caseLink(role, c.id)}
                        state={{ from: location.pathname }}
                        className="justify-self-start md:justify-self-end inline-flex items-center gap-1 h-9 px-4 rounded-lg bg-[#3d3793] hover:bg-[#332e7d] text-white text-sm font-medium"
                      >
                        View Case
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </DACLayout>
  );
}
