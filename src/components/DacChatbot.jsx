import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { askChatbot } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SUGGESTIONS = [
  'What are the DAC points for weed?',
  'How many alcohol cases are there?',
  'What is the DAC workflow from Warden to Admin?',
  'Which hostel has the most alcohol cases?',
  'Show alcohol cases',
  'Show previous cases for 240123',
];

function casePath(role, id) {
  if (role === 'warden') return `/warden/view/${id}`;
  if (role === 'chief_warden') return `/chief-warden/view/${id}`;
  return `/view-case/${id}`;
}

function CaseCard({ item, role, navigate }) {
  const dateStr = item.incident_date
    ? new Date(item.incident_date).toISOString().split('T')[0]
    : 'N/A';

  return (
    <div className="mt-2.5 rounded-2xl border border-[#edf2f7] bg-[#f8fafc] p-3.5 shadow-2xs transition hover:border-[#5c56e9]/40 hover:bg-white hover:shadow-xs">
      <div className="flex items-center justify-between border-b border-[#edf2f7] pb-2 mb-2">
        <span className="font-mono font-bold text-[#5c56e9] text-xs">
          {item.case_id || `Case #${item.id}`}
        </span>
        <span className="rounded-full bg-white border border-[#edf2f7] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#475569]">
          {String(item.status || 'unknown').replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] leading-snug text-[#334155]">
        <p><span className="text-[#94a3b8] font-medium">Student:</span> <strong className="text-[#0f172a]">{item.student_name || 'N/A'}</strong></p>
        <p><span className="text-[#94a3b8] font-medium">Roll No:</span> <strong className="font-mono">{item.enrollment_no || 'N/A'}</strong></p>
        <p><span className="text-[#94a3b8] font-medium">Offense:</span> {item.offense_type || 'N/A'}</p>
        <p><span className="text-[#94a3b8] font-medium">Substance:</span> {item.substance_type || '—'}</p>
        <p><span className="text-[#94a3b8] font-medium">Points:</span> <strong className="text-red-600">{item.penalty_points ?? 0} pts</strong></p>
        <p><span className="text-[#94a3b8] font-medium">Fine:</span> ₹{item.fine ?? 0}</p>
        <p><span className="text-[#94a3b8] font-medium">Hostel:</span> {item.hostel || 'N/A'}</p>
        <p><span className="text-[#94a3b8] font-medium">Date:</span> {dateStr}</p>
      </div>

      <div className="mt-2.5 pt-2 border-t border-[#edf2f7] flex justify-end">
        <button
          type="button"
          onClick={() => navigate(casePath(role, item.id))}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#5c56e9] hover:text-[#4338ca] hover:underline"
        >
          View Case Record →
        </button>
      </div>
    </div>
  );
}

function SourceCitations({ sources, role, navigate }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-2.5 border-t border-[#edf2f7] text-[11px]">
      <p className="font-bold uppercase tracking-wider text-[#94a3b8] text-[10px] mb-1.5 flex items-center gap-1">
        <span className="material-symbols-outlined text-[13px]">menu_book</span>
        Sources & Precedents
      </p>
      <div className="flex flex-col gap-1.5">
        {sources.map((src, i) => (
          <div key={i} className="flex items-center justify-between text-[#475569] bg-[#f8fafc] px-2.5 py-1.5 rounded-lg border border-[#edf2f7]">
            <span className="truncate pr-2 text-xs">
              • {src.title || src.id} {src.section ? `(${src.section})` : ''}
            </span>
            {src.case_id && (
              <button
                type="button"
                onClick={() => navigate(casePath(role, src.case_id))}
                className="shrink-0 text-[10px] font-bold text-[#5c56e9] hover:underline"
              >
                View
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DacChatbot() {
  const { role, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState('suggestions'); // 'suggestions' | 'conversation'
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const endRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const textareaRef = useRef(null);

  const visible = isAuthenticated && ['warden', 'chief_warden', 'dsw', 'admin'].includes(role) && /dashboard/.test(location.pathname);

  // Initialize conversation ID when opened
  useEffect(() => {
    if (open && !conversationId) {
      setConversationId(`dac-session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    }
  }, [open, conversationId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (view === 'conversation') {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, loading, view]);

  if (!visible) return null;

  async function send(explicitQuestion = null) {
    const rawText = explicitQuestion !== null ? explicitQuestion : question;
    const text = String(rawText || '').trim();
    if (!text || loading) return;

    // Immediately transition to conversation view
    setView('conversation');
    setMessages((items) => [...items, { from: 'user', text }]);
    setQuestion('');
    setLoading(true);

    try {
      const response = await askChatbot(text, conversationId);
      setMessages((items) => [
        ...items,
        {
          from: 'bot',
          answer: response.answer,
          sources: response.sources || [],
          showCases: Boolean(response.showCases),
          cases: response.cases || [],
          suggestedQuestions: response.suggestedQuestions || [],
          intent: response.intent,
        },
      ]);
    } catch (error) {
      setMessages((items) => [
        ...items,
        {
          from: 'bot',
          answer: error.message || 'Unable to connect to DAC knowledge base right now.',
          sources: [],
          showCases: false,
          cases: [],
          suggestedQuestions: DEFAULT_SUGGESTIONS.slice(0, 3),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const isConversation = view === 'conversation';

  return (
    <div className="fixed bottom-6 right-6 z-[60] font-sans">
      {open && (
        <section
          aria-label="DAC Assistant Chat Panel"
          className="mb-3 flex h-[min(640px,calc(100dvh-5.5rem))] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[32px] border border-purple-100 bg-white shadow-[0_20px_60px_rgba(92,84,235,0.2)] transition-all"
        >
          {/* Header */}
          <header className="flex shrink-0 items-center justify-between bg-[#5c54eb] px-5 py-4 text-white shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              {isConversation && (
                <button
                  type="button"
                  onClick={() => setView('suggestions')}
                  className="rounded-xl p-1 transition hover:bg-white/20"
                  aria-label="Back to suggested questions"
                  title="Back to suggestions"
                >
                  <span className="material-symbols-outlined text-[20px] block">arrow_back</span>
                </button>
              )}
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                <span className="material-symbols-outlined text-[20px] text-white">auto_awesome</span>
              </div>
              <div>
                <p className="font-extrabold text-sm leading-tight text-white">DAC Assistant</p>
                <p className="text-[11px] text-purple-200 leading-tight">Knowledge Base &amp; Disciplinary RAG</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl p-1.5 transition hover:bg-white/20 text-white"
              aria-label="Close chat"
            >
              <span className="material-symbols-outlined text-[20px] block">close</span>
            </button>
          </header>

          {/* Independently Scrollable Message Area */}
          <div
            ref={messagesScrollRef}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-[#f8f9fe] p-4 text-sm"
          >
            {!isConversation ? (
              <div className="space-y-4 pt-1">
                <div className="rounded-[24px] border border-purple-100 bg-white p-5 shadow-xs text-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#5c54eb] text-[20px]">psychology</span>
                    <p className="font-extrabold text-xs text-[#1e1b4b]">Open-Ended Disciplinary Assistant</p>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ask natural questions about university policies, disciplinary penalties, hostel rules, repeat offenses, or live case stats.
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
                    Suggested Inquiries
                  </p>
                  <div className="flex flex-col gap-2">
                    {DEFAULT_SUGGESTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => send(item)}
                        className="rounded-2xl border border-purple-100/80 bg-white px-4 py-3 text-left text-xs font-bold text-[#5c54eb] shadow-xs transition hover:bg-purple-50/50 hover:border-purple-300"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {messages.length > 0 && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setView('conversation')}
                      className="text-xs font-bold text-[#5c54eb] hover:underline"
                    >
                      ← Return to active conversation ({messages.length} messages)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message, index) => {
                  const isUser = message.from === 'user';
                  return (
                    <div
                      key={index}
                      className={
                        isUser
                          ? 'ml-8 rounded-[22px] rounded-tr-xs bg-[#5c54eb] px-4 py-3 text-xs text-white shadow-xs'
                          : 'mr-4 rounded-[22px] rounded-tl-xs border border-purple-100/70 bg-white px-4 py-3.5 text-xs text-[#1e1b4b] shadow-xs'
                      }
                    >
                      <p className="whitespace-pre-line leading-relaxed">
                        {message.text || message.answer}
                      </p>

                      {/* Case Cards */}
                      {!isUser && message.showCases && message.cases && message.cases.length > 0 && (
                        <div className="mt-2.5 space-y-2">
                          {message.cases.map((c) => (
                            <CaseCard key={c.id} item={c} role={role} navigate={navigate} />
                          ))}
                        </div>
                      )}

                      {/* Source Citations */}
                      {!isUser && (
                        <SourceCitations sources={message.sources} role={role} navigate={navigate} />
                      )}

                      {/* Follow-up suggestion chips */}
                      {!isUser && index === messages.length - 1 && message.suggestedQuestions?.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            Follow-up suggestions:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {message.suggestedQuestions.map((sug) => (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => send(sug)}
                                className="rounded-full border border-purple-100 bg-purple-50/50 px-3 py-1 text-[11px] font-bold text-[#5c54eb] hover:bg-purple-100 transition-all"
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {loading && (
                  <div className="mr-16 flex items-center gap-2.5 rounded-[22px] rounded-tl-xs border border-purple-100 bg-white px-4 py-3 text-xs text-slate-500 shadow-xs">
                    <span className="inline-block h-2.5 w-2.5 animate-ping rounded-full bg-[#5c54eb]" />
                    Analyzing knowledge base &amp; generating response…
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>

          {/* Fixed Input Footer */}
          <form
            className="flex shrink-0 items-end gap-2 border-t border-slate-100 bg-white p-3.5"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Ask DAC policy, points, students, cases…"
              className="max-h-24 min-h-[42px] min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs leading-normal text-slate-800 outline-none transition focus:border-[#5c54eb] focus:bg-white focus:ring-4 focus:ring-purple-100"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-2xl bg-[#5c54eb] hover:bg-indigo-700 text-white shadow-md shadow-purple-500/25 transition-all disabled:opacity-40"
              aria-label="Send message"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </section>
      )}

      {/* Floating Action Toggle Button */}
      <button
        id="dac-chatbot-launcher"
        type="button"
        onClick={() => setOpen((val) => !val)}
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5c54eb] text-white shadow-xl shadow-purple-500/35 transition-all hover:scale-105 active:scale-95"
        aria-label="Toggle DAC AI assistant"
      >
        <span className="material-symbols-outlined text-[26px]">
          {open ? 'close' : 'auto_awesome'}
        </span>
      </button>
    </div>
  );
}
