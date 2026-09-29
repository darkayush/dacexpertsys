const stateStyles = {
  completed: {
    dot:  'bg-[#5c56e9] border-[#5c56e9] text-white',
    icon: 'check',
    line: 'bg-[#5c56e9]',
    title: 'text-[#0f172a] font-bold',
    badge: 'bg-[#eef2fb] text-[#5c56e9]',
  },
  active: {
    dot:  'bg-white border-[#5c56e9] border-2 text-[#5c56e9]',
    icon: 'radio_button_checked',
    line: 'bg-[#e2e8f0]',
    title: 'text-[#5c56e9] font-bold',
    badge: 'bg-amber-50 text-amber-700',
  },
  upcoming: {
    dot:  'bg-[#f8fafc] border-[#e2e8f0] text-[#cbd5e1]',
    icon: 'circle',
    line: 'bg-[#e2e8f0]',
    title: 'text-[#94a3b8] font-medium',
    badge: 'bg-slate-100 text-slate-400',
  },
};

export default function TimelineCard({ events = [] }) {
  return (
    <div className="bg-white rounded-2xl border border-[#edf2f7] shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-[#edf2f7] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">timeline</span>
          </div>
          <div>
            <h3 className="font-bold text-[#0f172a] text-sm leading-tight">Case Timeline</h3>
            <p className="text-[11px] text-[#94a3b8]">Lifecycle progression audit</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <ol className="relative space-y-1">
          {events.map((event, i) => {
            const style = stateStyles[event.state] ?? stateStyles.upcoming;
            const isLast = i === events.length - 1;

            return (
              <li key={i} className="flex gap-4 group">
                {/* Left: dot + connecting line */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-all ${style.dot}`}>
                    <span className="material-symbols-outlined text-[15px]">
                      {style.icon}
                    </span>
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 flex-1 min-h-[30px] my-1 rounded-full transition-all ${style.line}`} />
                  )}
                </div>

                {/* Right: content */}
                <div className={`pb-6 flex-1 min-w-0 ${isLast ? 'pb-1' : ''}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className={`text-xs ${style.title}`}>{event.title}</p>
                    {event.date && (
                      <span className="text-[10px] font-medium text-[#94a3b8]">{event.date}</span>
                    )}
                  </div>
                  {event.note && (
                    <p className="text-[#64748b] text-xs leading-relaxed mt-1 p-2 rounded-lg bg-[#f8fafc] border border-[#edf2f7]">
                      {event.note}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
