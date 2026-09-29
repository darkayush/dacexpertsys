export default function WorkflowCard({
  counts = {
    warden: 45,
    chief_warden: 120,
    dsw: 85,
    admin: 40,
    resolved: 3780,
  },
}) {
  const steps = [
    { label: 'Warden', count: counts.warden ?? 45, desc: 'Registration & Initial Report', icon: 'edit_note' },
    { label: 'Chief Warden', count: counts.chief_warden ?? 120, desc: 'Hostel Review & Sanction', icon: 'gavel' },
    { label: 'DSW', count: counts.dsw ?? 85, desc: 'Student Welfare & Appeals', icon: 'account_balance' },
    { label: 'Admin', count: counts.admin ?? 40, desc: 'Final Decision & Record', icon: 'verified' },
    { label: 'Resolved', count: counts.resolved ?? 3780, desc: 'Completed Cases', icon: 'task_alt' },
  ];

  return (
    <div className="bg-white rounded-[28px] p-6 border border-slate-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-extrabold text-[#1e1b4b]">DAC Escalation Flow</h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Institutional multi-tier disciplinary hierarchy
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
          Standard Policy
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
        {steps.map((step, idx) => (
          <div
            key={step.label}
            className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-purple-200 transition-all flex flex-col justify-between group relative"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="h-8 w-8 rounded-xl bg-white group-hover:bg-[#5c54eb] text-[#5c54eb] group-hover:text-white flex items-center justify-center shadow-xs transition-colors">
                  <span className="material-symbols-outlined text-[18px]">
                    {step.icon}
                  </span>
                </span>
                <span className="text-xs font-black text-[#1e1b4b]">
                  {step.count.toLocaleString()}
                </span>
              </div>
              <h5 className="text-xs font-extrabold text-[#1e1b4b] group-hover:text-[#5c54eb] transition-colors">
                {step.label}
              </h5>
              <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                {step.desc}
              </p>
            </div>

            {idx < steps.length - 1 && (
              <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                <span className="material-symbols-outlined text-slate-300 text-[18px]">
                  arrow_forward
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
