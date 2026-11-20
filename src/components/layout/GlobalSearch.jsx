import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { globalSearch } from '../../services/api';
import { caseLink, statusLabel, studentProfilePath, toTitleCase } from '../cases/caseUi';
import { Avatar, Icon } from '../cases/parts';

// Application-wide search in the top bar (rendered by DACLayout on every signed-in page).
// - Results come from GET /api/search, scoped by the server to the user's role.
// - Opening, typing in and closing the search never changes the route; only choosing a
//   student or case navigates, straight to that record's existing page.
// - Choosing an offence lists that offence's cases inside the dropdown.
// - Pages that filter in place (CaseList) can pass value/onChange to also drive their list.

const MIN_LENGTH = 2; // matches SEARCH_MIN_LENGTH on the server
const DEBOUNCE_MS = 250;
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);
const SHORTCUT_LABEL = IS_MAC ? '⌘K' : 'Ctrl K';

function requestKey(term, offence) {
  return offence ? `offence:${offence}` : `q:${term}`;
}

export default function GlobalSearch({ role, value, onChange, placeholder }) {
  const navigate = useNavigate();
  const location = useLocation();
  const uid = useId();
  const listboxId = `${uid}-results`;
  const controlled = typeof onChange === 'function';

  const [localQuery, setLocalQuery] = useState('');
  const query = controlled ? value || '' : localQuery;
  const term = query.trim();
  const [open, setOpen] = useState(false);
  const [offence, setOffence] = useState(null); // offence being drilled into, or null
  const [highlight, setHighlight] = useState(0);
  const [retry, setRetry] = useState(0);
  // Last settled request: { key, status: 'done' | 'error', data, error }.
  const [result, setResult] = useState(null);

  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigatingRef = useRef(false);

  const isStaff = role !== 'student';
  const activeKey = requestKey(term, offence);
  const searchable = Boolean(offence) || term.length >= MIN_LENGTH;

  // Debounced, cancellable search. A newer query aborts the older request, and a result is
  // only shown while its key matches the current query, so stale responses never appear.
  useEffect(() => {
    if (!searchable) return undefined;
    const controller = new AbortController();
    const key = requestKey(term, offence);
    const timer = setTimeout(() => {
      globalSearch(offence ? { offence } : { q: term }, { signal: controller.signal })
        .then((data) => setResult({ key, status: 'done', data, error: '' }))
        .catch((error) => {
          if (error?.name === 'AbortError') return;
          // fetch() rejects with a TypeError when the server cannot be reached at all.
          const message = error instanceof TypeError
            ? 'Search is unavailable right now. Check your connection and try again.'
            : error?.message || 'Search failed.';
          setResult({ key, status: 'error', data: null, error: message });
        });
    }, offence ? 0 : DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, offence, searchable, retry]);

  // Ctrl/Cmd + K focuses the search from anywhere, except while a dialog is open.
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'k') return;
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
      setOpen(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Click outside closes the dropdown (the route and the typed text stay as they are).
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  // A navigation has finished: allow the next selection.
  useEffect(() => {
    navigatingRef.current = false;
  }, [location.key]);

  const settled = result && result.key === activeKey ? result : null;
  const loading = searchable && !settled;

  // Flat, keyboard-navigable list of { id, type, ... } grouped for display.
  const groups = useMemo(() => {
    if (!settled || settled.status !== 'done') return [];
    const data = settled.data || {};
    const out = [];
    if (!offence && data.students?.length) {
      out.push({
        key: 'students',
        label: 'Students',
        items: data.students.map((s) => ({
          id: `student-${s.id}`,
          type: 'student',
          to: studentProfilePath(s.enrollment_no),
          student: s,
        })),
      });
    }
    if (data.cases?.length) {
      out.push({
        key: 'cases',
        label: offence ? `Cases · ${toTitleCase(offence)}` : 'Cases',
        items: data.cases.map((c) => ({ id: `case-${c.id}`, type: 'case', to: caseLink(role, c.id), caseItem: c })),
      });
    }
    if (!offence && data.offences?.length) {
      out.push({
        key: 'offences',
        label: 'Offences',
        items: data.offences.map((o) => ({ id: `offence-${o.offense_type}`, type: 'offence', offence: o })),
      });
    }
    return out;
  }, [settled, offence, role]);

  const items = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const activeIndex = items.length ? Math.min(highlight, items.length - 1) : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
  const showPanel = open && (term.length > 0 || Boolean(offence));

  // Keep the highlighted option visible while moving with the arrow keys.
  useEffect(() => {
    if (!activeItem || !listRef.current) return;
    listRef.current.querySelector(`[data-option-id="${CSS.escape(activeItem.id)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeItem]);

  const setQuery = (next) => {
    if (controlled) onChange(next);
    else setLocalQuery(next);
    setHighlight(0);
  };

  const clear = () => {
    setQuery('');
    setOffence(null);
    inputRef.current?.focus();
  };

  const select = (item) => {
    if (!item) return;
    if (item.type === 'offence') {
      setOffence(item.offence.offense_type);
      setHighlight(0);
      inputRef.current?.focus();
      return;
    }
    if (navigatingRef.current) return; // ignore repeated clicks / Enter presses
    setOpen(false);
    setOffence(null);
    if (!controlled) setLocalQuery('');
    inputRef.current?.blur();
    if (location.pathname === item.to) return; // already on that record
    navigatingRef.current = true;
    navigate(item.to);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      if (items.length) setHighlight((activeIndex + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (items.length) setHighlight((activeIndex - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      if (showPanel && activeItem) {
        e.preventDefault();
        select(activeItem);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (offence) {
        setOffence(null);
        setHighlight(0);
      } else if (open) {
        setOpen(false);
      } else {
        inputRef.current?.blur();
      }
    } else if (e.key === 'Backspace' && offence && !query) {
      setOffence(null);
    }
  };

  const renderItem = (item) => {
    const index = items.indexOf(item);
    const active = index === activeIndex;
    const common = {
      id: `${uid}-${item.id}`,
      'data-option-id': item.id,
      role: 'option',
      'aria-selected': active,
      onMouseMove: () => !active && setHighlight(index),
      onMouseDown: (e) => e.preventDefault(), // keep focus in the input
      onClick: () => select(item),
      className: `w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${active ? 'bg-indigo-50' : 'hover:bg-slate-50'}`,
    };

    if (item.type === 'student') {
      const s = item.student;
      return (
        <li key={item.id} {...common}>
          <Avatar name={s.name} seed={Number(s.enrollment_no) || s.id} size="h-8 w-8" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-900 truncate">{s.name}</span>
            <span className="block text-xs text-slate-500 truncate">
              {[s.enrollment_no, s.email].filter(Boolean).join(' · ')}
            </span>
          </span>
          <span className="shrink-0 text-xs text-slate-500">
            {s.case_count} case{s.case_count === 1 ? '' : 's'}
          </span>
        </li>
      );
    }

    if (item.type === 'case') {
      const c = item.caseItem;
      return (
        <li key={item.id} {...common}>
          <span className="h-8 w-8 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
            <Icon name="folder_open" className="text-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-900 truncate">
              {c.case_ref}
              {c.offense_type ? <span className="font-normal text-slate-600"> · {toTitleCase(c.offense_type)}</span> : null}
            </span>
            {isStaff && (
              <span className="block text-xs text-slate-500 truncate">
                {[c.student_name, c.enrollment_no].filter(Boolean).join(' · ')}
              </span>
            )}
          </span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{statusLabel(c.status)}</span>
        </li>
      );
    }

    const o = item.offence;
    return (
      <li key={item.id} {...common}>
        <span className="h-8 w-8 shrink-0 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
          <Icon name="gavel" className="text-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-900 truncate">{toTitleCase(o.offense_type)}</span>
          <span className="block text-xs text-slate-500">
            {o.case_count} case{o.case_count === 1 ? '' : 's'}
          </span>
        </span>
        <span className="shrink-0 inline-flex items-center gap-0.5 text-xs font-medium text-[#3d3793]">
          View cases <Icon name="chevron_right" className="text-[16px]" />
        </span>
      </li>
    );
  };

  let body;
  if (!searchable) {
    body = <p className="px-4 py-3 text-sm text-slate-500">Type at least {MIN_LENGTH} characters to search.</p>;
  } else if (loading) {
    body = (
      <p className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500" role="status">
        <Icon name="progress_activity" className="animate-spin text-[18px] text-[#3d3793]" />
        Searching…
      </p>
    );
  } else if (settled.status === 'error') {
    body = (
      <div className="px-4 py-3" role="alert">
        <p className="text-sm text-rose-700">{settled.error}</p>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setResult(null); setRetry((n) => n + 1); }} className="mt-1 text-sm font-medium text-[#3d3793] hover:underline">
          Try again
        </button>
      </div>
    );
  } else if (!items.length) {
    body = (
      <div className="px-4 py-6 text-center">
        <Icon name="search_off" className="text-[28px] text-slate-300" />
        <p className="mt-1 text-sm text-slate-600">
          No results for <span className="font-medium text-slate-900">“{offence ? toTitleCase(offence) : term}”</span>
        </p>
        <p className="text-xs text-slate-400">
          {isStaff ? 'Try a case ID, student name, enrollment number, email or offence.' : 'Try a case ID or offence.'}
        </p>
      </div>
    );
  } else {
    body = (
      <ul ref={listRef} id={listboxId} role="listbox" aria-label="Search results" className="max-h-[min(420px,60dvh)] overflow-y-auto overscroll-contain p-1.5">
        {groups.map((group) => (
          <li key={group.key} role="presentation">
            <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400" aria-hidden="true">{group.label}</p>
            <ul role="group" aria-label={group.label}>
              {group.items.map(renderItem)}
            </ul>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={showPanel && items.length ? listboxId : undefined}
        aria-activedescendant={showPanel && activeItem ? `${uid}-${activeItem.id}` : undefined}
        aria-label="Search"
        aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}
        autoComplete="off"
        spellCheck={false}
        placeholder={offence ? `Cases for ${toTitleCase(offence)}` : placeholder}
        className="w-full pl-10 pr-20 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#3d3793] focus:ring-4 focus:ring-indigo-100 transition-all"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {(query || offence) ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-500">
            {SHORTCUT_LABEL}
          </kbd>
        )}
      </div>

      {showPanel && (
        <div className="fixed sm:absolute inset-x-3 sm:inset-x-0 top-[4.25rem] sm:top-full sm:mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-[0_16px_40px_rgba(15,23,42,0.12)] overflow-hidden">
          {offence && (
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setOffence(null); setHighlight(0); }}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#3d3793] hover:underline"
              >
                <Icon name="arrow_back" className="text-[16px]" /> All results
              </button>
              <span className="truncate text-xs text-slate-500">Offence: {toTitleCase(offence)}</span>
            </div>
          )}
          {body}
          <div className="hidden sm:flex items-center gap-4 border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[11px] text-slate-400">
            <span><kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> to navigate</span>
            <span><kbd className="font-sans">Enter</kbd> to open</span>
            <span><kbd className="font-sans">Esc</kbd> to close</span>
          </div>
        </div>
      )}
    </div>
  );
}
