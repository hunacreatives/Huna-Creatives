import { useEffect, useState } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';

const fmt = (n: number | null) =>
  n == null ? '—' : '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface InvoiceLog {
  id: number;
  invoice_number: string;
  project_id: number | null;
  client_name: string;
  project_name: string;
  sent_to: string;
  sent_cc: string | null;
  subject: string | null;
  contract_price: number | null;
  total_paid: number | null;
  balance: number | null;
  line_items: { description: string; amount: string }[] | null;
  show_payments: boolean;
  sent_at: string;
}

interface ReceiptLog {
  id: number;
  project_id: number | null;
  client_name: string;
  project_name: string;
  payment_amount: number;
  paid_at: string | null;
  sent_to: string;
  total_paid: number | null;
  balance: number | null;
  receipt_url: string | null;
  sent_at: string;
}

type Tab = 'invoices' | 'receipts';

export default function InvoiceLogPage() {
  const [tab, setTab] = useState<Tab>('invoices');
  const [invoices, setInvoices] = useState<InvoiceLog[]>([]);
  const [receipts, setReceipts] = useState<ReceiptLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [iRes, rRes] = await Promise.all([
        supabase.from('hub_invoice_log').select('*').order('id', { ascending: false }),
        supabase.from('hub_payment_receipt_log').select('*').order('id', { ascending: false }),
      ]);
      setInvoices((iRes.data as InvoiceLog[]) ?? []);
      setReceipts((rRes.data as ReceiptLog[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const q = search.toLowerCase();
  const filteredInvoices = invoices.filter(i =>
    i.client_name.toLowerCase().includes(q) ||
    i.project_name.toLowerCase().includes(q) ||
    i.invoice_number.includes(q) ||
    i.sent_to.toLowerCase().includes(q)
  );
  const filteredReceipts = receipts.filter(r =>
    r.client_name.toLowerCase().includes(q) ||
    r.project_name.toLowerCase().includes(q) ||
    r.sent_to.toLowerCase().includes(q)
  );

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const fmtDateTime = (s: string) =>
    new Date(s).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Invoice Log</h1>
          <p className="text-sm text-gray-500 mt-1">Full audit trail of sent invoices and payment receipts</p>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setTab('invoices')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${tab === 'invoices' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Invoices
              <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{invoices.length}</span>
            </button>
            <button
              onClick={() => setTab('receipts')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${tab === 'receipts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Payment Receipts
              <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{receipts.length}</span>
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by client, project, email…"
            className="ml-auto w-64 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
          />
        </div>

        {loading ? (
          <div className="text-sm text-gray-400 py-12 text-center">Loading…</div>
        ) : tab === 'invoices' ? (
          filteredInvoices.length === 0 ? (
            <div className="text-sm text-gray-400 py-12 text-center">No invoices found</div>
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map(inv => (
                <div key={inv.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
                  >
                    <div className="w-14 text-center">
                      <span className="text-xs font-mono font-bold text-[#FF6B35] bg-orange-50 px-2 py-1 rounded">
                        #{inv.invoice_number.padStart(4, '0')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{inv.project_name}</p>
                      <p className="text-xs text-gray-500 truncate">{inv.client_name} · {inv.sent_to}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{fmt(inv.contract_price)}</p>
                      {inv.balance != null && (
                        <p className={`text-xs font-medium ${inv.balance <= 0 ? 'text-emerald-600' : 'text-orange-500'}`}>
                          {inv.balance <= 0 ? 'Paid in full' : `${fmt(inv.balance)} due`}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0 w-32 text-right">{fmtDateTime(inv.sent_at)}</div>
                    <i className={`ri-arrow-${expanded === inv.id ? 'up' : 'down'}-s-line text-gray-400`}></i>
                  </button>
                  {expanded === inv.id && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
                      {inv.subject && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Subject</p>
                          <p className="text-sm text-gray-700">{inv.subject}</p>
                        </div>
                      )}
                      {inv.sent_cc && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">CC</p>
                          <p className="text-sm text-gray-700">{inv.sent_cc}</p>
                        </div>
                      )}
                      {inv.line_items && inv.line_items.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Line Items</p>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            {inv.line_items.map((item, i) => (
                              <div key={i} className="flex justify-between px-4 py-2.5 text-sm border-b border-gray-100 last:border-0">
                                <span className="text-gray-700">{item.description}</span>
                                <span className="font-semibold text-gray-900">{fmt(parseFloat(item.amount) || 0)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Total</p>
                          <p className="font-semibold text-gray-900">{fmt(inv.contract_price)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Paid</p>
                          <p className="font-semibold text-emerald-600">{fmt(inv.total_paid)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Balance</p>
                          <p className={`font-semibold ${(inv.balance ?? 1) <= 0 ? 'text-emerald-600' : 'text-orange-500'}`}>{inv.balance != null && inv.balance <= 0 ? 'Paid ✓' : fmt(inv.balance)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">
                        Payments history {inv.show_payments ? 'shown' : 'hidden'} on invoice · Sent {fmtDateTime(inv.sent_at)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          filteredReceipts.length === 0 ? (
            <div className="text-sm text-gray-400 py-12 text-center">No receipts found</div>
          ) : (
            <div className="space-y-2">
              {filteredReceipts.map(r => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === -r.id ? null : -r.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.project_name}</p>
                      <p className="text-xs text-gray-500 truncate">{r.client_name} · {r.sent_to}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-600">{fmt(r.payment_amount)}</p>
                      {r.paid_at && <p className="text-xs text-gray-400">{fmtDate(r.paid_at)}</p>}
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0 w-32 text-right">{fmtDateTime(r.sent_at)}</div>
                    <i className={`ri-arrow-${expanded === -r.id ? 'up' : 'down'}-s-line text-gray-400`}></i>
                  </button>
                  {expanded === -r.id && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Amount</p>
                          <p className="font-semibold text-emerald-600">{fmt(r.payment_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Total Paid</p>
                          <p className="font-semibold text-gray-900">{fmt(r.total_paid)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Balance After</p>
                          <p className={`font-semibold ${(r.balance ?? 1) <= 0 ? 'text-emerald-600' : 'text-orange-500'}`}>{r.balance != null && r.balance <= 0 ? 'Paid ✓' : fmt(r.balance)}</p>
                        </div>
                      </div>
                      {r.receipt_url && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Proof of Receipt</p>
                          <a href={r.receipt_url} target="_blank" rel="noreferrer" className="inline-block">
                            <img src={r.receipt_url} alt="Receipt" className="max-h-40 rounded-lg border border-gray-200 object-contain bg-white" />
                          </a>
                        </div>
                      )}
                      <p className="text-xs text-gray-400">Receipt email sent {fmtDateTime(r.sent_at)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </AdminLayout>
  );
}
