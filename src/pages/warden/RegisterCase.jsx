import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DACLayout from '../../components/layout/DACLayout';
import { useAuth } from '../../context/AuthContext';
import StudentCard from '../../components/ui/StudentCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { createCase, createGroupCases, getOffenceTypes, getRules, getStudentHistory, translateHindiToEnglish, uploadEvidence } from '../../services/api';

// Offence types and their offences come from Admin Settings → Rules & Policies: each rule has an
// offence_type, and the types list (with its order) is served by /api/policies/dac.
// These types have extra fields on this form.
const HARASSMENT_TYPE = 'Harassment & Violence';
const PROPERTY_TYPE = 'Property Damage & Theft';

// "Exam: ..." / "Plagiarism: ..." prefixes repeat the type, so they are dropped in the list.
const offenceLabel = (rule) => String(rule.question || '').replace(/^(Exam|Plagiarism):\s*/i, '');

// Rules of one offence type, grouped by level (category) in first-seen order.
function groupRulesByLevel(rules) {
  const groups = new Map();
  rules.forEach((rule) => {
    const key = rule.category || 'No level';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rule);
  });
  return [...groups.entries()];
}

const STEPS = ['Student Info', 'Incident Details', 'Evidence', 'Review', 'Submit'];

function ProgressBar({ steps, currentStep }) {
  // Steps sit in equal-width columns, so each circle's centre is at (i + 0.5) / n of the
  // width. The lines run from the first centre to the last, at the circles' vertical
  // centre (18px = half of the 36px circle), not the centre of circle + label.
  const count = steps.length;
  const edge = 50 / count; // % from each side to the first / last circle centre
  const span = 100 - 2 * edge; // % between first and last circle centres
  const progress = count > 1 ? Math.min(currentStep, count - 1) / (count - 1) : 0;

  return (
    <div className="w-full bg-white rounded-2xl border border-[#edf2f7] p-5 shadow-xs">
      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        {/* Background track line */}
        <div
          className="absolute top-[18px] -translate-y-1/2 h-0.5 bg-[#edf2f7] z-0"
          style={{ left: `${edge}%`, right: `${edge}%` }}
        />
        {/* Active progress fill line */}
        <div
          className="absolute top-[18px] -translate-y-1/2 h-0.5 bg-[#3d3793] z-0 transition-all duration-500 ease-in-out"
          style={{ left: `${edge}%`, width: `${progress * span}%` }}
        />

        {steps.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div key={step} className="flex flex-col items-center text-center relative z-10">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isDone
                    ? 'bg-[#3d3793] text-white shadow-sm'
                    : isCurrent
                    ? 'bg-[#3d3793] text-white shadow-md/25 '
                    : 'bg-white border border-[#e2e8f0] text-[#94a3b8]'
                }`}
              >
                {isDone ? (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={`mt-2 text-[11px] sm:text-xs font-semibold leading-tight transition-colors ${
                  isCurrent ? 'text-[#3d3793]' : isDone ? 'text-[#0f172a]' : 'text-[#94a3b8]'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[#334155] text-xs font-bold uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-[#0f172a] text-sm placeholder:text-[#94a3b8] focus:outline-none focus:border-[#3d3793] focus:ring-2 focus:ring-[#3d3793]/20 transition-all font-medium';

function toTitleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toYearLabel(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/year/i.test(raw)) return raw;
  const n = Number(raw);
  if (Number.isNaN(n)) return raw;
  const suffix = n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th';
  return `${n}${suffix} Year`;
}

function StepStudentInfo({
  form,
  set,
  onEnrollmentChange,
  onEnrollmentBlur,
  onEnrollmentKeyDown,
  lookupLoading,
  lookupStatusType,
  lookupStatusMessage,
  errors,
  getInputClass,
  studentHistory,
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2.5 pb-3 border-b border-[#edf2f7]">
        <div className="w-8 h-8 rounded-xl bg-[#3d3793]/10 text-[#3d3793] flex items-center justify-center font-bold">
          <span className="material-symbols-outlined text-[18px]">person</span>
        </div>
        <div>
          <h2 className="text-[#0f172a] font-bold text-base leading-tight">Student Information</h2>
          <p className="text-[#94a3b8] text-xs">Lookup student by university enrollment ID</p>
        </div>
      </div>

      {studentHistory?.student && (
        <StudentCard
          student={studentHistory.student}
          previousPoints={studentHistory.student.total_points || 0}
          caseCount={studentHistory.cases?.length || 0}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        <Field label="Enrollment Number *">
          <div className="relative">
            <input
              type="text"
              value={form.rollNumber}
              onChange={onEnrollmentChange}
              onBlur={onEnrollmentBlur}
              onKeyDown={onEnrollmentKeyDown}
              data-field="rollNumber"
              placeholder="e.g. 240123"
              className={getInputClass('rollNumber')}
            />
            {lookupLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[#3d3793] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {lookupLoading ? <p className="text-xs text-[#64748b]">Looking up student in directory...</p> : null}
          {errors.rollNumber ? <p className="text-xs text-red-600 font-medium">{errors.rollNumber}</p> : null}
        </Field>

        <Field label="Student Name">
          <input
            type="text"
            value={form.studentName}
            placeholder="Auto-populated upon lookup"
            readOnly
            className={`${inputCls} bg-[#f1f5f9] cursor-not-allowed`}
          />
        </Field>

        <Field label="Department">
          <input
            type="text"
            value={form.department}
            onChange={set('department')}
            placeholder="Department / Program"
            className={inputCls}
          />
        </Field>

        <Field label="Year">
          <input
            type="text"
            value={form.year}
            onChange={set('year')}
            placeholder="e.g. 2nd Year"
            className={inputCls}
          />
        </Field>

        <Field label="Hostel">
          <input
            type="text"
            value={form.hostel}
            onChange={set('hostel')}
            placeholder="Hostel name or block"
            className={inputCls}
          />
        </Field>

        <Field label="Room Number">
          <input
            type="text"
            value={form.roomNo}
            onChange={set('roomNo')}
            placeholder="Room number"
            className={inputCls}
          />
        </Field>

        {lookupStatusMessage ? (
          <div
            className={`sm:col-span-2 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
              lookupStatusType === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {lookupStatusType === 'success' ? 'check_circle' : 'error'}
            </span>
            {lookupStatusMessage}
          </div>
        ) : null}

        {studentHistory ? (
          <div className="sm:col-span-2 rounded-2xl border border-[#edf2f7] bg-[#f8fafc] p-4 text-xs text-[#334155] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0f172a] text-xs">Prior Disciplinary History (Informational)</span>
              <span className="text-[#64748b] text-[11px]">
                Total Prior Cases: <strong className="text-[#0f172a]">{studentHistory.summary.total}</strong> · DAC Points: <strong className="text-[#3d3793]">{studentHistory.student.total_points || 0}</strong>
              </span>
            </div>
            {studentHistory.cases?.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-[#edf2f7] bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] border-b border-[#edf2f7] text-[10px] font-bold text-[#94a3b8] uppercase">
                    <tr>
                      <th className="px-3 py-2">Case ID</th>
                      <th className="px-3 py-2">Offense</th>
                      <th className="px-3 py-2">Substance</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2f7]">
                    {studentHistory.cases.slice(0, 5).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 font-mono font-medium">{item.case_id || item.id}</td>
                        <td className="px-3 py-2 font-medium text-[#0f172a]">{item.offense_type}</td>
                        <td className="px-3 py-2 text-[#64748b]">{item.substance_type || '—'}</td>
                        <td className="px-3 py-2 text-[#64748b]">{item.incident_date ? String(item.incident_date).slice(0, 10) : '—'}</td>
                        <td className="px-3 py-2"><StatusBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[#64748b] text-xs italic">Student has no previous offenses on record.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Switch between registering one student and a group incident.
function IncidentModeToggle({ mode, onChange }) {
  const options = [
    { key: 'single', icon: 'person', label: 'Single student', hint: 'One case for one student' },
    { key: 'group', icon: 'groups', label: 'Group incident', hint: 'Several students, one separate case each' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Incident type">
      {options.map((o) => {
        const active = mode === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
              active ? 'border-[#3d3793] bg-[#3d3793]/5 ring-2 ring-[#3d3793]/20' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <span className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${active ? 'bg-[#3d3793] text-white' : 'bg-slate-100 text-slate-500'}`}>
              <span className="material-symbols-outlined text-[20px]">{o.icon}</span>
            </span>
            <span>
              <span className={`block text-sm font-semibold ${active ? 'text-[#3d3793]' : 'text-slate-800'}`}>{o.label}</span>
              <span className="block text-xs text-slate-500">{o.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Group incident: add students one by one by enrollment number.
function StepGroupStudents({ students, input, onInputChange, onAdd, onRemove, lookup, error }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2.5 pb-3 border-b border-[#edf2f7]">
        <div className="w-8 h-8 rounded-xl bg-[#3d3793]/10 text-[#3d3793] flex items-center justify-center font-bold">
          <span className="material-symbols-outlined text-[18px]">groups</span>
        </div>
        <div>
          <h2 className="text-[#0f172a] font-bold text-base leading-tight">Students Involved</h2>
          <p className="text-[#94a3b8] text-xs">
            Add every student involved. Each student gets a separate case with the same incident details.
          </p>
        </div>
      </div>

      <Field label="Add student by enrollment number *">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAdd();
              }
            }}
            data-field="groupStudents"
            placeholder="e.g. 240123, then press Enter"
            className={`${inputCls} flex-1 ${error ? 'border-red-500' : ''}`}
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={lookup.loading || !input.trim()}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 rounded-xl bg-[#3d3793] hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${lookup.loading ? 'animate-spin' : ''}`}>
              {lookup.loading ? 'progress_activity' : 'person_add'}
            </span>
            Add
          </button>
        </div>
        {lookup.message ? (
          <p className={`text-xs font-medium ${lookup.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{lookup.message}</p>
        ) : null}
        {error ? <p className="text-xs text-red-600 font-medium">{error}</p> : null}
      </Field>

      <div className="rounded-2xl border border-[#edf2f7] overflow-hidden">
        <div className="flex items-center justify-between bg-[#f8fafc] px-4 py-2.5 border-b border-[#edf2f7]">
          <span className="text-xs font-bold text-[#0f172a]">Selected students</span>
          <span className="text-xs text-[#64748b]">
            {students.length} student{students.length === 1 ? '' : 's'} · {students.length} case{students.length === 1 ? '' : 's'} will be created
          </span>
        </div>
        {students.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-[#94a3b8]">No students added yet.</p>
        ) : (
          <ul className="divide-y divide-[#edf2f7]">
            {students.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-[#3d3793]/10 text-[#3d3793] flex items-center justify-center text-sm font-bold">
                  {String(s.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#0f172a] truncate">{s.name}</p>
                  <p className="text-xs text-[#64748b] truncate">
                    {s.enrollment_no}
                    {s.program ? ` · ${String(s.program).toUpperCase()}` : ''}
                    {s.hostel ? ` · ${s.hostel}${s.room ? ` ${s.room}` : ''}` : ''}
                  </p>
                </div>
                <span className="hidden sm:block text-[11px] text-[#64748b] text-right">
                  Prior cases <strong className="text-[#0f172a]">{s.priorCases}</strong>
                  <br />
                  DAC points <strong className="text-[#3d3793]">{s.total_points || 0}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(s.id)}
                  title={`Remove ${s.name}`}
                  aria-label={`Remove ${s.name}`}
                  className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StepIncidentDetails({
  form,
  set,
  offenceTypes = [],
  typeRules = [],
  catalogError = '',
  onOffenseTypeChange,
  errors,
  getInputClass,
  description,
  onDescriptionChange,
  listening,
  speechError,
  onToggleListening,
  voiceLang = 'en',
  onVoiceLangChange,
  translating = false,
  heardHindi = '',
  groupStudents = null, // group incident: the students added in step 1
  groupReadings = {},
  onGroupReadingChange,
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#3d3793] text-[22px]">report</span>
        <h2 className="text-[#0f172a] font-bold text-[18px] leading-7">Incident Details</h2>
      </div>
      <Field label="Offense Type *">
        <div className="relative">
          <select
            value={form.offenseType}
            onChange={onOffenseTypeChange}
            data-field="offenseType"
            className={`w-full appearance-none ${getInputClass('offenseType')} py-3 cursor-pointer`}
          >
            <option value="" disabled>Select offense category...</option>
            {offenceTypes.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] text-[20px] pointer-events-none">
            expand_more
          </span>
        </div>
        {errors.offenseType ? <p className="text-xs text-red-600">{errors.offenseType}</p> : null}
        {catalogError ? <p className="text-xs text-amber-700">{catalogError}</p> : null}
      </Field>

      {typeRules.length > 0 && (
        <Field label="Offence *">
          <div className="relative">
            <select
              value={form.policyRuleId}
              onChange={set('policyRuleId')}
              data-field="policyRuleId"
              className={`w-full appearance-none ${getInputClass('policyRuleId')} py-3 pr-10 cursor-pointer`}
            >
              <option value="" disabled>Select the offence...</option>
              {groupRulesByLevel(typeRules).map(([level, rules]) => (
                <optgroup key={level} label={level}>
                  {rules.map((rule) => (
                    <option key={rule.id} value={String(rule.id)}>{offenceLabel(rule)} ({rule.weight} pts)</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] text-[20px] pointer-events-none">
              expand_more
            </span>
          </div>
          <p className="text-xs text-[#64748b]">From Rules &amp; Policies. Points are final only after the DAC resolves the case.</p>
          {errors.policyRuleId ? <p className="text-xs text-red-600">{errors.policyRuleId}</p> : null}
        </Field>
      )}

      <Field label="Time of Incident *">
        <input
          type="time"
          value={form.incidentTime}
          onChange={set('incidentTime')}
          data-field="incidentTime"
          className={getInputClass('incidentTime')}
        />
        {errors.incidentTime ? <p className="text-xs text-red-600">{errors.incidentTime}</p> : null}
      </Field>

      <AnimatePresence mode="popLayout" initial={false}>
        {form.offenseType === 'Substance Abuse' && (
          <motion.div
            key="substance-abuse-fields"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5"
          >
            <Field label="Substance Type *">
              <select
                value={form.substanceType}
                onChange={set('substanceType')}
                data-field="substanceType"
                className={`w-full appearance-none ${getInputClass('substanceType')} py-3 cursor-pointer`}
              >
                <option value="">Select substance type...</option>
                {['Alcohol', 'Cigarette', 'Weed', 'Drugs (Other)', 'Other'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <p className="text-xs text-[#64748b]">Select the observed substance category.</p>
              {errors.substanceType ? <p className="text-xs text-red-600">{errors.substanceType}</p> : null}
            </Field>

            {form.substanceType === 'Other' && (
              <Field label="Custom Substance *">
                <input
                  type="text"
                  value={form.customSubstance}
                  onChange={set('customSubstance')}
                  data-field="customSubstance"
                  placeholder="Enter substance name"
                  className={getInputClass('customSubstance')}
                />
                {errors.customSubstance ? <p className="text-xs text-red-600">{errors.customSubstance}</p> : null}
              </Field>
            )}

            {form.substanceType === 'Alcohol' && (
              <>
                {groupStudents ? (
                  // Group incident: each student was breathalysed separately.
                  <div className="sm:col-span-2">
                    <Field label="Alcohol Reading per Student *">
                      <div className="rounded-xl border border-[#edf2f7] divide-y divide-[#edf2f7]">
                        {groupStudents.map((s) => {
                          const key = `groupReading_${s.id}`;
                          return (
                            <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3">
                              <div className="min-w-0 sm:w-1/2">
                                <p className="text-sm font-semibold text-[#0f172a] truncate">{s.name}</p>
                                <p className="text-xs text-[#64748b]">{s.enrollment_no}</p>
                              </div>
                              <div className="sm:w-1/2">
                                <input
                                  type="text"
                                  value={groupReadings[s.id] || ''}
                                  onChange={(e) => onGroupReadingChange(s.id, e.target.value)}
                                  data-field={key}
                                  placeholder="Breathalyzer reading"
                                  aria-label={`Alcohol reading for ${s.name}`}
                                  className={getInputClass(key)}
                                />
                                {errors[key] ? <p className="mt-1 text-xs text-red-600">{errors[key]}</p> : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Field>
                  </div>
                ) : (
                  <Field label="Alcohol Reading *">
                    <input
                      type="text"
                      value={form.alcoholReading}
                      onChange={set('alcoholReading')}
                      data-field="alcoholReading"
                      placeholder="Enter breathalyzer reading"
                      className={getInputClass('alcoholReading')}
                    />
                    {errors.alcoholReading ? <p className="text-xs text-red-600">{errors.alcoholReading}</p> : null}
                  </Field>
                )}

                <Field label="Location Found *">
                  <select
                    value={form.locationFound}
                    onChange={set('locationFound')}
                    data-field="locationFound"
                    className={`w-full appearance-none ${getInputClass('locationFound')} py-3 cursor-pointer`}
                  >
                    <option value="">Select location...</option>
                    {['Main Gate', 'Hostel Room', 'Hostel Corridor', 'Campus Ground', 'Other'].map((location) => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                  {errors.locationFound ? <p className="text-xs text-red-600">{errors.locationFound}</p> : null}
                </Field>

                {form.locationFound === 'Other' && (
                  <Field label="Custom Location *">
                    <input
                      type="text"
                      value={form.customLocation}
                      onChange={set('customLocation')}
                      data-field="customLocation"
                      placeholder="Enter exact location"
                      className={getInputClass('customLocation')}
                    />
                    {errors.customLocation ? <p className="text-xs text-red-600">{errors.customLocation}</p> : null}
                  </Field>
                )}
              </>
            )}
          </motion.div>
        )}

        {form.offenseType === HARASSMENT_TYPE && (
          <motion.div
            key="harassment-fields"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5"
          >
            <Field label="Victim Name *">
              <input
                type="text"
                value={form.victimName}
                onChange={set('victimName')}
                data-field="victimName"
                placeholder="Enter victim name"
                className={getInputClass('victimName')}
              />
              {errors.victimName ? <p className="text-xs text-red-600">{errors.victimName}</p> : null}
            </Field>
            <Field label="Type of Harassment / Violence *">
              <select
                value={form.harassmentType}
                onChange={set('harassmentType')}
                data-field="harassmentType"
                className={`w-full appearance-none ${getInputClass('harassmentType')} py-3 cursor-pointer`}
              >
                <option value="">Select type...</option>
                {['verbal', 'physical', 'online', 'other'].map((type) => (
                  <option key={type} value={type}>{toTitleCase(type)}</option>
                ))}
              </select>
              {errors.harassmentType ? <p className="text-xs text-red-600">{errors.harassmentType}</p> : null}
            </Field>
          </motion.div>
        )}

        {form.offenseType === PROPERTY_TYPE && (
          <motion.div
            key="vandalism-fields"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5"
          >
            <Field label="Property Damaged / Stolen *">
              <input
                type="text"
                value={form.propertyDamaged}
                onChange={set('propertyDamaged')}
                data-field="propertyDamaged"
                placeholder="Describe the damaged or stolen property"
                className={getInputClass('propertyDamaged')}
              />
              {errors.propertyDamaged ? <p className="text-xs text-red-600">{errors.propertyDamaged}</p> : null}
            </Field>
            <Field label="Estimated Damage / Loss Cost *">
              <input
                type="number"
                value={form.damageCost}
                onChange={set('damageCost')}
                data-field="damageCost"
                min="0"
                placeholder="Enter estimated amount"
                className={getInputClass('damageCost')}
              />
              {errors.damageCost ? <p className="text-xs text-red-600">{errors.damageCost}</p> : null}
            </Field>
          </motion.div>
        )}

        {form.offenseType === 'Other' && (
          <motion.div
            key="other-offense-fields"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="grid grid-cols-1 gap-y-5"
          >
            <Field label="Custom Offense Description *">
              <input
                type="text"
                value={form.customOffense}
                onChange={set('customOffense')}
                data-field="customOffense"
                placeholder="Enter custom offense"
                className={getInputClass('customOffense')}
              />
              {errors.customOffense ? <p className="text-xs text-red-600">{errors.customOffense}</p> : null}
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

      <Field label="Incident Description">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[#64748b]">Voice input language</span>
          <div className="inline-flex rounded-lg bg-[#f1f5f9] p-1" role="radiogroup" aria-label="Voice input language">
            {[
              { key: 'en', label: 'English' },
              { key: 'hi', label: 'Hindi → English' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={voiceLang === option.key}
                onClick={() => onVoiceLangChange(option.key)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  voiceLang === option.key ? 'bg-white text-[#3d3793] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <textarea
            value={description}
            onChange={onDescriptionChange}
            rows={5}
            placeholder="Describe the incident in detail, including time, location, and involved parties..."
            className={`${inputCls} resize-y w-full pr-14`}
          />
          <button
            type="button"
            onClick={onToggleListening}
            disabled={translating}
            aria-label={listening ? 'Stop listening' : 'Start voice input'}
            title={listening ? 'Click to stop' : 'Start voice input'}
            className={`absolute bottom-3 right-3 h-10 w-10 rounded-full border shadow-sm flex items-center justify-center transition-all ${
              listening
                ? 'bg-red-500 text-white border-red-500 animate-pulse'
                : 'bg-white text-[#64748b] border-[#cbd5e1] hover:text-[#3d3793] hover:border-[#3d3793] hover:bg-[#f8fafc]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">mic</span>
          </button>
          {listening ? (
            <span className="absolute bottom-14 right-2 rounded-md bg-[#0f172a] px-2 py-1 text-[11px] font-medium text-white shadow-sm">
              {voiceLang === 'hi' ? 'Recording Hindi… click mic to stop' : 'Listening...'}
            </span>
          ) : null}
        </div>
        {voiceLang === 'hi' && (translating || heardHindi) ? (
          <p className="text-xs text-[#64748b]">
            {translating ? 'Translating to English… ' : listening ? 'Hearing: ' : 'Heard: '}
            <span lang="hi" className="text-[#0f172a]">{heardHindi}</span>
          </p>
        ) : null}
        {speechError ? <p className="text-xs text-red-600">{speechError}</p> : null}
      </Field>
    </div>
  );
}

function StepEvidence({
  dragOver,
  setDragOver,
  onFileSelect,
  file,
  previewUrl,
  uploadError,
  uploadedUrl,
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#3d3793] text-[20px]">attach_file</span>
        <h2 className="text-[#0f172a] font-bold text-[18px] leading-7">Evidence Upload</h2>
      </div>
      <p className="text-[#64748b] text-sm leading-5">
        Attach any supporting materials - photos, videos, or signed witness statements.
      </p>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer?.files?.[0];
          if (dropped) onFileSelect(dropped);
        }}
        className={`h-44 flex flex-col items-center justify-center gap-2 bg-[#f8fafc] border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
          dragOver ? 'border-[#3d3793] bg-[#f0f4ff]' : 'border-[#cbd5e1]'
        }`}
      >
        <input
          type="file"
          accept="image/*,video/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) onFileSelect(selected);
          }}
        />
        <span className="material-symbols-outlined text-[#94a3b8] text-[36px]">upload_file</span>
        <p className="text-sm">
          <span className="font-semibold text-[#3d3793]">Click to upload</span>
          <span className="text-[#64748b]"> or drag and drop</span>
        </p>
        <p className="text-[#64748b] text-xs">PDF, JPG, PNG or MP4 (MAX. 2 MB)</p>
      </label>
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
      {file && (
        <div className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 flex items-center gap-3">
          {previewUrl ? (
            <img src={previewUrl} alt="Evidence preview" className="h-12 w-12 rounded-md object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-md bg-[#f1f5f9] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#94a3b8]">description</span>
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#0f172a]">{file.name}</p>
            <p className="text-xs text-[#64748b]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          {uploadedUrl && (
            <span className="text-xs font-semibold text-emerald-600">Uploaded</span>
          )}
        </div>
      )}
    </div>
  );
}

function StepReview({ form, groupStudents, groupReadings = {}, policyRule = null }) {
  const isGroup = Array.isArray(groupStudents);
  const showReadings = isGroup && form.offenseType === 'Substance Abuse' && form.substanceType === 'Alcohol';
  const rows = [
    ...(isGroup
      ? [{ label: 'Incident Type', value: `Group incident · ${groupStudents.length} students` }]
      : [
        { label: 'Student Name', value: form.studentName || '-' },
        { label: 'Enrollment Number', value: form.rollNumber || '-' },
        { label: 'Department', value: form.department || '-' },
        { label: 'Year', value: form.year || '-' },
        { label: 'Hostel', value: form.hostel || '-' },
        { label: 'Room Number', value: form.roomNo || '-' },
      ]),
    { label: 'Offense Type', value: form.offenseType || '-' },
    ...(policyRule ? [{ label: 'Offence', value: `${offenceLabel(policyRule)} (${policyRule.category || 'no level'}, ${policyRule.weight} pts)` }] : []),
    { label: 'Time of Incident', value: form.incidentTime || '-' },
  ];

  if (form.offenseType === 'Substance Abuse') {
    rows.push({
      label: 'Substance Type',
      value: form.substanceType === 'Other' ? (form.customSubstance || 'Other') : (form.substanceType || '-'),
    });

    if (form.substanceType === 'Alcohol') {
      if (!isGroup) rows.push({ label: 'Alcohol Reading', value: form.alcoholReading || '-' });
      rows.push({
        label: 'Location Found',
        value: form.locationFound === 'Other' ? (form.customLocation || 'Other') : (form.locationFound || '-'),
      });
    }
  }

  if (form.offenseType === HARASSMENT_TYPE) {
    rows.push({ label: 'Victim Name', value: form.victimName || '-' });
    rows.push({ label: 'Harassment / Violence Type', value: form.harassmentType ? toTitleCase(form.harassmentType) : '-' });
  }

  if (form.offenseType === PROPERTY_TYPE) {
    rows.push({ label: 'Property Damaged / Stolen', value: form.propertyDamaged || '-' });
    rows.push({ label: 'Estimated Damage / Loss Cost', value: form.damageCost ? `Rs. ${form.damageCost}` : '-' });
  }

  if (form.offenseType === 'Other') {
    rows.push({ label: 'Custom Offense', value: form.customOffense || '-' });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#3d3793] text-[20px]">fact_check</span>
        <h2 className="text-[#0f172a] font-bold text-[18px] leading-7">Review Submission</h2>
      </div>
      <p className="text-[#64748b] text-sm leading-5">
        {isGroup
          ? `Please verify all details before submitting. ${groupStudents.length} separate cases will be created, one per student.`
          : 'Please verify all details before submitting.'}
      </p>
      {isGroup && (
        <div className="rounded-lg border border-[#e2e8f0] overflow-hidden">
          <div className="bg-[#f8fafc] px-4 py-2.5 text-xs font-bold text-[#0f172a] border-b border-[#e2e8f0]">Students</div>
          {groupStudents.map((s, i) => (
            <div key={s.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}`}>
              <span className="text-[#0f172a] text-sm font-medium">{s.name}</span>
              <span className="text-[#64748b] text-xs text-right">
                {s.enrollment_no}{s.hostel ? ` · ${s.hostel}${s.room ? ` ${s.room}` : ''}` : ''}
                {showReadings ? (
                  <>
                    {' · '}Reading: <strong className="text-[#0f172a]">{groupReadings[s.id] || '-'}</strong>
                  </>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      )}
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
        {caseResult.groupCases ? (
          <div className="w-full max-w-md bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl overflow-hidden">
            <p className="px-4 py-2.5 text-center text-[#065f46] text-xs font-semibold uppercase tracking-widest border-b border-[#a7f3d0]">
              {caseResult.groupCases.length} Separate Cases Created
            </p>
            <ul className="divide-y divide-[#d1fae5] bg-white">
              {caseResult.groupCases.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-sm text-[#0f172a] font-medium truncate">
                    {c.studentName}
                    {c.enrollment ? <span className="text-xs text-[#64748b] font-normal"> · {c.enrollment}</span> : null}
                  </span>
                  <span className="text-[#047857] font-bold text-sm shrink-0" style={{ fontFamily: 'Liberation Mono, monospace' }}>
                    {c.ref}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl px-8 py-4 flex flex-col items-center gap-1">
            <span className="text-[#065f46] text-xs font-semibold uppercase tracking-widest">Case Token</span>
            <span className="text-[#047857] font-bold text-2xl" style={{ fontFamily: 'Liberation Mono, monospace' }}>
              {caseResult.token}
            </span>
          </div>
        )}
        {caseResult.evidenceWarning && (
          <p className="w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 text-center">
            {caseResult.evidenceWarning}
          </p>
        )}
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
          className="px-8 py-3 bg-[#3d3793] text-white text-base font-medium rounded-lg hover:bg-[#162d6b] transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#3d3793] text-[20px]">send</span>
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
        className="flex items-center justify-center gap-2 w-full px-8 py-4 bg-[#c02525] text-white text-base font-bold rounded-lg hover:bg-[#a81f1f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            Submitting...
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

export default function RegisterCase() {
  const navigate = useNavigate();
  const { role } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);

  const [form, setForm] = useState({
    studentName: '', rollNumber: '', department: '', year: '', hostel: '', roomNo: '',
    offenseType: '',
    policyRuleId: '',
    incidentTime: '',
    substanceType: '',
    customSubstance: '',
    alcoholReading: '',
    locationFound: '',
    customLocation: '',
    victimName: '',
    harassmentType: '',
    propertyDamaged: '',
    damageCost: '',
    customOffense: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  // Offence types and rules from Rules & Policies.
  const [offenceCatalog, setOffenceCatalog] = useState({ types: [], rules: [], error: '' });
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupStatusType, setLookupStatusType] = useState('');
  const [lookupStatusMessage, setLookupStatusMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [nameLocked, setNameLocked] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState('');
  const [evidenceError, setEvidenceError] = useState('');
  const [evidenceUploadedUrl, setEvidenceUploadedUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [caseResult, setCaseResult] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [studentHistory, setStudentHistory] = useState(null);
  // 'single' = one student; 'group' = several students, one separate case each.
  const [incidentMode, setIncidentMode] = useState('single');
  const [groupStudents, setGroupStudents] = useState([]);
  const [groupInput, setGroupInput] = useState('');
  const [groupLookup, setGroupLookup] = useState({ loading: false, type: '', message: '' });
  // Group incident with alcohol: one breathalyzer reading per student, keyed by student id.
  const [groupReadings, setGroupReadings] = useState({});

  const setGroupReading = (studentId, value) => {
    setGroupReadings((prev) => ({ ...prev, [studentId]: value }));
    setErrors((prev) => {
      const key = `groupReading_${studentId}`;
      return prev[key] ? { ...prev, [key]: '' } : prev;
    });
  };

  const addGroupStudent = async () => {
    const enrollment = groupInput.trim();
    if (!enrollment || groupLookup.loading) return;
    if (groupStudents.some((s) => String(s.enrollment_no) === enrollment)) {
      setGroupLookup({ loading: false, type: 'error', message: `${enrollment} is already in this group.` });
      return;
    }
    if (groupStudents.length >= 50) {
      setGroupLookup({ loading: false, type: 'error', message: 'A group incident can have at most 50 students.' });
      return;
    }
    setGroupLookup({ loading: true, type: '', message: '' });
    try {
      let history = null;
      try {
        history = await getStudentHistory(enrollment);
      } catch (lookupError) {
        if (!/not found/i.test(lookupError?.message || '')) throw lookupError;
      }
      const student = history?.student;
      if (!student) {
        setGroupLookup({ loading: false, type: 'error', message: `No student found with enrollment ${enrollment}.` });
        return;
      }
      setGroupStudents((prev) => [...prev, { ...student, priorCases: history.summary?.total || 0 }]);
      setGroupInput('');
      setErrors((prev) => ({ ...prev, groupStudents: '' }));
      setGroupLookup({ loading: false, type: 'success', message: `${student.name} added.` });
    } catch (err) {
      setGroupLookup({ loading: false, type: 'error', message: err?.message || 'Lookup failed.' });
    }
  };

  const removeGroupStudent = (id) => {
    setGroupStudents((prev) => prev.filter((s) => s.id !== id));
    setGroupReadings((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setGroupLookup({ loading: false, type: '', message: '' });
  };

  const changeIncidentMode = (mode) => {
    setIncidentMode(mode);
    setErrors({});
    setGroupLookup({ loading: false, type: '', message: '' });
  };
  const [description, setDescription] = useState('');
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  // Voice input language: 'en' = English, 'hi' = Hindi speech translated to English.
  const [voiceLang, setVoiceLang] = useState('en');
  const [translating, setTranslating] = useState(false);
  const [heardHindi, setHeardHindi] = useState('');
  const recognitionRef = useRef(null);
  // Hindi mode records until the user clicks the mic again, then translates everything once.
  const hindiFinalRef = useRef([]);
  const stopRequestedRef = useRef(false);

  // Leaving the page must not leave the microphone recording (Hindi mode auto-restarts).
  useEffect(() => () => {
    stopRequestedRef.current = true;
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onend = null;
      recognition.abort();
    }
  }, []);

  const handleEvidenceSelect = (file) => {
    setEvidenceError('');
    setEvidenceUploadedUrl('');

    if (!file) return;
    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isPdf && !isImage && !isVideo) {
      setEvidenceError('Unsupported file type. Use PDF, image, or video.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setEvidenceError('File exceeds the 2 MB limit.');
      return;
    }
    setEvidenceFile(file);
  };

  useEffect(() => {
    if (!evidenceFile || !evidenceFile.type?.startsWith('image/')) {
      setEvidencePreviewUrl('');
      return;
    }
    const previewUrl = URL.createObjectURL(evidenceFile);
    setEvidencePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [evidenceFile]);

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: '' };
    });
  };

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    setDescription(value);
    setForm((p) => ({ ...p, description: value }));
  };

  const appendToDescription = (text) => {
    setDescription((current) => {
      const nextDescription = current ? `${current} ${text}` : text;
      setForm((p) => ({ ...p, description: nextDescription }));
      return nextDescription;
    });
  };

  const translateRecordedHindi = () => {
    const hindiText = hindiFinalRef.current.join(' ').replace(/\s+/g, ' ').trim();
    hindiFinalRef.current = [];
    if (!hindiText) return;
    setHeardHindi(hindiText);
    setTranslating(true);
    translateHindiToEnglish(hindiText)
      .then((result) => {
        if (result?.translation) appendToDescription(result.translation);
      })
      .catch((translateError) => {
        setSpeechError(`Could not translate the Hindi speech: ${translateError?.message || 'translation failed'}`);
      })
      .finally(() => setTranslating(false));
  };

  const handleToggleListening = () => {
    setSpeechError('');

    if (listening && recognitionRef.current) {
      // Hindi: onend translates the whole recording once it has fully stopped.
      stopRequestedRef.current = true;
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    if (translating) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser.');
      return;
    }

    const isHindi = voiceLang === 'hi';
    stopRequestedRef.current = false;
    hindiFinalRef.current = [];
    if (isHindi) setHeardHindi('');

    const startRecognition = () => {
      const recognition = new SpeechRecognition();
      recognition.lang = isHindi ? 'hi-IN' : 'en-US';
      // Hindi keeps recording through pauses until the user clicks stop.
      recognition.continuous = isHindi;
      recognition.interimResults = isHindi;
      recognition.maxAlternatives = 1;
      let sessionFinal = [];

      recognition.onresult = (event) => {
        if (!isHindi) {
          const transcript = event.results?.[0]?.[0]?.transcript?.trim();
          if (transcript) appendToDescription(transcript);
          return;
        }
        // Collect final phrases; show interim words live so the user sees it is listening.
        const finals = [];
        let interim = '';
        for (let i = 0; i < event.results.length; i += 1) {
          const text = event.results[i]?.[0]?.transcript || '';
          if (event.results[i].isFinal) finals.push(text.trim());
          else interim += text;
        }
        sessionFinal = finals.filter(Boolean);
        setHeardHindi([...hindiFinalRef.current, ...sessionFinal, interim.trim()].filter(Boolean).join(' '));
      };

      recognition.onerror = (event) => {
        // Pauses in Hindi mode are normal; the session restarts in onend.
        if (isHindi && (event.error === 'no-speech' || event.error === 'aborted')) return;
        stopRequestedRef.current = true;
        setSpeechError(event.error ? `Speech recognition error: ${event.error}` : 'Speech recognition failed.');
        setListening(false);
      };

      recognition.onend = () => {
        if (isHindi) {
          hindiFinalRef.current = [...hindiFinalRef.current, ...sessionFinal];
          sessionFinal = [];
          if (!stopRequestedRef.current) {
            // The browser ended the session on its own (long silence): keep recording.
            try {
              startRecognition();
              return;
            } catch {
              // Fall through and finish with what was captured.
            }
          }
          recognitionRef.current = null;
          setListening(false);
          translateRecordedHindi();
          return;
        }
        setListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    };

    try {
      startRecognition();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setSpeechError('Speech recognition could not be started.');
    }
  };

  const getInputClass = (field) => (
    `${inputCls} ${errors[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`
  );

  const resetIncidentDependentFields = () => ({
    policyRuleId: '',
    substanceType: '',
    customSubstance: '',
    alcoholReading: '',
    locationFound: '',
    customLocation: '',
    victimName: '',
    harassmentType: '',
    propertyDamaged: '',
    damageCost: '',
    customOffense: '',
  });

  const lookupStudentByEnrollment = async (enrollmentInput) => {
    const enrollment = String(enrollmentInput || '').trim().toLowerCase();
    if (!enrollment) return;

    try {
      setLookupLoading(true);
      setLookupStatusType('');
      setLookupStatusMessage('');

      // One request for this student's record and history (instead of downloading every user).
      let history = null;
      try {
        history = await getStudentHistory(enrollment);
      } catch (lookupError) {
        if (!/not found/i.test(lookupError?.message || '')) throw lookupError;
      }
      const user = history?.student;
      if (!user) {
        setStudentId(null);
        setStudentHistory(null);
        setNameLocked(false);
        setLookupStatusType('error');
        setLookupStatusMessage('No student found.');
        return;
      }

      setStudentId(user.id);
      setStudentHistory(history);
      setNameLocked(true);

      setForm((prev) => ({
        ...prev,
        studentName: user.name || prev.studentName,
        department: user.program ? toTitleCase(user.program) : prev.department,
        year: user.year ? toYearLabel(user.year) : prev.year,
        hostel: user.hostel || prev.hostel,
        roomNo: user.room || prev.roomNo,
      }));
      setLookupStatusType('success');
      setLookupStatusMessage('Student record found.');
    } catch (err) {
      setLookupStatusType('error');
      setLookupStatusMessage(err?.message || 'No student found.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleEnrollmentChange = (e) => {
    setLookupStatusType('');
    setLookupStatusMessage('');
    setStudentId(null);
    setStudentHistory(null);
    setNameLocked(false);
    setForm((p) => ({ ...p, rollNumber: e.target.value }));
    setErrors((prev) => {
      if (!prev.rollNumber) return prev;
      return { ...prev, rollNumber: '' };
    });
  };

  const handleEnrollmentKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    lookupStudentByEnrollment(e.currentTarget.value);
  };

  const handleEnrollmentBlur = () => {
    lookupStudentByEnrollment(form.rollNumber);
  };

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([getOffenceTypes(), getRules()]).then(([typesResult, rulesResult]) => {
      if (!mounted) return;
      const allTypes = typesResult.status === 'fulfilled' ? typesResult.value : [];
      const rules = rulesResult.status === 'fulfilled' ? (rulesResult.value || []) : [];
      // List a type only when it has offences (plus "Other", typed by hand). If the rules could
      // not be loaded, list every type so a case can still be registered.
      const types = rulesResult.status === 'fulfilled'
        ? allTypes.filter((type) => type === 'Other' || rules.some((rule) => rule.offence_type === type))
        : allTypes;
      let error = '';
      if (typesResult.status !== 'fulfilled') error = 'Could not load the offence types. Reload the page to try again.';
      else if (rulesResult.status !== 'fulfilled') error = 'Could not load the offences from Rules & Policies; you can still register the case by type.';
      setOffenceCatalog({ types, rules, error });
    });
    return () => { mounted = false; };
  }, []);

  const typeRules = form.offenseType && form.offenseType !== 'Other'
    ? offenceCatalog.rules.filter((rule) => rule.offence_type === form.offenseType)
    : [];
  const policyRule = typeRules.find((rule) => String(rule.id) === String(form.policyRuleId)) || null;

  const handleOffenseTypeChange = (e) => {
    const selectedOffense = e.target.value;
    setForm((prev) => ({
      ...prev,
      offenseType: selectedOffense,
      ...resetIncidentDependentFields(),
    }));
    setErrors((prev) => ({
      ...prev,
      offenseType: '',
      policyRuleId: '',
      substanceType: '',
      customSubstance: '',
      alcoholReading: '',
      locationFound: '',
      customLocation: '',
      victimName: '',
      harassmentType: '',
      propertyDamaged: '',
      damageCost: '',
      customOffense: '',
    }));
  };

  const scrollToFirstError = (nextErrors) => {
    const firstField = Object.keys(nextErrors).find((key) => nextErrors[key]);
    if (!firstField) return;
    const node = document.querySelector(`[data-field="${firstField}"]`);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof node.focus === 'function') node.focus();
    }
  };

  const validateStep = (step) => {
    const nextErrors = {};

    if (step === 0) {
      if (incidentMode === 'group') {
        if (groupStudents.length < 2) {
          nextErrors.groupStudents = 'Add at least 2 students for a group incident.';
        }
      } else if (!String(form.rollNumber || '').trim()) {
        nextErrors.rollNumber = 'This field is required';
      }
    }

    if (step === 1) {
      if (!String(form.offenseType || '').trim()) {
        nextErrors.offenseType = 'This field is required';
      }
      if (typeRules.length && !policyRule) {
        nextErrors.policyRuleId = 'Select the offence';
      }
      if (!String(form.incidentTime || '').trim()) {
        nextErrors.incidentTime = 'This field is required';
      }
      if (form.offenseType === 'Substance Abuse') {
        if (!String(form.substanceType || '').trim()) {
          nextErrors.substanceType = 'This field is required';
        }
        if (form.substanceType === 'Other' && !String(form.customSubstance || '').trim()) {
          nextErrors.customSubstance = 'This field is required';
        }
        if (form.substanceType === 'Alcohol') {
          if (incidentMode === 'group') {
            // Every student in the group needs their own reading.
            groupStudents.forEach((s) => {
              if (!String(groupReadings[s.id] || '').trim()) {
                nextErrors[`groupReading_${s.id}`] = 'Enter this student\'s reading';
              }
            });
          } else if (!String(form.alcoholReading || '').trim()) {
            nextErrors.alcoholReading = 'This field is required';
          }
          if (!String(form.locationFound || '').trim()) {
            nextErrors.locationFound = 'This field is required';
          }
          if (form.locationFound === 'Other' && !String(form.customLocation || '').trim()) {
            nextErrors.customLocation = 'This field is required';
          }
        }
      }

      if (form.offenseType === HARASSMENT_TYPE) {
        if (!String(form.victimName || '').trim()) {
          nextErrors.victimName = 'This field is required';
        }
        if (!String(form.harassmentType || '').trim()) {
          nextErrors.harassmentType = 'This field is required';
        }
      }

      if (form.offenseType === PROPERTY_TYPE) {
        if (!String(form.propertyDamaged || '').trim()) {
          nextErrors.propertyDamaged = 'This field is required';
        }
        if (!String(form.damageCost || '').trim()) {
          nextErrors.damageCost = 'This field is required';
        }
      }

      if (form.offenseType === 'Other') {
        if (!String(form.customOffense || '').trim()) {
          nextErrors.customOffense = 'This field is required';
        }
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      scrollToFirstError(nextErrors);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const isGroup = incidentMode === 'group';
      if (isGroup ? groupStudents.length < 2 || !form.offenseType : !studentId || !form.offenseType) {
        throw new Error(isGroup
          ? 'Add at least 2 students and an offense type before submitting.'
          : 'Please provide enrollment number and offense type before submitting.');
      }

      const isSubstance = form.offenseType === 'Substance Abuse';
      const isAlcohol = isSubstance && form.substanceType === 'Alcohol';
      const substanceType = isSubstance
        ? (form.substanceType === 'Other' ? (form.customSubstance || 'Other') : form.substanceType) || null
        : null;
      const hostelLocation = `${form.hostel || ''}${form.roomNo ? ` Room ${form.roomNo}` : ''}`.trim() || null;
      const foundLocation = isAlcohol
        ? (form.locationFound === 'Other' ? form.customLocation : form.locationFound) || null
        : null;
      // alcohol_reading is a numeric column; keep a non-numeric reading in the notes instead.
      const alcoholReadingRaw = isAlcohol ? String(form.alcoholReading || '').trim() : '';
      const alcoholReadingNumber = alcoholReadingRaw !== '' && !Number.isNaN(Number(alcoholReadingRaw))
        ? Number(alcoholReadingRaw)
        : null;

      // Offense-specific details that have no dedicated column.
      const noteLines = [];
      if (alcoholReadingRaw && alcoholReadingNumber === null) noteLines.push(`Alcohol reading: ${alcoholReadingRaw}`);
      if (form.offenseType === HARASSMENT_TYPE) {
        noteLines.push(`Victim name: ${form.victimName}`);
        noteLines.push(`Harassment/violence type: ${toTitleCase(form.harassmentType)}`);
      }
      if (form.offenseType === PROPERTY_TYPE) {
        noteLines.push(`Property damaged/stolen: ${form.propertyDamaged}`);
        noteLines.push(`Estimated damage/loss cost: Rs. ${form.damageCost}`);
      }

      // The form records the time only; the incident is registered on the day it is reported.
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Incident details shared by every case registered from this form.
      const shared = {
        offense_type: form.offenseType === 'Other' ? (form.customOffense || 'Other') : form.offenseType,
        // Offence from Rules & Policies; the backend stores its text and level. The DAC sets the points.
        policy_rule_id: policyRule ? policyRule.id : null,
        description: form.description || null,
        incident_date: today,
        incident_time: form.incidentTime || null,
        substance_type: substanceType,
        alcohol_reading: alcoholReadingNumber,
        notes: noteLines.length ? noteLines.join('\n') : null,
        severity: 'low',
        evidence_url: null,
      };

      let createdCases;
      if (isGroup) {
        // One separate case per student; each keeps that student's own hostel and room.
        const result = await createGroupCases({
          ...shared,
          incident_location: foundLocation || null,
          students: groupStudents.map((s) => {
            const student = {
              student_id: s.id,
              location: `${s.hostel || ''}${s.room ? ` Room ${s.room}` : ''}`.trim() || null,
            };
            if (isAlcohol) {
              // Each student's own reading; a non-numeric one goes into that case's notes.
              const raw = String(groupReadings[s.id] || '').trim();
              const numeric = raw !== '' && !Number.isNaN(Number(raw)) ? Number(raw) : null;
              student.alcohol_reading = numeric;
              if (raw && numeric === null) {
                student.notes = [...noteLines, `Alcohol reading: ${raw}`].join('\n');
              }
            }
            return student;
          }),
        });
        createdCases = result.cases || [];
      } else {
        createdCases = [await createCase({
          ...shared,
          student_id: studentId,
          location: hostelLocation,
          incident_location: foundLocation || hostelLocation,
        })];
      }

      // The cases already exist at this point, so an evidence failure must not look like a
      // failed registration (that would invite a duplicate submission).
      let evidenceWarning = '';
      if (evidenceFile && !evidenceUploadedUrl && createdCases.length) {
        try {
          const uploadPayload = await uploadEvidence(evidenceFile, isGroup
            ? { caseIds: createdCases.map((c) => c.id) }
            : { caseId: createdCases[0].id });
          setEvidenceUploadedUrl(uploadPayload?.fileUrl || '');
        } catch (uploadError) {
          evidenceWarning = `The ${isGroup ? 'cases were' : 'case was'} registered, but the evidence file was not uploaded: ${uploadError?.message || 'upload failed'}`;
        }
      }

      const first = createdCases[0] || {};
      const nameById = Object.fromEntries(groupStudents.map((s) => [s.id, s]));
      setCaseResult({
        token: first.external_case_id || `#${first.id}`,
        offenseLevel: 1,
        severityScore: 25,
        fine: Number(first.penalty_points || 0) * 100,
        penaltyPoints: Number(first.penalty_points || 0),
        evidenceWarning,
        groupCases: isGroup
          ? createdCases.map((c) => ({
            id: c.id,
            ref: c.external_case_id || `#${c.id}`,
            studentName: nameById[c.student_id]?.name || 'Student',
            enrollment: nameById[c.student_id]?.enrollment_no || '',
          }))
          : null,
      });
    } catch (err) {
      setError(err?.message ?? 'Failed to submit case. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goPrev = () => setCurrentStep((s) => Math.max(0, s - 1));
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  const stepContent = [
    incidentMode === 'group' ? (
      <StepGroupStudents
        students={groupStudents}
        input={groupInput}
        onInputChange={(value) => {
          setGroupInput(value);
          if (groupLookup.message) setGroupLookup({ loading: false, type: '', message: '' });
        }}
        onAdd={addGroupStudent}
        onRemove={removeGroupStudent}
        lookup={groupLookup}
        error={errors.groupStudents}
      />
    ) : <StepStudentInfo
      form={form}
      set={set}
      onEnrollmentChange={handleEnrollmentChange}
      onEnrollmentBlur={handleEnrollmentBlur}
      onEnrollmentKeyDown={handleEnrollmentKeyDown}
      lookupLoading={lookupLoading}
      lookupStatusType={lookupStatusType}
      lookupStatusMessage={lookupStatusMessage}
      errors={errors}
      getInputClass={getInputClass}
      studentHistory={studentHistory}
    />,
      <StepIncidentDetails
        form={form}
        set={set}
        offenceTypes={offenceCatalog.types}
        typeRules={typeRules}
        catalogError={offenceCatalog.error}
        groupStudents={incidentMode === 'group' ? groupStudents : null}
        groupReadings={groupReadings}
        onGroupReadingChange={setGroupReading}
        onOffenseTypeChange={handleOffenseTypeChange}
        errors={errors}
        getInputClass={getInputClass}
        description={description}
        onDescriptionChange={handleDescriptionChange}
        listening={listening}
        speechError={speechError}
        onToggleListening={handleToggleListening}
        voiceLang={voiceLang}
        onVoiceLangChange={(lang) => {
          if (listening && recognitionRef.current) {
            // Switching language discards the current recording.
            stopRequestedRef.current = true;
            hindiFinalRef.current = [];
            const recognition = recognitionRef.current;
            recognition.onend = null;
            recognition.onresult = null;
            recognition.abort();
            recognitionRef.current = null;
            setListening(false);
          }
          setVoiceLang(lang);
          setSpeechError('');
          setHeardHindi('');
        }}
        translating={translating}
        heardHindi={heardHindi}
      />,
    <StepEvidence
      dragOver={dragOver}
      setDragOver={setDragOver}
      onFileSelect={handleEvidenceSelect}
      file={evidenceFile}
      previewUrl={evidencePreviewUrl}
      uploadError={evidenceError}
      uploadedUrl={evidenceUploadedUrl}
    />,
    <StepReview
      form={form}
      policyRule={policyRule}
      groupStudents={incidentMode === 'group' ? groupStudents : null}
      groupReadings={groupReadings}
    />,
    <StepSubmit
      caseResult={caseResult} loading={loading} error={error}
      onSubmit={handleSubmit}
      onNavigateDashboard={() => navigate(role === 'chief_warden' ? '/chief-warden/dashboard' : '/warden/dashboard')}
    />,
  ];

  return (
    <DACLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[#0f172a] text-2xl md:text-3xl font-semibold tracking-tight">
            Register New Disciplinary Case
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">
            Record a disciplinary incident, attach evidence, and submit it for committee review.
          </p>
          <div className="pt-2">
            <ProgressBar steps={STEPS} currentStep={currentStep} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 flex flex-col gap-6">
          {currentStep === 0 && !caseResult && (
            <IncidentModeToggle mode={incidentMode} onChange={changeIncidentMode} />
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {stepContent[currentStep]}
            </motion.div>
          </AnimatePresence>

          {!(isLast && caseResult) && (
            <div className="flex items-center justify-between pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={goPrev}
                disabled={isFirst}
                className="flex items-center gap-2 px-5 py-2.5 text-slate-500 text-xs font-bold hover:text-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Previous
              </button>

              {!isLast && (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex items-center gap-2 px-7 py-2.5 bg-[#3d3793] hover:bg-indigo-700 text-white text-xs font-bold rounded-full transition-all active:scale-95"
                >
                  <span>Next Step</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </DACLayout>
  );
}
