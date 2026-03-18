import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';

// ─── Constants ────────────────────────────────────────────────────────────────
const offenseOptions = [
  'Plagiarism', 'Vandalism', 'Exam Malpractice', 'Attendance',
  'Disruption', 'Substance Abuse', 'Harassment', 'Other',
];

const STEPS = ['Student Info', 'Incident Details', 'Evidence', 'Assessment', 'Review', 'Submit'];

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ steps, currentStep }) {
  const percentage = steps.length <= 1 ? 100 : Math.round((currentStep / (steps.length - 1)) * 100);
  const currentLabel = steps[currentStep] ?? steps[steps.length - 1];

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[#1f3a89] truncate">{currentLabel}</span>
        <span className="text-[#64748b] font-medium whitespace-nowrap ml-2">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>
      <div className="relative h-5 rounded-full bg-[#e2e8f0] overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#1f3a89] to-[#3b5fc0] transition-all duration-500 ease-in-out flex items-center justify-end pr-2"
          style={{ width: `${Math.max(percentage, 4)}%` }}
        >
          {percentage >= 12 && (
            <span className="text-white text-xs font-bold leading-none">{percentage}%</span>
          )}
        </div>
        {percentage < 12 && (
          <span
            className="absolute top-1/2 -translate-y-1/2 text-xs font-bold text-[#1f3a89]"
            style={{ left: `calc(${Math.max(percentage, 4)}% + 6px)` }}
          >
            {percentage}%
          </span>
        )}
      </div>
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <span
            key={index}
            className={`text-[10px] font-medium text-center transition-colors duration-300 ${
              index < currentStep
                ? 'text-[#1f3a89]'
                : index === currentStep
                ? 'text-[#1f3a89] font-bold'
                : 'text-[#94a3b8]'
            }`}
            style={{ width: `${100 / steps.length}%` }}
          >
            {step}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Field Component ──────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[#334155] text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'bg-[#f8fafc] border border-[#cbd5e1] rounded-lg px-3 py-2.5 text-[#0f172a] text-base placeholder:text-[#94a3b8] focus:outline-none focus:border-[#1f3a89] focus:ring-1 focus:ring-[#1f3a89] transition-colors';

// ─── Step Sections ────────────────────────────────────────────────────────────

function StepStudentInfo({ form, set }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">person</span>
        <h2 className="text-[#0f172a] font-bold text-[18px] leading-7">Student Information</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        {[
          { label: 'Student Name', field: 'studentName', placeholder: 'e.g. John Doe' },
          { label: 'Roll Number', field: 'rollNumber', placeholder: 'e.g. CS-2023-045' },
          { label: 'Department', field: 'department', placeholder: 'e.g. Computer Science' },
          { label: 'Hostel Block', field: 'hostelBlock', placeholder: 'e.g. Block A, Room 101' },
        ].map(({ label, field, placeholder }) => (
          <Field key={field} label={label}>
            <input
              type="text"
              value={form[field]}
              onChange={set(field)}
              placeholder={placeholder}
              className={inputCls}
            />
          </Field>
        ))}
      </div>
    </div>
  );
}

function StepIncidentDetails({ form, set }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#1f3a89] text-[22px]">report</span>
        <h2 className="text-[#0f172a] font-bold text-[18px] leading-7">Incident Details</h2>
      </div>
      <Field label="Offense Type">
        <div className="relative">
          <select
            value={form.offenseType}
            onChange={set('offenseType')}
            className={`w-full appearance-none ${inputCls} py-3 cursor-pointer`}
          >
            <option value="" disabled>Select offense category...</option>
            {offenseOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] text-[20px] pointer-events-none">
            expand_more
          </span>
        </div>
      </Field>
      <Field label="Incident Description">
        <textarea
          value={form.description}
          onChange={set('description')}
          rows={5}
          placeholder="Describe the incident in detail, including time, location, and involved parties..."
          className={`${inputCls} resize-y`}
        />
      </Field>
    </div>
  );
}

function StepEvidence({ dragOver, setDragOver }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#1f3a89] text-[20px]">attach_file</span>
        <h2 className="text-[#0f172a] font-bold text-[18px] leading-7">Evidence Upload</h2>
      </div>
      <p className="text-[#64748b] text-sm leading-5">
        Attach any supporting materials — photos, videos, or signed witness statements.
      </p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
        className={`h-44 flex flex-col items-center justify-center gap-2 bg-[#f8fafc] border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
          dragOver ? 'border-[#1f3a89] bg-[#f0f4ff]' : 'border-[#cbd5e1]'
        }`}
      >
        <span className="material-symbols-outlined text-[#94a3b8] text-[36px]">upload_file</span>
        <p className="text-sm">
          <span className="font-semibold text-[#1f3a89]">Click to upload</span>
          <span className="text-[#64748b]"> or drag and drop</span>
        </p>
        <p className="text-[#64748b] text-xs">PDF, JPG, PNG or MP4 (MAX. 10MB)</p>
      </div>
    </div>
  );
}

function StepAssessment({ intoxicated, setIntoxicated, cooperated, setCooperated, offenseCount, setOffenseCount, form, set }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#1f3a89] text-[20px]">psychology</span>
        <h2 className="text-[#0f172a] font-bold text-[18px] leading-7">Incident Assessment</h2>
      </div>
      <p className="text-[#64748b] text-sm leading-5">
        Answer the following to determine the recommended disciplinary action framework.
      </p>

      {/* Q1 */}
      <div className="flex flex-col gap-1">
        <p className="text-[#0f172a] font-semibold text-base leading-6">Was the student intoxicated?</p>
        <p className="text-[#64748b] text-sm leading-5">Evidence of alcohol consumption, breathalyzer, or field sobriety test.</p>
        <div className="flex gap-4 pt-3">
          {[{ value: true, label: 'Yes, evidence present' }, { value: false, label: 'No, sober' }].map(({ value, label }) => (
            <label key={String(value)} className="flex-1 cursor-pointer">
              <input type="radio" className="sr-only" checked={intoxicated === value} onChange={() => setIntoxicated(value)} />
              <div className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${intoxicated === value ? 'bg-[#f0f4ff] border-[#1f3a89]' : 'bg-white border-[#e2e4ea]'}`}>
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${intoxicated === value ? 'border-[#1f3a89] bg-[#1f3a89]' : 'border-[#cbd5e1]'}`}>
                  {intoxicated === value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="text-[#334155] text-base font-medium">{label}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Q2 */}
      <div className="flex flex-col gap-1">
        <p className="text-[#0f172a] font-semibold text-base leading-6">Did the student cooperate with officials?</p>
        <p className="text-[#64748b] text-sm leading-5 pb-3">Compliance with campus security or faculty requests during the incident.</p>
        <div className="inline-flex p-1 bg-[#f6f6f8] rounded-lg gap-1">
          {['Yes', 'No'].map((opt) => {
            const val = opt === 'Yes';
            return (
              <button key={opt} type="button" onClick={() => setCooperated(val)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${cooperated === val ? 'bg-white text-[#1f3a89] shadow-[0_1px_2px_rgba(0,0,0,0.05)]' : 'text-[#475569] hover:text-[#0f172a]'}`}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Q3 */}
      <div className="flex flex-col gap-1">
        <p className="text-[#0f172a] font-semibold text-base leading-6">Offense Count</p>
        <p className="text-[#64748b] text-sm leading-5">How many prior related offenses has the student committed?</p>
        <div className="flex gap-4 pt-3">
          {[{ count: 1, label: '1st' }, { count: 2, label: '2nd' }, { count: 3, label: '3rd+' }].map(({ count, label }) => (
            <button key={count} type="button" onClick={() => setOffenseCount(count)}
              className={`relative flex-1 flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${offenseCount === count ? 'bg-[#1f3a89]/5 border-[#1f3a89]' : 'border-[#e2e4ea] hover:bg-slate-50'}`}>
              <span className="text-[#0f172a] font-bold text-2xl leading-8">{label}</span>
              <span className="text-[#64748b] text-xs">Offense</span>
              {offenseCount === count && (
                <span className="material-symbols-outlined absolute top-3 right-3 text-[#1f3a89] text-[15px]">check_circle</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Additional Notes */}
      <div className="flex flex-col gap-2">
        <label className="text-[#0f172a] font-semibold text-base leading-6">
          Additional Notes <span className="font-normal text-[#94a3b8]">(Optional)</span>
        </label>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          rows={3}
          placeholder="Enter any mitigating circumstances..."
          className="bg-white border border-[#e2e4ea] rounded-lg px-3 py-3 text-[#0f172a] text-base placeholder:text-[#94a3b8] resize-y focus:outline-none focus:border-[#1f3a89] focus:ring-1 focus:ring-[#1f3a89] transition-colors"
        />
      </div>
    </div>
  );
}

function StepReview({ form, intoxicated, cooperated, offenseCount }) {
  const rows = [
    { label: 'Student Name', value: form.studentName || '—' },
    { label: 'Roll Number', value: form.rollNumber || '—' },
    { label: 'Department', value: form.department || '—' },
    { label: 'Hostel Block', value: form.hostelBlock || '—' },
    { label: 'Offense Type', value: form.offenseType || '—' },
    { label: 'Intoxicated', value: intoxicated === null ? '—' : intoxicated ? 'Yes' : 'No' },
    { label: 'Cooperated', value: cooperated ? 'Yes' : 'No' },
    { label: 'Offense Count', value: `${offenseCount}${offenseCount === 3 ? '+' : ''}` },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#1f3a89] text-[20px]">fact_check</span>
        <h2 className="text-[#0f172a] font-bold text-[18px] leading-7">Review Submission</h2>
      </div>
      <p className="text-[#64748b] text-sm leading-5">Please verify all details before submitting.</p>
      <div className="rounded-lg border border-[#e2e8f0] overflow-hidden">
        {rows.map(({ label, value }, i) => (
          <div key={label} className={`flex items-center justify-between px-4 py-3 ${i % 2 === 0 ? 'bg-[#f8fafc]' : 'bg-white'}`}>
            <span className="text-[#64748b] text-sm">{label}</span>
            <span className="text-[#0f172a] text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>
      {form.description && (
        <div className="flex flex-col gap-1">
          <span className="text-[#64748b] text-sm">Description</span>
          <p className="text-[#0f172a] text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-4 py-3 leading-5">{form.description}</p>
        </div>
      )}
    </div>
  );
}

function StepSubmit({ caseResult, loading, error, onSubmit, onNavigateDashboard }) {
  if (caseResult) {
    return (
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="w-16 h-16 rounded-full bg-[#ecfdf5] flex items-center justify-center">
          <span className="material-symbols-outlined text-[#047857] text-[36px]">check_circle</span>
        </div>
        <div className="text-center flex flex-col gap-2">
          <h2 className="text-[#0f172a] font-bold text-[22px]">Case Submitted Successfully</h2>
          <p className="text-[#64748b] text-sm">Your case has been registered and is now under review.</p>
        </div>
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl px-8 py-4 flex flex-col items-center gap-1">
          <span className="text-[#065f46] text-xs font-semibold uppercase tracking-widest">Case Token</span>
          <span className="text-[#047857] font-bold text-2xl" style={{ fontFamily: 'Liberation Mono, monospace' }}>
            {caseResult.token}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
          {[
            { label: 'Level', value: `Level ${caseResult.offenseLevel}` },
            { label: 'Fine', value: `Rs. ${caseResult.fine?.toLocaleString()}` },
            { label: 'Points', value: `-${caseResult.penaltyPoints} pts` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-[#d1fae5] rounded-lg p-3 text-center">
              <p className="text-[#047857] font-bold text-sm">{value}</p>
              <p className="text-[#065f46] text-xs">{label}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onNavigateDashboard}
          className="px-8 py-3 bg-[#1f3a89] text-white text-base font-medium rounded-lg hover:bg-[#162d6b] transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#1f3a89] text-[20px]">send</span>
        <h2 className="text-[#0f172a] font-bold text-[18px] leading-7">Submit Case</h2>
      </div>
      <p className="text-[#64748b] text-sm leading-5">
        By submitting, you confirm that all information provided is accurate and complete.
      </p>
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5">error</span>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full px-8 py-4 bg-[#c02525] text-white text-base font-bold rounded-lg shadow-[0_10px_15px_-3px_rgba(192,37,37,0.3)] hover:bg-[#a81f1f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            Submitting…
          </>
        ) : (
          <>
            Submit Case
            <span className="material-symbols-outlined text-[18px]">send</span>
          </>
        )}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RegisterCase() {
  const navigate = (typeof window !== 'undefined' && window.__navigate) ? window.__navigate : () => {};

  const [currentStep, setCurrentStep] = useState(0);

  const [form, setForm] = useState({
    studentName: '', rollNumber: '', department: '', hostelBlock: '',
    offenseType: '', description: '', notes: '',
  });
  const [intoxicated, setIntoxicated] = useState(null);
  const [cooperated, setCooperated] = useState(true);
  const [offenseCount, setOffenseCount] = useState(1);
  const [dragOver, setDragOver] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [caseResult, setCaseResult] = useState(null);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((r) => setTimeout(r, 1200));
      const token = `DAC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setCaseResult({ token, offenseLevel: 2, severityScore: 65, fine: 5000, penaltyPoints: 10 });
    } catch (err) {
      setError(err?.message ?? 'Failed to submit case. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goPrev = () => setCurrentStep((s) => Math.max(0, s - 1));
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  const stepContent = [
    <StepStudentInfo form={form} set={set} />,
    <StepIncidentDetails form={form} set={set} />,
    <StepEvidence dragOver={dragOver} setDragOver={setDragOver} />,
    <StepAssessment
      intoxicated={intoxicated} setIntoxicated={setIntoxicated}
      cooperated={cooperated} setCooperated={setCooperated}
      offenseCount={offenseCount} setOffenseCount={setOffenseCount}
      form={form} set={set}
    />,
    <StepReview form={form} intoxicated={intoxicated} cooperated={cooperated} offenseCount={offenseCount} />,
    <StepSubmit
      caseResult={caseResult} loading={loading} error={error}
      onSubmit={handleSubmit}
      onNavigateDashboard={() => navigate('/dashboard')}
    />,
  ];

  return (
    <div className="min-h-screen bg-[#f6f6f8] font-[Inter,sans-serif]">
      <Sidebar />
      <main className="pt-14 md:pt-0 md:pl-64 overflow-y-auto py-8 md:py-[60px] px-4 md:px-8">
        <div className="max-w-[1000px] mx-auto flex flex-col gap-6">

          {/* Page header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-[#0f172a] text-[28px] md:text-[30px] font-black tracking-[-0.9px] leading-tight pt-4">
              Register New Disciplinary Case
            </h1>
            <p className="text-[#64748b] text-base leading-7">
              Submit details below to initiate an automated disciplinary review.
            </p>
            <div className="pb-2">
              <ProgressBar steps={STEPS} currentStep={currentStep} />
            </div>
          </div>

          {/* Two-column layout */}
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* ── LEFT: step card ── */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-8 flex flex-col gap-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                  >
                    {stepContent[currentStep]}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                {!(isLast && caseResult) && (
                  <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0]">
                    <button
                      type="button"
                      onClick={goPrev}
                      disabled={isFirst}
                      className="flex items-center gap-2 px-6 py-3 text-[#475569] text-base font-medium hover:text-[#0f172a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                      Previous
                    </button>

                    {!isLast && (
                      <button
                        type="button"
                        onClick={goNext}
                        className="flex items-center gap-2 px-8 py-3 bg-[#1f3a89] text-white text-base font-medium rounded-lg shadow-[0_10px_15px_-3px_rgba(31,58,137,0.3)] hover:bg-[#162d6b] transition-colors"
                      >
                        Next Step
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: compact sidebar ── */}
            <div className="w-full lg:w-[280px] lg:flex-shrink-0 flex flex-col gap-4">

              {/* Filling Guidelines — compact */}
              <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0f172a] text-[16px]">info</span>
                  <h3 className="text-[#0f172a] font-bold text-sm leading-5">Filling Guidelines</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    "Ensure the Roll Number is exact to auto-fetch academic history.",
                    "Select the most severe offense if multiple violations occurred.",
                    "Attach clear evidence or signed witness statements.",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#f1f5f9] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[#64748b] text-[10px] font-bold">{i + 1}</span>
                      </div>
                      <p className="text-[#475569] text-xs leading-4">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Token Generation — compact */}
              <div className={`relative rounded-xl p-4 overflow-hidden border ${caseResult ? 'bg-[#ecfdf5] border-[#a7f3d0]' : 'bg-[#ecfdf5] border-[#a7f3d0]'}`}>
                <div className="absolute top-0 right-0 opacity-10 p-3">
                  <span className="material-symbols-outlined text-[60px] text-emerald-600">token</span>
                </div>
                <div className="relative flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#047857] text-[16px]">
                      {caseResult ? 'check_circle' : 'verified'}
                    </span>
                    <span className="text-[#047857] font-bold text-[10px] tracking-[0.7px] uppercase">
                      {caseResult ? 'Case Registered' : 'Token Generation'}
                    </span>
                  </div>
                  <p className="text-[#065f46] text-xs leading-4">
                    {caseResult
                      ? 'Case created. Use this token to track.'
                      : 'A unique tracking ID will be generated on submission.'}
                  </p>
                  <div className="flex items-center justify-between bg-white border border-[#d1fae5] rounded px-3 py-2 mt-1">
                    <span className="text-[#047857] font-bold text-base" style={{ fontFamily: 'Liberation Mono, monospace' }}>
                      {caseResult ? caseResult.token : 'DAC-2026-XXXX'}
                    </span>
                    {caseResult && (
                      <button type="button" title="Copy token" onClick={() => navigator.clipboard.writeText(caseResult.token)}>
                        <span className="material-symbols-outlined text-[#047857] text-[18px]">content_copy</span>
                      </button>
                    )}
                  </div>
                  {caseResult && (
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      {[
                        { label: 'Level', value: `Lvl ${caseResult.offenseLevel}` },
                        { label: 'Fine', value: `₹${caseResult.fine?.toLocaleString()}` },
                        { label: 'Points', value: `-${caseResult.penaltyPoints}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white border border-[#d1fae5] rounded p-1.5 text-center">
                          <p className="text-[#047857] font-bold text-xs">{value}</p>
                          <p className="text-[#065f46] text-[9px]">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}