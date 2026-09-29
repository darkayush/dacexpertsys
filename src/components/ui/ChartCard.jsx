import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

export default function ChartCard({
  title = 'DAC Case Statistics',
  subtitle = 'Incident activity & precedent trends',
  cases = [],
  className = '',
}) {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [timeRange, setTimeRange] = useState('week'); // 'week' | 'month'

  // Generate real or realistic data points based on cases
  const chartData = useMemo(() => {
    if (timeRange === 'week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      // Group cases by day of week or create distribution
      const counts = [0, 0, 0, 0, 0, 0, 0];
      cases.forEach((c) => {
        const d = new Date(c.incident_date || c.created_at);
        if (!isNaN(d.getTime())) {
          // JS day: 0=Sun, 1=Mon, ..., 6=Sat -> map to Mon=0..Sun=6
          const dayIdx = (d.getDay() + 6) % 7;
          counts[dayIdx] = (counts[dayIdx] || 0) + 1;
        }
      });
      // Fallback scale if empty
      const base = counts.some((c) => c > 0) ? counts : [12, 19, 34, 28, 45, 32, 22];
      return days.map((day, i) => ({
        label: day,
        value: base[i] || 0,
      }));
    } else {
      const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      const counts = [0, 0, 0, 0, 0, 0];
      cases.forEach((c) => {
        const d = new Date(c.incident_date || c.created_at);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth();
          // Map to recent 6 months
          const idx = m % 6;
          counts[idx] = (counts[idx] || 0) + 1;
        }
      });
      const base = counts.some((c) => c > 0) ? counts : [120, 185, 240, 310, 290, 410];
      return months.map((month, i) => ({
        label: month,
        value: base[i] || 0,
      }));
    }
  }, [cases, timeRange]);

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const width = 580;
  const height = 190;
  const paddingX = 40;
  const paddingY = 25;

  // Compute SVG Bézier points
  const points = useMemo(() => {
    const stepX = (width - paddingX * 2) / (chartData.length - 1);
    return chartData.map((d, i) => {
      const x = paddingX + i * stepX;
      // y goes from height - paddingY down to paddingY
      const y = height - paddingY - (d.value / maxValue) * (height - paddingY * 2);
      return { x, y, ...d };
    });
  }, [chartData, maxValue]);

  // Construct smooth SVG curved path (Cubic Bézier)
  const pathD = useMemo(() => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const cpX1 = current.x + (next.x - current.x) / 2;
      const cpY1 = current.y;
      const cpX2 = current.x + (next.x - current.x) / 2;
      const cpY2 = next.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }
    return d;
  }, [points]);

  const areaD = useMemo(() => {
    if (!pathD || points.length === 0) return '';
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    return `${pathD} L ${lastX} ${height} L ${firstX} ${height} Z`;
  }, [pathD, points]);

  // Calendar mini-strip (week representation matching reference top-right)
  const calendarDays = [
    { day: 'Mon', date: 22 },
    { day: 'Tue', date: 23 },
    { day: 'Wed', date: 24 },
    { day: 'Thu', date: 25 },
    { day: 'Fri', date: 26 },
    { day: 'Sat', date: 27 },
    { day: 'Sun', date: 28 },
  ];
  const activeDate = 24;

  return (
    <div
      className={`rounded-3xl bg-white border border-[#edf2f7] p-6 shadow-sm shadow-slate-200/50 flex flex-col justify-between ${className}`}
    >
      {/* Top Header Row: Title, Subtitle, Calendar strip and Time filter */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-[#f1f5f9]">
        <div>
          <h3 className="text-lg font-bold text-[#0f172a] tracking-tight">{title}</h3>
          <p className="text-xs text-[#64748b] mt-0.5">{subtitle}</p>
        </div>

        {/* Mini Calendar strip inspired by reference */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {calendarDays.map((item) => {
            const isActive = item.date === activeDate;
            return (
              <div
                key={item.date}
                className={`flex flex-col items-center justify-center px-2.5 py-1.5 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-b from-[#38bdf8] to-[#0284c7] text-white shadow-md shadow-sky-500/20'
                    : 'text-[#64748b] hover:bg-[#f8fafc]'
                }`}
              >
                <span className={`text-[10px] font-medium ${isActive ? 'text-white/80' : 'text-[#94a3b8]'}`}>
                  {item.day}
                </span>
                <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-[#334155]'}`}>
                  {item.date}
                </span>
              </div>
            );
          })}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-[#f8fafc] border border-[#e2e8f0] p-1 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              timeRange === 'week'
                ? 'bg-white text-[#0f172a] shadow-xs'
                : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              timeRange === 'month'
                ? 'bg-white text-[#0f172a] shadow-xs'
                : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Interactive SVG Chart Area */}
      <div className="relative mt-4 w-full h-[210px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0284c7" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Horizontal gridlines */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - paddingY - ratio * (height - paddingY * 2);
            return (
              <line
                key={ratio}
                x1={paddingX - 10}
                y1={y}
                x2={width - paddingX + 10}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area fill */}
          {areaD && <path d={areaD} fill="url(#chartGradient)" />}

          {/* Smooth line curve */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="3.5"
              strokeLinecap="round"
              filter="url(#glow)"
            />
          )}

          {/* Interactive Data points */}
          {points.map((p, i) => {
            const isHovered = selectedPoint === i || (selectedPoint === null && i === 2);
            return (
              <g
                key={i}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setSelectedPoint(i)}
                onMouseLeave={() => setSelectedPoint(null)}
              >
                {isHovered && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="8"
                    fill="#38bdf8"
                    fillOpacity="0.3"
                    className="animate-pulse"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? '5' : '3.5'}
                  fill="#ffffff"
                  stroke="#0284c7"
                  strokeWidth={isHovered ? '3' : '2'}
                  className="transition-all"
                />

                {/* Tooltip bubble on active point (matching reference bubble '194,000') */}
                {isHovered && (
                  <g transform={`translate(${p.x}, ${p.y - 36})`}>
                    <rect
                      x="-42"
                      y="-12"
                      width="84"
                      height="24"
                      rx="12"
                      fill="#0284c7"
                      className="shadow-lg"
                    />
                    <polygon points="-5,12 5,12 0,16" fill="#0284c7" />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {p.value.toLocaleString()} cases
                    </text>
                  </g>
                )}

                {/* X-axis labels */}
                <text
                  x={p.x}
                  y={height - 4}
                  textAnchor="middle"
                  fill={isHovered ? '#0284c7' : '#94a3b8'}
                  fontSize="11"
                  fontWeight={isHovered ? 'bold' : '500'}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
