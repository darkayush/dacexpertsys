// Display helpers for demo payments. Dates are shown in India time, matching the PDF receipt.

export function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatPaymentDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

const PAYMENT_WINDOW_DAYS = 7; // DAC policy: fines are paid within a week of the decision.

/** Due date for a fine: one week after the case was resolved. */
export function fineDueDate(resolvedAt) {
  if (!resolvedAt) return null;
  return new Date(new Date(resolvedAt).getTime() + PAYMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}
