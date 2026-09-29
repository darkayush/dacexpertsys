const fileIcons = {
  pdf:  { icon: 'picture_as_pdf', color: 'text-red-500',   bg: 'bg-red-50'   },
  jpg:  { icon: 'image',          color: 'text-blue-500',  bg: 'bg-blue-50'  },
  jpeg: { icon: 'image',          color: 'text-blue-500',  bg: 'bg-blue-50'  },
  png:  { icon: 'image',          color: 'text-indigo-500',bg: 'bg-indigo-50'},
  mp4:  { icon: 'videocam',       color: 'text-purple-500',bg: 'bg-purple-50'},
  doc:  { icon: 'description',    color: 'text-sky-500',   bg: 'bg-sky-50'   },
  docx: { icon: 'description',    color: 'text-sky-500',   bg: 'bg-sky-50'   },
};

function getExt(filename = '') {
  return String(filename).split('.').pop().toLowerCase();
}

export default function EvidenceCard({ files = [] }) {
  return (
    <div className="bg-white rounded-2xl border border-[#edf2f7] shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-[#edf2f7] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">attach_file</span>
          </div>
          <div>
            <h3 className="font-bold text-[#0f172a] text-sm leading-tight">Evidence & Documentation</h3>
            <p className="text-[11px] text-[#94a3b8]">Attached multimedia & security records</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f1f5f9] text-[#475569]">
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </span>
      </div>

      <div className="p-6">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center border-2 border-dashed border-[#e2e8f0] rounded-2xl bg-[#fafbfe]">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-[#edf2f7] flex items-center justify-center text-[#94a3b8]">
              <span className="material-symbols-outlined text-[24px]">folder_open</span>
            </div>
            <div>
              <p className="text-[#0f172a] text-sm font-semibold">No evidence files attached</p>
              <p className="text-[#94a3b8] text-xs mt-0.5">Files uploaded during registration or review will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {files.map((file, i) => {
              const ext  = getExt(file.name);
              const meta = fileIcons[ext] ?? { icon: 'insert_drive_file', color: 'text-slate-500', bg: 'bg-slate-50' };
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-[#edf2f7] bg-[#f8fafc] hover:bg-white hover:border-[#5c56e9]/30 hover:shadow-sm transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined text-[22px] ${meta.color}`}>{meta.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#0f172a] text-xs font-bold truncate">{file.name}</p>
                    <p className="text-[#94a3b8] text-[11px] mt-0.5">{file.size || 'Attachment'} {file.uploadedAt ? `· ${file.uploadedAt}` : ''}</p>
                  </div>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-[#64748b] hover:text-[#5c56e9] hover:bg-[#eef2fb] rounded-lg"
                    title="Download Attachment"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
