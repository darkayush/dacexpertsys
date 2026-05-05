import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ChiefWardenSidebar from '../../components/ChiefWardenSidebar';
import { createCase, getUsers } from '../../services/api';

const offenseOptions = [
  'Plagiarism', 'Vandalism', 'Exam Malpractice', 'Attendance',
  'Disruption', 'Substance Abuse', 'Harassment', 'Other',
];

const STEPS = ['Student Info', 'Incident Details', 'Evidence', 'Review', 'Submit'];

function ProgressBar({ steps, currentStep }) {
  const percentage = steps.length <= 1 ? 100 : Math.round((currentStep / (steps.length - 1)) * 100);
  const currentLabel = steps[currentStep] ?? steps[steps.length - 1];

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[#5c56e9] truncate">{currentLabel}</span>
        <span className="text-[#64748b] font-medium whitespace-nowrap ml-2">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>
      <div className="relative h-5 rounded-full bg-[#e2e8f0] overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#5c56e9] to-[#3b5fc0] transition-all duration-500 ease-in-out flex items-center justify-end pr-2"
          style={{ width: `${Math.max(percentage, 4)}%` }}
        >
          {percentage >= 12 && (
            <span className="text-white text-xs font-bold leading-none">{percentage}%</span>
          )}
        </div>
        {percentage < 12 && (
          <span
            className="absolute top-1/2 -translate-y-1/2 text-xs font-bold text-[#5c56e9]"
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
                ? 'text-[#4f46e5]'
                : index === currentStep
                ? 'text-[#4f46e5] font-bold'
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

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[#334155] text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'bg-[#f8fafc] border border-[#cbd5e1] rounded-lg px-3 py-2.5 text-[#0f172a] text-base placeholder:text-[#94a3b8] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-colors';

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
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#4f46e5] text-[18px]">person</span>
        <h2 className="text-[#0f172a] font-bold text-[18px] leading-7">Student Information</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        <Field label="Enrollment Number *">
          <input
            type="text"
            value={form.rollNumber}
            onChange={onEnrollmentChange}
            onBlur={onEnrollmentBlur}
            onKeyDown={onEnrollmentKeyDown}
            data-field="rollNumber"
            placeholder=""
            className={getInputClass('rollNumber')}
          />
          {lookupLoading ? <p className="text-xs text-[#64748b]">Looking up student details...</p> : null}
          {errors.rollNumber ? <p className="text-xs text-red-600">{errors.rollNumber}</p> : null}
        </Field>
        <Field label="Student Name">
          <input
            type="text"
            value={form.studentName}
            placeholder=""
            readOnly
            className={`${inputCls} bg-[#f1f5f9]`}
          />
        </Field>
        <Field label="Department">
          <input
            type="text"
            value={form.department}
            onChange={set('department')}
            placeholder=""
            className={inputCls}
          />
        </Field>
        <Field label="Year">
          <input
            type="text"
            value={form.year}
            onChange={set('year')}
            placeholder=""
            className={inputCls}
          />
        </Field>
        <Field label="Hostel">
          <input
            type="text"
            value={form.hostel}
            onChange={set('hostel')}
            placeholder=""
            className={inputCls}
          />
        </Field>
        <Field label="Room Number">
          <input
            type="text"
            value={form.roomNo}
            onChange={set('roomNo')}
            placeholder=""
            className={inputCls}
          />
        </Field>
        {lookupStatusMessage ? (
          <div
            className={`sm:col-span-2 rounded-md px-3 py-2 text-xs font-medium ${
              lookupStatusType === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {lookupStatusMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepIncidentDetails({ form, set, onOffenseTypeChange, errors, getInputClass }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#4f46e5] text-[22px]">report</span>
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
            {offenseOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] text-[20px] pointer-events-none">
            expand_more
          </span>
        </div>
        {errors.offenseType ? <p className="text-xs text-red-600">{errors.offenseType}</p> : null}
      </Field>

      <Field label="Time of Incident *">
        <input
          type="time"
          value={form.incidentTime}
          onChange={set('incidentTime')}
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

        {form.offenseType === 'Harassment' && (
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
            <Field label="Type of Harassment *">
              <select
                value={form.harassmentType}
                onChange={set('harassmentType')}
                data-field="harassmentType"
                className={`w-full appearance-none ${getInputClass('harassmentType')} py-3 cursor-pointer`}
              >
                <option value="">Select harassment type...</option>
                {['verbal', 'physical', 'online', 'other'].map((type) => (
                  <option key={type} value={type}>{toTitleCase(type)}</option>
                ))}
              </select>
              {errors.harassmentType ? <p className="text-xs text-red-600">{errors.harassmentType}</p> : null}
            </Field>
          </motion.div>
        )}

        {form.offenseType === 'Vandalism' && (
          <motion.div
            key="vandalism-fields"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5"
          >
            <Field label="Property Damaged *">
              <input
                type="text"
                value={form.propertyDamaged}
                onChange={set('propertyDamaged')}
                data-field="propertyDamaged"
                placeholder="Describe damaged property"
                className={getInputClass('propertyDamaged')}
              />
              {errors.propertyDamaged ? <p className="text-xs text-red-600">{errors.propertyDamaged}</p> : null}
            </Field>
            <Field label="Estimated Damage Cost *">
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
        <span className="material-symbols-outlined text-[#4f46e5] text-[20px]">attach_file</span>
        <h2 className="text-[#0f172a] font-bold text-[18px] leading-7">Evidence Upload</h2>
      </div>
      <p className="text-[#64748b] text-sm leading-5">
        Attach any supporting materials - photos, videos, or signed witness statements.
      </p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
        className={`h-44 flex flex-col items-center justify-center gap-2 bg-[#f8fafc] border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
          dragOver ? 'border-[#4f46e5] bg-[#f0f4ff]' : 'border-[#cbd5e1]'
        }`}
      >
        <span className="material-symbols-outlined text-[#94a3b8] text-[36px]">upload_file</span>
        <p className="text-sm">
          <span className="font-semibold text-[#4f46e5]">Click to upload</span>
          <span className="text-[#64748b]"> or drag and drop</span>
        </p>
        <p className="text-[#64748b] text-xs">PDF, JPG, PNG or MP4 (MAX. 10MB)</p>
      </div>
    </div>
  );
}

function StepReview({ form }) {
  const rows = [
    { label: 'Student Name', value: form.studentName || '-' },
    { label: 'Enrollment Number', value: form.rollNumber || '-' },
    { label: 'Department', value: form.department || '-' },
    { label: 'Year', value: form.year || '-' },
    { label: 'Hostel', value: form.hostel || '-' },
    { label: 'Room Number', value: form.roomNo || '-' },
    { label: 'Offense Type', value: form.offenseType || '-' },
    { label: 'Time of Incident', value: form.incidentTime || '-' },
  ];

  if (form.offenseType === 'Substance Abuse') {
    rows.push({
      label: 'Substance Type',
      value: form.substanceType === 'Other' ? (form.customSubstance || 'Other') : (form.substanceType || '-'),
    });

    if (form.substanceType === 'Alcohol') {
      rows.push({ label: 'Alcohol Reading', value: form.alcoholReading || '-' });
      rows.push({
        label: 'Location Found',
        value: form.locationFound === 'Other' ? (form.customLocation || 'Other') : (form.locationFound || '-'),
      });
    }
  }

  if (form.offenseType === 'Harassment') {
    rows.push({ label: 'Victim Name', value: form.victimName || '-' });
    rows.push({ label: 'Harassment Type', value: form.harassmentType ? toTitleCase(form.harassmentType) : '-' });
  }

  if (form.offenseType === 'Vandalism') {
    rows.push({ label: 'Property Damaged', value: form.propertyDamaged || '-' });
    rows.push({ label: 'Estimated Damage Cost', value: form.damageCost ? `Rs. ${form.damageCost}` : '-' });
  }

  if (form.offenseType === 'Other') {
    rows.push({ label: 'Custom Offense', value: form.customOffense || '-' });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#4f46e5] text-[20px]">fact_check</span>
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
          className="px-8 py-3 bg-[#4f46e5] text-white text-base font-medium rounded-lg hover:bg-[#162d6b] transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#4f46e5] text-[20px]">send</span>
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
  const usersCacheRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(0);

  const [form, setForm] = useState({
    studentName: '', rollNumber: '', department: '', year: '', hostel: '', roomNo: '',
    offenseType: '',
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
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupStatusType, setLookupStatusType] = useState('');
  const [lookupStatusMessage, setLookupStatusMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [nameLocked, setNameLocked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [caseResult, setCaseResult] = useState(null);
  const [studentId, setStudentId] = useState(null);

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: '' };
    });
  };

  const getInputClass = (field) => (
    `${inputCls} ${errors[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`
  );

  const resetIncidentDependentFields = () => ({
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

      const users = usersCacheRef.current ?? await getUsers();
      if (!usersCacheRef.current) usersCacheRef.current = users;

      const user = users.find((entry) => String(entry.enrollment_no || '').trim().toLowerCase() === enrollment);
      if (!user) {
        setStudentId(null);
        setNameLocked(false);
        setLookupStatusType('error');
        setLookupStatusMessage('No student found.');
        return;
      }

      setStudentId(user.id);
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
      if (!String(form.rollNumber || '').trim()) {
        nextErrors.rollNumber = 'This field is required';
      }
    }

    if (step === 1) {
      if (!String(form.offenseType || '').trim()) {
        nextErrors.offenseType = 'This field is required';
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
          if (!String(form.alcoholReading || '').trim()) {
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

      if (form.offenseType === 'Harassment') {
        if (!String(form.victimName || '').trim()) {
          nextErrors.victimName = 'This field is required';
        }
        if (!String(form.harassmentType || '').trim()) {
          nextErrors.harassmentType = 'This field is required';
        }
      }

      if (form.offenseType === 'Vandalism') {
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
      if (!studentId || !form.offenseType) {
        throw new Error('Please provide enrollment number and offense type before submitting.');
      }

      const payload = await createCase({
        student_id: studentId,
        offense_type: form.offenseType === 'Other' ? (form.customOffense || 'Other') : form.offenseType,
        description: form.description || null,
        location: `${form.hostel || ''}${form.roomNo ? ` Room ${form.roomNo}` : ''}`.trim() || null,
        incident_date: null,
        severity: 'low',
        evidence_url: null,
      });

      setCaseResult({
        token: `#${payload.id}`,
        offenseLevel: 1,
        severityScore: 25,
        fine: Number(payload.penalty_points || 0) * 100,
        penaltyPoints: Number(payload.penalty_points || 0),
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
    <StepStudentInfo
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
    />,
    <StepIncidentDetails
      form={form}
      set={set}
      onOffenseTypeChange={handleOffenseTypeChange}
      errors={errors}
      getInputClass={getInputClass}
    />,
    <StepEvidence dragOver={dragOver} setDragOver={setDragOver} />,
    <StepReview form={form} />,
    <StepSubmit
      caseResult={caseResult} loading={loading} error={error}
      onSubmit={handleSubmit}
      onNavigateDashboard={() => navigate('/chief-warden/dashboard')}
    />,
  ];

  return (
    <div className="min-h-screen bg-[#f6f6f8] font-[Inter,sans-serif]">
      <ChiefWardenSidebar />
      <main className="pt-14 md:pt-0 md:pl-64 overflow-y-auto py-8 md:py-[60px] px-4 md:px-8">
        <div className="max-w-[1000px] mx-auto flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[#0f172a] text-[28px] md:text-[30px] font-black tracking-[-0.9px] leading-tight md:pt-10 pt-5">
              Register New Disciplinary Case
            </h1>
            <p className="text-[#64748b] text-base leading-7">
              Submit details below to initiate an automated disciplinary review.
            </p>
            <div className="pb-2">
              <ProgressBar steps={STEPS} currentStep={currentStep} />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
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
                        className="flex items-center gap-2 px-8 py-3 bg-[#5c56e9] text-white text-base font-medium rounded-lg shadow-[0_10px_15px_-3px_rgba(31,58,137,0.3)] hover:bg-[#4e49e4] transition-colors"
                      >
                        Next Step
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full lg:w-[280px] lg:flex-shrink-0 flex flex-col gap-4">
              <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0f172a] text-[16px]">info</span>
                  <h3 className="text-[#0f172a] font-bold text-sm leading-5">Filling Guidelines</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    'Ensure the Roll Number is exact to auto-fetch academic history.',
                    'Press Enter after enrollment number to auto-fill student details.',
                    'Select the most severe offense if multiple violations occurred.',
                    'Attach clear evidence or signed witness statements.',
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

              <div className="relative rounded-xl p-4 overflow-hidden border bg-[#ecfdf5] border-[#a7f3d0]">
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
                        { label: 'Fine', value: `Rs.${caseResult.fine?.toLocaleString()}` },
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
