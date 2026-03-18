export default function StudentSummaryCards({ summary }) {
  const cards = [
    {
      label: 'Total Cases',
      value: summary.totalCases,
      bgIcon: 'folder_shared',
      bgIconColor: 'text-[#1f3a89]',
    },
    {
      label: 'Active Cases',
      value: summary.activeCases,
      bgIcon: 'pending_actions',
      bgIconColor: 'text-amber-500',
    },
    {
      label: 'Resolved Cases',
      value: summary.resolvedCases,
      bgIcon: 'check_circle',
      bgIconColor: 'text-emerald-500',
    },
    {
      label: 'Total Penalty Points',
      value: summary.totalPenaltyPoints,
      bgIcon: 'report',
      bgIconColor: 'text-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm transition-shadow relative overflow-hidden group"
        >
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-[#64748b] text-sm font-medium">{card.label}</span>
            <h3 className="text-3xl font-bold text-[#0f172a] tracking-tight">{card.value}</h3>
          </div>
          <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
            <span className={`material-symbols-outlined text-[100px] ${card.bgIconColor}`}>{card.bgIcon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
