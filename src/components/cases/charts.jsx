import { useId, useState } from 'react';
import { niceStep } from './trend';

// Dashboard charts (plain SVG, no chart library). Both show a hover card with the details
// under the pointer. Animations are CSS transitions, so they also run when the OS asks for
// reduced motion (they are small fades/slides, not flashing).

const plural = (n, word) => `${n.toLocaleString('en-IN')} ${word}${n === 1 ? '' : 's'}`;

export function TrendChart({ points }) {
  const W = 800;
  const H = 220;
  const pad = { top: 12, right: 12, bottom: 28, left: 36 };
  const step = niceStep(Math.max(...points.map((p) => p.value), 0));
  const max = step * 4;
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const x = (i) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - (v / max) * innerH;
  const coords = points.map((p, i) => [x(i), y(p.value)]);
  const gradientId = `trend-fill-${useId().replace(/:/g, '')}`;
  const [active, setActive] = useState(null); // index of the hovered / focused point

  // Smooth line through the points (Catmull-Rom converted to cubic Béziers).
  let d = coords.length ? `M${coords[0][0]},${coords[0][1]}` : '';
  for (let i = 0; i < coords.length - 1; i += 1) {
    const [x0, y0] = coords[i - 1] || coords[i];
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    const [x3, y3] = coords[i + 2] || coords[i + 1];
    const c1 = [x1 + (x2 - x0) / 6, Math.min(pad.top + innerH, y1 + (y2 - y0) / 6)];
    const c2 = [x2 - (x3 - x1) / 6, Math.min(pad.top + innerH, y2 - (y3 - y1) / 6)];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${x2},${y2}`;
  }

  const ticks = [0, 1, 2, 3, 4].map((n) => n * step);
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  // Label every Nth point, plus the last one unless it would crowd the previous label.
  const showLabel = (i) =>
    i % labelEvery === 0 || (i === points.length - 1 && i % labelEvery >= labelEvery / 2);
  const last = coords[coords.length - 1];

  // Nearest point to the pointer, from its position in viewBox units.
  const pointAt = (e) => {
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect() || e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    if (points.length < 2) return points.length ? 0 : null;
    return Math.min(points.length - 1, Math.max(0, Math.round(((vx - pad.left) / innerW) * (points.length - 1))));
  };

  const onKeyDown = (e) => {
    if (!points.length) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const from = active ?? points.length - 1;
      setActive(Math.min(points.length - 1, Math.max(0, from + (e.key === 'ArrowRight' ? 1 : -1))));
    } else if (e.key === 'Escape') {
      setActive(null);
    }
  };

  const point = active !== null ? points[active] : null;
  const prev = active > 0 ? points[active - 1] : null;
  const delta = point && prev ? point.value - prev.value : null;
  const [ax, ay] = active !== null ? coords[active] : [0, 0];
  const leftPct = (ax / W) * 100;
  const topPct = (ay / H) * 100;
  // Keep the card inside the chart: open to the left near the right edge, below near the top.
  const flipX = leftPct > 62;
  const below = topPct < 38;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 rounded-lg"
        role="img"
        aria-label="Cases over time. Use the left and right arrow keys to read each period."
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((a) => (a === null && points.length ? points.length - 1 : a))}
        onBlur={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="#eef0f4" />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400" fontSize="10">
              {t}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          showLabel(i) ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className={i === active ? 'fill-[#3d3793] font-semibold' : 'fill-slate-400'} fontSize="10">
              {p.label}
            </text>
          ) : null
        )}
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4b44b5" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#4b44b5" stopOpacity="0" />
          </linearGradient>
        </defs>
        {coords.length > 1 && (
          <path
            d={`${d} L${coords[coords.length - 1][0]},${pad.top + innerH} L${coords[0][0]},${pad.top + innerH} Z`}
            fill={`url(#${gradientId})`}
          />
        )}
        <path d={d} fill="none" stroke="#4b44b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover guide and highlighted point */}
        <g style={{ opacity: active !== null ? 1 : 0, transition: 'opacity 150ms ease' }} pointerEvents="none">
          <line
            x1={ax}
            x2={ax}
            y1={pad.top}
            y2={pad.top + innerH}
            stroke="#3d3793"
            strokeOpacity="0.35"
            strokeDasharray="4 4"
            style={{ transition: 'all 120ms ease-out' }}
          />
          <circle cx={ax} cy={ay} r="11" fill="#4b44b5" fillOpacity="0.15" style={{ transition: 'all 120ms ease-out' }} />
          <circle cx={ax} cy={ay} r="6" fill="#4b44b5" stroke="#fff" strokeWidth="2.5" style={{ transition: 'all 120ms ease-out' }} />
        </g>
        {last && active === null && <circle cx={last[0]} cy={last[1]} r="4" fill="#4b44b5" stroke="#fff" strokeWidth="2" />}

        {/* Pointer capture over the plot area (mouse, pen and touch). */}
        <rect
          x={pad.left - 12}
          y={pad.top}
          width={innerW + 24}
          height={innerH}
          fill="transparent"
          onPointerMove={(e) => setActive(pointAt(e))}
          onPointerDown={(e) => setActive(pointAt(e))}
          onPointerLeave={() => setActive(null)}
        />
      </svg>

      {/* Hover card */}
      <div
        className="pointer-events-none absolute z-10 min-w-[150px] rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-[0_12px_28px_rgba(15,23,42,0.14)] backdrop-blur-sm"
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          opacity: point ? 1 : 0,
          transform: `translate(${flipX ? 'calc(-100% - 14px)' : '14px'}, ${below ? '10px' : 'calc(-100% - 10px)'}) scale(${point ? 1 : 0.96})`,
          transformOrigin: `${flipX ? 'right' : 'left'} ${below ? 'top' : 'bottom'}`,
          transition: 'left 120ms ease-out, top 120ms ease-out, opacity 150ms ease, transform 150ms ease',
        }}
        aria-live="polite"
      >
        {point && (
          <>
            <p className="text-[11px] font-medium text-slate-500 whitespace-nowrap">{point.detail || point.label}</p>
            <p className="mt-0.5 text-base font-semibold text-slate-900 whitespace-nowrap">{plural(point.value, 'case')}</p>
            {delta !== null && (
              <p className={`mt-0.5 text-[11px] font-medium whitespace-nowrap ${delta > 0 ? 'text-rose-600' : delta < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {delta === 0 ? 'No change vs previous' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} vs previous`}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Ring chart: each slice is a share of the total (slices must not overlap).
// activeKey / onActiveChange (optional) let a legend highlight slices; otherwise the chart
// keeps its own hover state.
export function Donut({ slices, total, activeKey, onActiveChange }) {
  const r = 70;
  const stroke = 22;
  const circumference = 2 * Math.PI * r;
  const [ownActive, setOwnActive] = useState(null);
  const controlled = onActiveChange !== undefined;
  const active = controlled ? activeKey ?? null : ownActive;
  const setActive = (key) => (controlled ? onActiveChange(key) : setOwnActive(key));

  // Angular extent of every non-empty slice, clockwise from 12 o'clock (in turns, 0..1).
  let cursor = 0;
  const arcs = total > 0
    ? slices.filter((s) => s.value > 0).map((s) => {
      const share = s.value / total;
      const arc = { ...s, start: cursor, end: cursor + share, share };
      cursor += share;
      return arc;
    })
    : [];
  const activeArc = arcs.find((a) => a.key === active) || null;

  // Slice under the pointer, from its angle and distance from the centre (dashed strokes
  // cannot be hit-tested reliably, so the ring is located geometrically).
  const sliceAt = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * 180 - 90;
    const vy = ((e.clientY - rect.top) / rect.height) * 180 - 90;
    const dist = Math.hypot(vx, vy);
    if (dist < r - stroke / 2 - 4 || dist > r + stroke / 2 + 6) return null;
    const turn = ((Math.atan2(vy, vx) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
    return arcs.find((a) => turn >= a.start && turn < a.end)?.key ?? null;
  };

  // Hover card anchored at the middle of the active slice, just outside the ring.
  const mid = activeArc ? ((activeArc.start + activeArc.end) / 2) * 2 * Math.PI - Math.PI / 2 : 0;
  const anchorX = 90 + Math.cos(mid) * (r + stroke / 2);
  const anchorY = 90 + Math.sin(mid) * (r + stroke / 2);
  const pct = (share) => `${Math.round(share * 1000) / 10}%`;

  return (
    <div className="relative w-44 h-44 shrink-0">
      <svg
        viewBox="0 0 180 180"
        className="w-44 h-44"
        role="img"
        aria-label="Case distribution"
        onPointerMove={(e) => {
          const key = sliceAt(e);
          if (key !== active) setActive(key);
        }}
        onPointerDown={(e) => setActive(sliceAt(e))}
        onPointerLeave={() => setActive(null)}
      >
        <circle cx="90" cy="90" r={r} fill="none" stroke="#f1f2f6" strokeWidth={stroke} />
        {arcs.map((arc) => {
          const length = arc.share * circumference;
          const isActive = arc.key === active;
          return (
            <circle
              key={arc.key}
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={isActive ? stroke + 6 : stroke}
              strokeOpacity={active && !isActive ? 0.35 : 1}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-arc.start * circumference}
              transform="rotate(-90 90 90)"
              pointerEvents="none"
              style={{ transition: 'stroke-width 150ms ease, stroke-opacity 150ms ease' }}
            />
          );
        })}
        <text x="90" y="88" textAnchor="middle" className="fill-slate-900" fontSize="24" fontWeight="600">
          {(activeArc ? activeArc.value : total).toLocaleString('en-IN')}
        </text>
        <text x="90" y="110" textAnchor="middle" className="fill-slate-500" fontSize="12">
          {activeArc ? `${pct(activeArc.share)} of cases` : 'Total cases'}
        </text>
      </svg>

      <div
        className="pointer-events-none absolute z-10 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_12px_28px_rgba(15,23,42,0.14)] backdrop-blur-sm"
        style={{
          left: `${(anchorX / 180) * 100}%`,
          top: `${(anchorY / 180) * 100}%`,
          opacity: activeArc ? 1 : 0,
          transform: `translate(-50%, ${anchorY < 90 ? 'calc(-100% - 8px)' : '8px'}) scale(${activeArc ? 1 : 0.96})`,
          transition: 'left 150ms ease-out, top 150ms ease-out, opacity 150ms ease, transform 150ms ease',
        }}
        aria-live="polite"
      >
        {activeArc && (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeArc.color }} />
            <span className="text-xs font-medium text-slate-700">{activeArc.label}</span>
            <span className="text-xs font-semibold text-slate-900 tabular-nums">{activeArc.value.toLocaleString('en-IN')}</span>
            <span className="text-[11px] text-slate-500">({pct(activeArc.share)})</span>
          </div>
        )}
      </div>
    </div>
  );
}
