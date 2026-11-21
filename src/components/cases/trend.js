// Case counts over time for the dashboard trend chart.

export const TREND_RANGES = [
  { key: '7d', label: '7D', days: 7, bucket: 'day' },
  { key: '30d', label: '30D', days: 30, bucket: 'day' },
  { key: '3m', label: '3M', days: 91, bucket: 'week' },
  { key: '1y', label: '1Y', days: 365, bucket: 'month' },
];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Counts of cases per day / week / month ending today.
export function buildTrend(cases, range) {
  const today = startOfDay(new Date());
  const buckets = [];
  if (range.bucket === 'month') {
    for (let i = 11; i >= 0; i -= 1) {
      const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      buckets.push({
        start,
        end,
        label: start.toLocaleDateString('en-GB', { month: 'short' }),
        detail: start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      });
    }
  } else {
    const step = range.bucket === 'week' ? 7 : 1;
    const count = Math.ceil(range.days / step);
    for (let i = count - 1; i >= 0; i -= 1) {
      const end = new Date(today);
      end.setDate(end.getDate() + 1 - i * step);
      const start = new Date(end);
      start.setDate(start.getDate() - step);
      const labelDate = step === 1 ? start : end;
      // Tooltip text: the day, or the week's first – last day (end is exclusive).
      const lastDay = new Date(end);
      lastDay.setDate(lastDay.getDate() - 1);
      const fullDate = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const detail = step === 1
        ? fullDate(start)
        : `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${fullDate(lastDay)}`;
      buckets.push({ start, end, label: labelDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), detail });
    }
  }
  const counts = buckets.map(() => 0);
  // Items are cases ({ date }) or pre-aggregated daily counts ({ date, count }).
  for (const c of cases) {
    if (!c.date) continue;
    const t = startOfDay(c.date).getTime();
    const idx = buckets.findIndex((b) => t >= b.start.getTime() && t < b.end.getTime());
    if (idx !== -1) counts[idx] += c.count ?? 1;
  }
  return buckets.map((b, i) => ({ label: b.label, detail: b.detail, value: counts[i] }));
}

// Round tick step (1–10 × 10^n) so 4 gridlines cover the max value without much headroom.
export function niceStep(value) {
  const raw = Math.max(value, 4) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * magnitude >= raw) * magnitude;
  return step;
}
