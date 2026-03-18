const fileIcons = {
  pdf:  { icon: 'picture_as_pdf', color: 'text-red-500',   bg: 'bg-red-50'   },
  jpg:  { icon: 'image',          color: 'text-blue-500',  bg: 'bg-blue-50'  },
  jpeg: { icon: 'image',          color: 'text-blue-500',  bg: 'bg-blue-50'  },
  png:  { icon: 'image',          color: 'text-indigo-500',bg: 'bg-indigo-50'},
  mp4:  { icon: 'videocam',       color: 'text-purple-500',bg: 'bg-purple-50'},
  doc:  { icon: 'description',    color: 'text-sky-500',   bg: 'bg-sky-50'   },
  docx: { icon: 'description',    color: 'text-sky-500',   bg: 'bg-sky-50'   },
};

function getExt(filename) {
  return filename.split('.').pop().toLowerCase();
}

export default function EvidenceCard({ files }) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#1f3a89] text-[18px]">attach_file</span>
          <h3 className="font-semibold text-[#0f172a] text-sm">Evidence</h3>
        </div>
        <span className="text-xs text-[#64748b] font-medium">{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="p-6">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <span className="material-symbols-outlined text-[40px] text-[#cbd5e1]">upload_file</span>
            <p className="text-[#64748b] text-sm">No evidence uploaded yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {files.map((file, i) => {
              const ext  = getExt(file.name);
              const meta = fileIcons[ext] ?? { icon: 'insert_drive_file', color: 'text-slate-500', bg: 'bg-slate-50' };
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[#e2e8f0] hover:border-[#1f3a89]/30 hover:bg-slate-50/60 transition-colors group"
                >
                  <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined text-[20px] ${meta.color}`}>{meta.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#0f172a] text-sm font-medium truncate">{file.name}</p>
                    <p className="text-[#94a3b8] text-xs">{file.size} · {file.uploadedAt}</p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-[#64748b] hover:text-[#1f3a89] hover:bg-[#eef2fb] rounded-lg"
                    title="Download"
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
