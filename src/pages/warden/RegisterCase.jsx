import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DACLayout from '../../components/layout/DACLayout';
import StudentCard from '../../components/ui/StudentCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { createCase, getUsers, getStudentHistory, uploadEvidence } from '../../services/api';

const offenseOptions = [
  'Plagiarism', 'Vandalism', 'Exam Malpractice', 'Attendance',
  'Disruption', 'Substance Abuse', 'Harassment', 'Other',
];

const STEPS = ['Student Info', 'Incident Details', 'Evidence', 'Review', 'Submit'];

function ProgressBar({ steps, currentStep }) {
  return (
    <div className="w-full bg-white rounded-2xl border border-[#edf2f7] p-5 shadow-xs">
      <div className="flex items-center justify-between relative">
        {/* Background track line */}
        <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-0.5 bg-[#edf2f7] z-0" />
        {/* Active progress fill line */}
        <div
          className="absolute top-1/2 left-8 -translate-y-1/2 h-0.5 bg-gradient-to-r from-[#5c56e9] to-[#3b82f6] z-0 transition-all duration-500 ease-in-out"
          style={{ width: `${(currentStep / (steps.length - 1)) * 84}%` }}
        />

        {steps.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div key={step} className="flex flex-col items-center relative z-10">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isDone
                    ? 'bg-[#5c56e9] text-white shadow-sm'
                    : isCurrent
                    ? 'bg-gradient-to-br from-[#5c56e9] to-[#3b82f6] text-white shadow-md shadow-[#5c56e9]/25 ring-4 ring-[#5c56e9]/15'
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
                className={`mt-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isCurrent ? 'text-[#5c56e9]' : isDone ? 'text-[#0f172a]' : 'text-[#94a3b8]'
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
  'bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-[#0f172a] text-sm placeholder:text-[#94a3b8] focus:outline-none focus:border-[#5c56e9] focus:ring-2 focus:ring-[#5c56e9]/20 transition-all font-medium';

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
        <div className="w-8 h-8 rounded-xl bg-[#5c56e9]/10 text-[#5c56e9] flex items-center justify-center font-bold">
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
          previousPoints={studentHistory.total_points || 0}
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
                <div className="w-4 h-4 border-2 border-[#5c56e9] border-t-transparent rounded-full animate-spin" />
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
                Total Prior Cases: <strong className="text-[#0f172a]">{studentHistory.summary.total}</strong> · DAC Points: <strong className="text-[#5c56e9]">{studentHistory.student.total_points || 0}</strong>
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

function StepIncidentDetails({
  form,
  set,
  onOffenseTypeChange,
  errors,
  getInputClass,
  description,
  onDescriptionChange,
  listening,
  speechError,
  onToggleListening,
}) {
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
            aria-label={listening ? 'Stop listening' : 'Start voice input'}
            title={listening ? 'Listening...' : 'Start voice input'}
            className={`absolute bottom-3 right-3 h-10 w-10 rounded-full border shadow-sm flex items-center justify-center transition-all ${
              listening
                ? 'bg-red-500 text-white border-red-500 animate-pulse'
                : 'bg-white text-[#64748b] border-[#cbd5e1] hover:text-[#4f46e5] hover:border-[#4f46e5] hover:bg-[#f8fafc]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">mic</span>
          </button>
          {listening ? (
            <span className="absolute bottom-14 right-2 rounded-md bg-[#0f172a] px-2 py-1 text-[11px] font-medium text-white shadow-sm">
              Listening...
            </span>
          ) : null}
        </div>
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
        <span className="material-symbols-outlined text-[#4f46e5] text-[20px]">attach_file</span>
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
          dragOver ? 'border-[#4f46e5] bg-[#f0f4ff]' : 'border-[#cbd5e1]'
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
          <span className="font-semibold text-[#4f46e5]">Click to upload</span>
          <span className="text-[#64748b]"> or drag and drop</span>
        </p>
        <p className="text-[#64748b] text-xs">PDF, JPG, PNG or MP4 (MAX. 10MB)</p>
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
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState('');
  const [evidenceError, setEvidenceError] = useState('');
  const [evidenceUploadedUrl, setEvidenceUploadedUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [caseResult, setCaseResult] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [studentHistory, setStudentHistory] = useState(null);
  const [description, setDescription] = useState('');
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef(null);

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
    if (file.size > 10 * 1024 * 1024) {
      setEvidenceError('File exceeds 10MB limit.');
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

  const handleToggleListening = () => {
    setSpeechError('');

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;

      setDescription((current) => {
        const nextDescription = current ? `${current} ${transcript}` : transcript;
        setForm((p) => ({ ...p, description: nextDescription }));
        return nextDescription;
      });
    };

    recognition.onerror = (event) => {
      setSpeechError(event.error ? `Speech recognition error: ${event.error}` : 'Speech recognition failed.');
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
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
      setStudentHistory(await getStudentHistory(enrollment));
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

      let evidenceUrl = evidenceUploadedUrl;
      if (evidenceFile && !evidenceUrl) {
        const uploadPayload = await uploadEvidence(evidenceFile, { caseId: payload.id });
        evidenceUrl = uploadPayload?.fileUrl || '';
        setEvidenceUploadedUrl(evidenceUrl);
      }

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
      studentHistory={studentHistory}
    />,
      <StepIncidentDetails
        form={form}
        set={set}
        onOffenseTypeChange={handleOffenseTypeChange}
        errors={errors}
        getInputClass={getInputClass}
        description={description}
        onDescriptionChange={handleDescriptionChange}
        listening={listening}
        speechError={speechError}
        onToggleListening={handleToggleListening}
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
    <StepReview form={form} />,
    <StepSubmit
      caseResult={caseResult} loading={loading} error={error}
      onSubmit={handleSubmit}
      onNavigateDashboard={() => navigate('/warden/cases')}
    />,
  ];

  return (
    <DACLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[#1e1b4b] text-2xl md:text-3xl font-black tracking-tight">
            Register New Disciplinary Case
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">
            Record a disciplinary incident, attach evidence, and submit it for committee review.
          </p>
          <div className="pt-2">
            <ProgressBar steps={STEPS} currentStep={currentStep} />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <div className="bg-white rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 md:p-8 flex flex-col gap-6">
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
                      className="flex items-center gap-2 px-7 py-2.5 bg-[#5c54eb] hover:bg-indigo-700 text-white text-xs font-bold rounded-full shadow-md shadow-purple-500/20 transition-all active:scale-95"
                    >
                      <span>Next Step</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-[320px] lg:flex-shrink-0 flex flex-col gap-4">
            <div className="bg-white border border-slate-100 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#5c54eb] text-[18px]">info</span>
                <h3 className="text-[#1e1b4b] font-bold text-sm leading-5">Registration Guide</h3>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  'Type student Roll Number and press Enter to auto-retrieve profile.',
                  'Review prior violation records to assess appropriate severity.',
                  'Attach witness statements, incident logs, or media files.',
                  'Summary will generate a verifiable tracking token upon submission.',
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-purple-50 text-[#5c54eb] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[11px] font-bold">{i + 1}</span>
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-[28px] p-5 overflow-hidden border bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-white border-purple-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="relative flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#5c54eb] text-[18px]">
                    {caseResult ? 'check_circle' : 'verified'}
                  </span>
                  <span className="text-[#5c54eb] font-bold text-xs uppercase tracking-wider">
                    {caseResult ? 'Case Registered' : 'Token Generator'}
                  </span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {caseResult
                    ? 'Case successfully logged in DAC database.'
                    : 'An immutable token ID will be issued upon form submission.'}
                </p>
                <div className="flex items-center justify-between bg-white border border-purple-100 rounded-2xl px-3.5 py-2.5 shadow-2xs">
                  <span className="text-[#5c54eb] font-mono font-bold text-sm">
                    {caseResult ? caseResult.token : 'DAC-2026-XXXX'}
                  </span>
                  {caseResult && (
                    <button
                      type="button"
                      title="Copy token"
                      onClick={() => navigator.clipboard.writeText(caseResult.token)}
                      className="text-[#5c54eb] hover:text-indigo-800"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  )}
                </div>
                {caseResult && (
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      { label: 'Offense Level', value: `Lvl ${caseResult.offenseLevel}` },
                      { label: 'Sanction Fine', value: `₹${caseResult.fine?.toLocaleString()}` },
                      { label: 'DAC Points', value: `+${caseResult.penaltyPoints}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white border border-purple-100 rounded-xl p-2 text-center shadow-2xs">
                        <p className="text-[#5c54eb] font-bold text-xs">{value}</p>
                        <p className="text-slate-400 text-[9px] font-bold">{label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DACLayout>
  );
}
