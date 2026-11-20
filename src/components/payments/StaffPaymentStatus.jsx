import { useEffect, useState } from 'react';
import { getCasePayment } from '../../services/api';
import { Icon } from '../cases/parts';
import ReceiptActions from './ReceiptActions';
import { formatINR, formatPaymentDate } from './format';

/** Read-only fine payment status for staff on a resolved case (shown in the Workflow panel). */
export default function StaffPaymentStatus({ caseId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    getCasePayment(caseId)
      .then((result) => active && setData(result))
      .catch(() => active && setData(null));
    return () => { active = false; };
  }, [caseId]);

  if (!data || (!data.payment && !data.eligible)) return null;

  if (data.payment) {
    return (
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 space-y-2">
        <p className="flex items-start gap-2 text-sm text-emerald-800">
          <Icon name="check_circle" className="text-[18px] mt-px" />
          <span>
            Fine of {formatINR(data.payment.amount)} paid on {formatPaymentDate(data.payment.payment_date)}
            {' '}(transaction <span className="font-mono">{data.payment.transaction_id}</span>).
          </span>
        </p>
        <ReceiptActions transactionId={data.payment.transaction_id} layout="inline" />
      </div>
    );
  }

  return (
    <p className="flex items-center gap-2 text-sm text-slate-600">
      <Icon name="schedule" className="text-[18px]" />
      Fine of {formatINR(data.amount)} not yet paid by the student.
    </p>
  );
}
