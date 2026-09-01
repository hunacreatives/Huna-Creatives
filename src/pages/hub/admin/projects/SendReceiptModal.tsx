import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getDriveThumbnailUrl } from '@/pages/hub/utils/drive';
import { fmt, fmtDate } from './shared';

interface ReceiptPayment { id: number; amount: number; paid_at: string; notes: string | null; receipt_url: string | null; }
interface ReceiptProject { id: number; client_name: string; project_name: string; contract_price: number; contact_email: string | null; hub_project_payments: { amount: number }[]; }

// Emails a payment receipt to the client via the send-payment-receipt function.
export default function SendReceiptModal({ payment, project, onClose }: {
  payment: ReceiptPayment;
  project: ReceiptProject;
  onClose: () => void;
}) {
  const [sendReceiptEmail, setSendReceiptEmail] = useState(project.contact_email ?? '');
  const [sendReceiptCc, setSendReceiptCc] = useState('');
  const [sendReceiptSending, setSendReceiptSending] = useState(false);
  const [sendReceiptMsg, setSendReceiptMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const sendReceipt = async () => {
    if (!sendReceiptEmail.trim()) return;
    setSendReceiptSending(true); setSendReceiptMsg(null);
    const totalPaid = project.hub_project_payments.reduce((s, p) => s + p.amount, 0);
    const { data, error } = await supabase.functions.invoke('send-payment-receipt', {
      body: {
        to: sendReceiptEmail.trim(),
        cc: sendReceiptCc.trim() || undefined,
        client_name: project.client_name,
        project_name: project.project_name,
        amount: payment.amount,
        paid_at: payment.paid_at,
        notes: payment.notes,
        receipt_url: payment.receipt_url,
        total_paid: totalPaid,
        contract_price: project.contract_price,
        invoice_number: project.id,
        project_id: project.id,
      },
    });
    setSendReceiptSending(false);
    if (error || data?.error) {
      setSendReceiptMsg({ ok: false, text: data?.error ?? error?.message ?? 'Failed to send' });
    } else {
      setSendReceiptMsg({ ok: true, text: 'Receipt sent!' });
    }
  };

  return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-4" onClick={() => onClose()}>
          <div className="bg-white rounded-2xl w-full sm:max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">Send Payment Receipt</h3>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(payment.amount)} · {fmtDate(payment.paid_at)}</p>
              </div>
              <button onClick={() => onClose()} className="text-gray-400 hover:text-gray-600 cursor-pointer"><i className="ri-close-line text-lg"></i></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Send to <span className="text-red-400">*</span></label>
                <input type="email" value={sendReceiptEmail} onChange={e => setSendReceiptEmail(e.target.value)}
                  placeholder="client@email.com" autoFocus
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">CC <span className="text-gray-400">(optional)</span></label>
                <input type="email" value={sendReceiptCc} onChange={e => setSendReceiptCc(e.target.value)}
                  placeholder="e.g. team@hunacreatives.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>

              {/* Payment summary */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs text-gray-500">
                <div className="flex justify-between"><span>Payment</span><span className="font-semibold text-emerald-600">{fmt(payment.amount)}</span></div>
                <div className="flex justify-between"><span>Date</span><span className="font-medium text-gray-700">{fmtDate(payment.paid_at)}</span></div>
                {payment.notes && <div className="flex justify-between"><span>Note</span><span className="text-gray-600">{payment.notes}</span></div>}
                <div className="flex justify-between pt-1 border-t border-gray-200"><span>Remaining balance</span><span className={`font-bold ${project.contract_price - project.hub_project_payments.reduce((s,p)=>s+p.amount,0) <= 0 ? 'text-emerald-600' : 'text-[#FF6B35]'}`}>{project.contract_price - project.hub_project_payments.reduce((s,p)=>s+p.amount,0) <= 0 ? 'Paid in full' : fmt(project.contract_price - project.hub_project_payments.reduce((s,p)=>s+p.amount,0))}</span></div>
              </div>

              {payment.receipt_url && (
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <img src={getDriveThumbnailUrl(payment.receipt_url)} alt="receipt" className="h-10 w-14 object-cover rounded border border-gray-200 flex-shrink-0" />
                  <p className="text-xs text-gray-500">Receipt image will be included in the email.</p>
                </div>
              )}

              {sendReceiptMsg && (
                <p className={`text-xs font-medium ${sendReceiptMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {sendReceiptMsg.ok ? <><i className="ri-check-line mr-1"></i>{sendReceiptMsg.text}</> : sendReceiptMsg.text}
                </p>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => onClose()} className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={sendReceipt} disabled={sendReceiptSending || !sendReceiptEmail.trim()}
                className="flex-1 py-2.5 text-sm bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a27] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5">
                {sendReceiptSending ? <><i className="ri-loader-4-line animate-spin"></i> Sending…</> : <><i className="ri-mail-send-line"></i> Send Receipt</>}
              </button>
            </div>
          </div>
        </div>
  );
}
