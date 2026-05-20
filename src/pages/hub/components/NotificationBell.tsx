import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Notif {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
  time: Date;
}

function timeAgo(d: Date) {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const { hubUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const lsKey = `hub_notif_seen_${hubUser?.id}`;
  const getLastSeen = (): Date => {
    const s = localStorage.getItem(lsKey);
    return s ? new Date(s) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  };

  useEffect(() => {
    if (!hubUser) return;
    fetchNotifs();
  }, [hubUser]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifs = async () => {
    if (!hubUser) return;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // last 7 days
    const lastSeen = getLastSeen();
    const items: Notif[] = [];

    const isAdmin = hubUser.role === 'admin' || hubUser.role === 'owner';

    if (isAdmin) {
      // New comments on announcements
      const { data: comments } = await supabase
        .from('hub_announcement_comments')
        .select('id, body, created_at, hub_users(full_name)')
        .gte('created_at', since)
        .neq('user_id', hubUser.id)
        .order('created_at', { ascending: false })
        .limit(10);

      for (const c of comments || []) {
        const poster = (c as any).hub_users?.full_name?.split(' ')[0] ?? 'Someone';
        items.push({
          id: `comment-${c.id}`,
          icon: 'ri-chat-3-line',
          iconBg: 'bg-sky-50',
          iconColor: 'text-sky-500',
          title: `${poster} commented on an announcement`,
          body: (c.body as string).slice(0, 80),
          time: new Date(c.created_at),
        });
      }

      // New time off requests
      const { data: toReqs } = await supabase
        .from('hub_time_off')
        .select('id, type, created_at, hub_users(full_name)')
        .gte('created_at', since)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      for (const r of toReqs || []) {
        const name = (r as any).hub_users?.full_name?.split(' ')[0] ?? 'Someone';
        items.push({
          id: `timeoff-${r.id}`,
          icon: 'ri-calendar-event-line',
          iconBg: 'bg-purple-50',
          iconColor: 'text-purple-500',
          title: `${name} requested time off`,
          body: `Type: ${r.type}`,
          time: new Date(r.created_at),
        });
      }

      // New requests
      const { data: reqs } = await supabase
        .from('hub_requests')
        .select('id, title, created_at, hub_users(full_name)')
        .gte('created_at', since)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(5);

      for (const r of reqs || []) {
        const name = (r as any).hub_users?.full_name?.split(' ')[0] ?? 'Someone';
        items.push({
          id: `req-${r.id}`,
          icon: 'ri-file-text-line',
          iconBg: 'bg-amber-50',
          iconColor: 'text-amber-500',
          title: `${name} submitted a request`,
          body: r.title,
          time: new Date(r.created_at),
        });
      }

      // Pending credential access requests
      const { data: credReqs } = await supabase
        .from('hub_credential_requests')
        .select('id, created_at, hub_users(full_name), hub_credentials(platform, client_name)')
        .gte('created_at', since)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      for (const r of credReqs || []) {
        const name = (r as any).hub_users?.full_name?.split(' ')[0] ?? 'Someone';
        const platform = (r as any).hub_credentials?.platform ?? 'a credential';
        const client = (r as any).hub_credentials?.client_name ?? '';
        items.push({
          id: `credreq-${r.id}`,
          icon: 'ri-key-line',
          iconBg: 'bg-amber-50',
          iconColor: 'text-amber-500',
          title: `${name} requested credential access`,
          body: `${platform}${client ? ` — ${client}` : ''}`,
          time: new Date(r.created_at),
        });
      }

      // Fund transfer batches pending owner approval
      const { data: batches } = await supabase
        .from('hub_payroll_batches')
        .select('id, period_label, total_amount, created_at')
        .gte('created_at', since)
        .eq('status', 'pending_owner')
        .order('created_at', { ascending: false })
        .limit(3);

      for (const b of batches || []) {
        items.push({
          id: `batch-${b.id}`,
          icon: 'ri-send-plane-line',
          iconBg: 'bg-emerald-50',
          iconColor: 'text-emerald-500',
          title: 'Fund transfer awaiting your approval',
          body: `${b.period_label} · ₱${Number(b.total_amount).toLocaleString()}`,
          time: new Date(b.created_at),
        });
      }

      // Payslips submitted by contractors (pending HR approval)
      const { data: submitted } = await supabase
        .from('hub_payouts')
        .select('id, cutoff_start, submitted_at, hub_users(full_name)')
        .gte('submitted_at', since)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(5);

      for (const p of submitted || []) {
        const name = (p as any).hub_users?.full_name?.split(' ')[0] ?? 'Someone';
        items.push({
          id: `submitted-${p.id}`,
          icon: 'ri-file-text-line',
          iconBg: 'bg-amber-50',
          iconColor: 'text-amber-500',
          title: `${name} submitted their payslip`,
          body: `Period starting ${new Date(p.cutoff_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          time: new Date(p.submitted_at),
        });
      }

    } else {
      // Contractor notifications

      // New announcements
      const { data: anns } = await supabase
        .from('hub_announcements')
        .select('id, title, created_at')
        .gte('created_at', since)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(5);

      for (const a of anns || []) {
        items.push({
          id: `ann-${a.id}`,
          icon: 'ri-megaphone-line',
          iconBg: 'bg-orange-50',
          iconColor: 'text-[#FF6B35]',
          title: 'New announcement',
          body: a.title,
          time: new Date(a.created_at!),
        });
      }

      // Payout status updates
      const { data: payouts } = await supabase
        .from('hub_payouts')
        .select('id, status, cutoff_start, approved_at, paid_at, final_payout')
        .eq('contractor_id', hubUser.id)
        .gte('approved_at', since)
        .in('status', ['hr_approved', 'paid'])
        .order('approved_at', { ascending: false })
        .limit(5);

      for (const p of payouts || []) {
        const isPaid = p.status === 'paid';
        items.push({
          id: `payout-${p.id}`,
          icon: isPaid ? 'ri-bank-card-line' : 'ri-checkbox-circle-line',
          iconBg: isPaid ? 'bg-emerald-50' : 'bg-sky-50',
          iconColor: isPaid ? 'text-emerald-500' : 'text-sky-500',
          title: isPaid ? 'Payment sent' : 'Payslip approved — payment incoming',
          body: `Period starting ${new Date(p.cutoff_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          time: new Date(isPaid ? p.paid_at : p.approved_at),
        });
      }

      // Owner-approved batch notifications (payment approved, transfer in progress)
      const { data: approvedBatches } = await supabase
        .from('hub_payroll_batches')
        .select('id, period_label, approved_at, total_amount')
        .gte('approved_at', since)
        .eq('status', 'owner_approved')
        .order('approved_at', { ascending: false })
        .limit(5);

      if (approvedBatches?.length) {
        const batchIds = approvedBatches.map((b: any) => b.id);
        const { data: myBatchPayouts } = await supabase
          .from('hub_payouts')
          .select('id, batch_id, cutoff_start, final_payout')
          .eq('contractor_id', hubUser.id)
          .in('batch_id', batchIds)
          .neq('status', 'paid');

        for (const p of myBatchPayouts || []) {
          const batch = approvedBatches.find((b: any) => b.id === p.batch_id);
          if (!batch) continue;
          const pay = p.final_payout ? `· ₱${Number(p.final_payout).toLocaleString()}` : '';
          items.push({
            id: `batchapproved-${p.id}`,
            icon: 'ri-money-dollar-circle-line',
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-500',
            title: 'Payment approved — transfer in progress',
            body: `${batch.period_label} ${pay}`,
            time: new Date(batch.approved_at),
          });
        }
      }

      // Time off decisions
      const { data: toDecisions } = await supabase
        .from('hub_time_off')
        .select('id, type, status, updated_at')
        .eq('contractor_id', hubUser.id)
        .gte('updated_at', since)
        .in('status', ['approved', 'rejected'])
        .order('updated_at', { ascending: false })
        .limit(5);

      for (const t of toDecisions || []) {
        items.push({
          id: `to-${t.id}`,
          icon: t.status === 'approved' ? 'ri-checkbox-circle-line' : 'ri-close-circle-line',
          iconBg: t.status === 'approved' ? 'bg-emerald-50' : 'bg-rose-50',
          iconColor: t.status === 'approved' ? 'text-emerald-500' : 'text-rose-500',
          title: `Time off ${t.status}`,
          body: `Your ${t.type} leave request was ${t.status}`,
          time: new Date(t.updated_at),
        });
      }

      // Request updates
      const { data: reqUpdates } = await supabase
        .from('hub_requests')
        .select('id, title, status, updated_at')
        .eq('contractor_id', hubUser.id)
        .gte('updated_at', since)
        .in('status', ['resolved', 'in_review'])
        .order('updated_at', { ascending: false })
        .limit(5);

      for (const r of reqUpdates || []) {
        items.push({
          id: `requpd-${r.id}`,
          icon: 'ri-file-text-line',
          iconBg: 'bg-sky-50',
          iconColor: 'text-sky-500',
          title: `Request ${r.status === 'in_review' ? 'in review' : 'resolved'}`,
          body: r.title,
          time: new Date(r.updated_at),
        });
      }

      // Comments on announcements you reacted to
      const { data: myReactions } = await supabase
        .from('hub_announcement_reactions')
        .select('announcement_id')
        .eq('user_id', hubUser.id);

      if (myReactions && myReactions.length > 0) {
        const annIds = myReactions.map((r: any) => r.announcement_id);
        const { data: newComments } = await supabase
          .from('hub_announcement_comments')
          .select('id, body, created_at, announcement_id, hub_users(full_name)')
          .gte('created_at', since)
          .in('announcement_id', annIds)
          .neq('user_id', hubUser.id)
          .order('created_at', { ascending: false })
          .limit(5);

        for (const c of newComments || []) {
          const name = (c as any).hub_users?.full_name?.split(' ')[0] ?? 'Someone';
          items.push({
            id: `cmt-${c.id}`,
            icon: 'ri-chat-3-line',
            iconBg: 'bg-sky-50',
            iconColor: 'text-sky-500',
            title: `${name} commented on an announcement`,
            body: (c.body as string).slice(0, 80),
            time: new Date(c.created_at),
          });
        }
      }
    }

    // Sort by newest
    items.sort((a, b) => b.time.getTime() - a.time.getTime());
    setNotifs(items);
    setUnread(items.filter(n => n.time > lastSeen).length);
  };

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open) {
      localStorage.setItem(lsKey, new Date().toISOString());
      setUnread(0);
    }
  };

  const clearAll = () => {
    setNotifs([]);
    setUnread(0);
    localStorage.setItem(lsKey, new Date().toISOString());
  };

  if (!hubUser) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
      >
        <i className="ri-notification-3-line text-base"></i>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FF6B35] rounded-full flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">{unread > 9 ? '9+' : unread}</span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-[#111827]">Notifications</h3>
            {notifs.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-10 text-center">
                <i className="ri-notification-off-line text-2xl text-gray-200 block mb-2"></i>
                <p className="text-sm text-gray-400">All caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifs.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg ${n.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <i className={`${n.icon} ${n.iconColor} text-sm`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#111827] leading-snug">{n.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{n.body}</p>
                      <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
