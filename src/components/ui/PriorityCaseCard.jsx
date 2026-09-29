import { Link } from 'react-router-dom';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';

export default function PriorityCaseCard({
  caseItem,
  onReview,
  viewAllTo = '/warden/cases',
}) {
  const item = caseItem || {
    token: 'DAC-2026-00127',
    studentName: 'Ayush Sharma',
    enrollment: '240123',
    offense: 'Substance Abuse',
    severity: 'High',
    status: 'Pending DSW',
    description: 'Review incident evidence and statements regarding campus perimeter incident.',
    officer: 'Warden Sharma',
  };

  return (
    <div className="bg-white rounded-[28px] p-6 border border-slate-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-extrabold text-[#1e1b4b]">Priority Review</h3>
          <span className="text-xs font-semibold text-slate-400">Action Required</span>
        </div>

        {/* Category Tags & Severity */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100/60">
            {item.offense || 'General Incident'}
          </span>
          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100/60">
            {item.token || '#DAC'}
          </span>
          <SeverityBadge severity={item.severity || 'High'} />
        </div>

        {/* Incident Title */}
        <h4 className="text-base font-extrabold text-[#1e1b4b] leading-snug line-clamp-2">
          {item.studentName ? `${item.studentName}: ` : ''}
          {item.description || 'Pending disciplinary assessment and recommendation.'}
        </h4>

        {/* Status and Officer Info */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
              {item.studentName ? item.studentName[0] : 'S'}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800 leading-none">
                {item.studentName || 'Student'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {item.enrollment || 'Campus Inmate'}
              </p>
            </div>
          </div>

          <StatusBadge status={item.status || 'Pending'} />
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-5">
        <Link
          to={item.id ? `/warden/cases/${item.id}` : viewAllTo}
          className="w-full py-2.5 rounded-2xl bg-[#5c54eb] hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">visibility</span>
          <span>Review Case Record</span>
        </Link>
      </div>
    </div>
  );
}
