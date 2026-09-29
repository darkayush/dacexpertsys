import { Link } from 'react-router-dom';
import DACLayout from '../../components/layout/DACLayout';
import { useAuth } from '../../context/AuthContext';

export default function WardenProfile() {
  const { currentUser, role } = useAuth();

  const name = currentUser?.displayName || currentUser?.name || 'Hostel Warden';
  const email = currentUser?.email || 'warden@bmu.edu.in';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const details = [
    { label: 'Role Designation', value: 'Hostel Incharge / Warden', icon: 'badge' },
    { label: 'Institutional Email', value: email, icon: 'mail' },
    { label: 'Assigned Hostel Block', value: currentUser?.hostel || 'Hostel Block BSH / GH', icon: 'apartment' },
    { label: 'Assigned Room / Office', value: currentUser?.room || 'Ground Floor Warden Office', icon: 'room' },
    { label: 'Associated Program', value: currentUser?.program || 'Student Housing & Discipline', icon: 'school' },
    { label: 'Authorization Tier', value: 'Level 1 & Level 2 Intake', icon: 'verified_user' },
  ];

  return (
    <DACLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#1e1b4b] tracking-tight">
              Officer Profile
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Personal information, assigned hostel block, and administrative permissions
            </p>
          </div>

          <Link
            to="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px] text-[#5c54eb]">settings</span>
            <span>Security Settings</span>
          </Link>
        </div>

        {/* Large Rounded Profile Card */}
        <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-8">
          {/* Hero Row */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#5c54eb] to-indigo-400 text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-purple-500/25 shrink-0">
              {initials}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center sm:justify-start">
                <h2 className="text-2xl font-black text-[#1e1b4b]">{name}</h2>
                <span className="px-3 py-1 rounded-full bg-purple-50 text-[#5c54eb] text-xs font-bold border border-purple-100 w-fit mx-auto sm:mx-0">
                  Warden
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {email}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                  Hostel Administration
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100">
                  Active Disciplinary Officer
                </span>
              </div>
            </div>
          </div>

          {/* Soft Cards Inside Profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {details.map((item) => (
              <div
                key={item.label}
                className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-start gap-3.5"
              >
                <div className="h-10 w-10 rounded-xl bg-white text-[#5c54eb] flex items-center justify-center shadow-xs shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                </div>
                <div className="overflow-hidden">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {item.label}
                  </span>
                  <p className="text-xs font-bold text-[#1e1b4b] mt-0.5 truncate">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DACLayout>
  );
}
