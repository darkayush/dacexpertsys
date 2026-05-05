/**
 * SystemConfig.jsx
 * Admin Settings → System Configuration
 * Provides a UI to seed the Firestore database with initial offenses and questions data.
 */

import { useState } from 'react';
import { seedRules } from '../../services/api';

const OFFENSE_LEVELS = [
  { level: 1, label: 'Level 1 – Minor',    fine: 1000,  points: 10,  color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200' },
  { level: 2, label: 'Level 2 – Moderate', fine: 2500,  points: 25,  color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  { level: 3, label: 'Level 3 – Serious',  fine: 5000,  points: 50,  color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  { level: 4, label: 'Level 4 – Critical', fine: 10000, points: 100, color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200' },
];

const DEFAULT_RULES = [
  { question: 'Plagiarism – First Offense', weight: 70, category: 'Academic' },
  { question: 'Plagiarism – Repeat Offense', weight: 90, category: 'Academic' },
  { question: 'Recidivism Multiplier', weight: 85, category: 'Behaviour' },
  { question: 'Vandalism / Property Damage', weight: 65, category: 'Conduct' },
  { question: 'Attendance Violation', weight: 30, category: 'Academic' },
  { question: 'Substance Abuse', weight: 75, category: 'Conduct' },
  { question: 'Exam Malpractice', weight: 80, category: 'Academic' },
  { question: 'Disruption / Misconduct', weight: 45, category: 'Behaviour' },
];

export default function SystemConfig() {
  const [seeding,  setSeeding]  = useState(false);
  const [seedLog,  setSeedLog]  = useState(null);   // { type: 'success'|'error', message: string }

  const handleSeed = async (force = false) => {
    setSeeding(true);
    setSeedLog(null);
    try {
      const result = await seedRules({ rules: DEFAULT_RULES, force });
      const msg = result?.seeded
        ? `Rules seeded ✓ (${result.count})`
        : 'Rules already exist – no changes made. Use "Force Re-seed" to overwrite.';
      setSeedLog({ type: 'success', message: msg });
    } catch (err) {
      setSeedLog({ type: 'error', message: err?.message ?? 'Seeding failed. Check console for details.' });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-[#0f172a]">System Configuration</h3>
        <p className="text-sm text-[#64748b] mt-0.5">
          Manage rule engine policies and seed initial data.
        </p>
      </div>

      {/* ── DAC Policy Table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4f46e5] text-[18px]">policy</span>
          <h4 className="font-semibold text-[#0f172a] text-sm">DAC Penalty Policy</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-[#e2e8f0]">
                {['Level', 'Description', 'Fine (Rs.)', 'Penalty Points'].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {OFFENSE_LEVELS.map(({ level, label, fine, points, color, bg, border }) => (
                <tr key={level} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color} ${bg} ${border}`}>
                      Level {level}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#0f172a]">{label}</td>
                  <td className="px-5 py-4 text-sm font-mono font-medium text-[#0f172a]">
                    {fine.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-sm text-[#0f172a]">{points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Severity Score Thresholds ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4f46e5] text-[18px]">bar_chart</span>
          <h4 className="font-semibold text-[#0f172a] text-sm">Severity Score Thresholds</h4>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { range: '0 – 29',  level: 1, label: 'Minor',    bg: 'bg-slate-50',   border: 'border-slate-200', text: 'text-slate-600' },
            { range: '30 – 54', level: 2, label: 'Moderate', bg: 'bg-yellow-50',  border: 'border-yellow-200', text: 'text-yellow-700' },
            { range: '55 – 79', level: 3, label: 'Serious',  bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700' },
            { range: '80+',     level: 4, label: 'Critical', bg: 'bg-red-50',     border: 'border-red-200',    text: 'text-red-700' },
          ].map(({ range, level, label, bg, border, text }) => (
            <div key={level} className={`rounded-lg border p-3 ${bg} ${border}`}>
              <p className={`text-xs font-bold ${text}`}>Level {level} – {label}</p>
              <p className="text-[#64748b] text-xs mt-0.5">Score: <span className="font-mono font-semibold">{range}</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Seed Rules ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4f46e5] text-[18px]">database</span>
          <h4 className="font-semibold text-[#0f172a] text-sm">Database Seeding</h4>
        </div>
        <p className="text-sm text-[#64748b]">
          Populates the <code className="bg-slate-100 rounded px-1 py-0.5 text-xs">rules</code> table with
          initial data. Safe to run multiple times — skips existing rules unless you force.
        </p>

        {/* Result banner */}
        {seedLog && (
          <div className={`flex items-start gap-3 rounded-lg px-4 py-3 border text-sm ${
            seedLog.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <span className="material-symbols-outlined text-[18px] mt-0.5">
              {seedLog.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <p>{seedLog.message}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => handleSeed(false)}
            disabled={seeding}
            className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#162d6b] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">
              {seeding ? 'progress_activity' : 'upload_file'}
            </span>
            {seeding ? 'Seeding…' : 'Seed Database'}
          </button>

          <button
            onClick={() => handleSeed(true)}
            disabled={seeding}
            className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            Force Re-seed
          </button>
        </div>
      </div>

    </div>
  );
}
