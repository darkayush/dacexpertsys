import { useState } from 'react';

export default function CalendarActivityCard({ events = [] }) {
  const [selectedDay, setSelectedDay] = useState(23);

  const days = [
    { day: 'Mon', num: 21 },
    { day: 'Tue', num: 22 },
    { day: 'Wed', num: 23, isToday: true },
    { day: 'Thu', num: 24 },
    { day: 'Fri', num: 25 },
    { day: 'Sat', num: 26 },
    { day: 'Sun', num: 27 },
  ];

  const defaultEvents = [
    {
      time: '04:30 - 05:00 PM',
      title: 'DAC Hearing: Case #00127',
      location: 'Chief Warden Office / Hall B',
      type: 'hearing',
      color: 'bg-indigo-50 text-[#5c54eb]',
      icon: 'gavel',
    },
    {
      time: '11:30 - 12:30 PM',
      title: 'DSW Review & Sanctions',
      location: 'Student Affairs Council',
      type: 'review',
      color: 'bg-purple-50 text-purple-700',
      icon: 'verified_user',
    },
  ];

  const displayEvents = events && events.length > 0 ? events : defaultEvents;

  return (
    <div className="bg-white rounded-[28px] p-6 border border-slate-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between h-full">
      <div>
        {/* Month Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-[#1e1b4b]">September 2026</h3>
          <div className="flex items-center gap-1">
            <button className="h-7 w-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <button className="h-7 w-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* 7-Day Calendar Strip */}
        <div className="grid grid-cols-7 gap-1 text-center mb-5 pb-3 border-b border-slate-100">
          {days.map((item) => {
            const isSelected = selectedDay === item.num;
            return (
              <button
                key={item.num}
                onClick={() => setSelectedDay(item.num)}
                className="flex flex-col items-center py-1.5 focus:outline-none transition-all"
              >
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  {item.day}
                </span>
                <span
                  className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#5c54eb] text-white shadow-md shadow-purple-500/25 scale-105'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.num}
                </span>
              </button>
            );
          })}
        </div>

        {/* Events Timeline */}
        <div className="space-y-3.5">
          {displayEvents.map((evt, idx) => (
            <div key={idx} className="group flex items-start gap-3">
              <div
                className={`h-9 w-9 rounded-2xl ${evt.color} flex items-center justify-center shrink-0 shadow-xs`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {evt.icon}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {evt.time}
                  </span>
                  <span className="material-symbols-outlined text-slate-300 text-[14px]">
                    more_horiz
                  </span>
                </div>
                <h5 className="text-xs font-bold text-[#1e1b4b] truncate group-hover:text-[#5c54eb] transition-colors">
                  {evt.title}
                </h5>
                <p className="text-[11px] text-slate-400 truncate font-medium">
                  {evt.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
