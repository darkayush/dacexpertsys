const stateStyles = {
  completed: {
    dot:  'bg-[#1f3a89] border-[#1f3a89]',
    icon: 'check',
    iconColor: 'text-white',
    line: 'bg-[#1f3a89]',
    title: 'text-[#0f172a]',
    badge: 'bg-[#eef2fb] text-[#1f3a89]',
  },
  active: {
    dot:  'bg-white border-[#1f3a89] border-2',
    icon: 'radio_button_checked',
    iconColor: 'text-[#1f3a89]',
    line: 'bg-[#e2e8f0]',
    title: 'text-[#1f3a89] font-semibold',
    badge: 'bg-amber-50 text-amber-700',
  },
  upcoming: {
    dot:  'bg-white border-[#e2e8f0]',
    icon: null,
    iconColor: '',
    line: 'bg-[#e2e8f0]',
    title: 'text-[#94a3b8]',
    badge: 'bg-slate-100 text-slate-500',
  },
};

export default function TimelineCard({ events }) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
        <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">timeline</span>
        <h3 className="font-semibold text-[#0f172a] text-sm">Case Timeline</h3>
      </div>

      <div className="p-6">
        <ol className="relative">
          {events.map((event, i) => {
            const style = stateStyles[event.state] ?? stateStyles.upcoming;
            const isLast = i === events.length - 1;

            return (
              <li key={i} className="flex gap-4">
                {/* Left: dot + connecting line */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${style.dot}`}>
                    {style.icon && (
                      <span className={`material-symbols-outlined text-[15px] ${style.iconColor}`}>
                        {style.icon}
                      </span>
                    )}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 flex-1 min-h-[24px] mt-1 mb-1 rounded-full ${style.line}`} />
                  )}
                </div>

                {/* Right: content */}
                <div className={`pb-6 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className={`text-sm leading-tight ${style.title}`}>{event.title}</p>
                  </div>
                  {event.date && (
                    <p className="text-[#94a3b8] text-xs">{event.date}</p>
                  )}
                  {event.note && (
                    <p className="text-[#64748b] text-xs mt-1 leading-5">{event.note}</p>
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
