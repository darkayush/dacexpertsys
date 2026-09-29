export default function PromoAssistantCard({ onLaunch }) {
  const handleLaunch = () => {
    if (onLaunch) {
      onLaunch();
    } else {
      // Find floating chatbot button and trigger click if available
      const btn = document.getElementById('dac-chatbot-launcher');
      if (btn) btn.click();
    }
  };

  return (
    <div className="bg-[#5c54eb] rounded-[28px] p-6 text-white flex flex-col justify-between shadow-[0_12px_36px_rgba(92,84,235,0.3)] relative overflow-hidden h-full">
      {/* Decorative background rings */}
      <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-indigo-900/20 blur-lg pointer-events-none" />

      {/* Whimsical AI / Policy illustration */}
      <div className="flex justify-center mb-4">
        <div className="h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20">
          <span className="material-symbols-outlined text-[36px] text-white">
            auto_awesome
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="text-center relative z-10">
        <h4 className="text-lg font-black tracking-tight leading-tight">
          DAC AI Assistant
        </h4>
        <p className="mt-2 text-xs text-white/80 font-medium leading-relaxed max-w-[220px] mx-auto">
          Ask open-ended queries about policy, penalty schedules, and student disciplinary records.
        </p>
      </div>

      {/* Launch Action Pill */}
      <div className="mt-5 flex justify-center relative z-10">
        <button
          onClick={handleLaunch}
          className="w-full py-2.5 px-5 rounded-full bg-[#1e1b4b] hover:bg-black text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
        >
          <span>Ask Assistant</span>
          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
