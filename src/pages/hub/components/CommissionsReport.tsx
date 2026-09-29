import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CommissionSummary {
  user_id: string;
  full_name: string;
  email_count: number;
  meeting_count: number;
  bill_count: number;
  email_total: number;
  meeting_total: number;
  bill_total: number;
  grand_total: number;
}

interface Props {
  projectId: number;
}

export default function CommissionsReport({ projectId }: Props) {
  const [summaries, setSummaries] = useState<CommissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    fetchCommissions();
  }, [projectId]);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hub_project_commissions')
        .select('user_id, milestone, amount')
        .eq('project_id', projectId);

      if (error) throw error;

      // Group by user and milestone
      const grouped = new Map<string, Map<string, { count: number; total: number }>>();

      (data || []).forEach(row => {
        if (!grouped.has(row.user_id)) {
          grouped.set(row.user_id, new Map());
        }
        const userMap = grouped.get(row.user_id)!;
        if (!userMap.has(row.milestone)) {
          userMap.set(row.milestone, { count: 0, total: 0 });
        }
        const milestone = userMap.get(row.milestone)!;
        milestone.count += 1;
        milestone.total += Number(row.amount);
      });

      // Fetch user names and build summaries
      const userIds = Array.from(grouped.keys());
      const { data: users } = await supabase
        .from('hub_users')
        .select('id, full_name')
        .in('id', userIds);

      const summaries: CommissionSummary[] = (users || [])
        .map(user => {
          const userMilestones = grouped.get(user.id) || new Map();
          const email = userMilestones.get('email') || { count: 0, total: 0 };
          const meeting = userMilestones.get('meeting') || { count: 0, total: 0 };
          const bill = userMilestones.get('bill') || { count: 0, total: 0 };

          return {
            user_id: user.id,
            full_name: user.full_name,
            email_count: email.count,
            meeting_count: meeting.count,
            bill_count: bill.count,
            email_total: email.total,
            meeting_total: meeting.total,
            bill_total: bill.total,
            grand_total: email.total + meeting.total + bill.total,
          };
        })
        .sort((a, b) => b.grand_total - a.grand_total);

      setSummaries(summaries);
      setTotalEarned(summaries.reduce((sum, s) => sum + s.grand_total, 0));
    } catch (err) {
      console.error('Error fetching commissions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500 text-sm py-4">Loading payouts...</div>;
  }

  if (summaries.length === 0) {
    return <div className="text-center text-gray-500 text-sm py-4">No commissions earned yet</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-800 text-sm">Caller Payouts</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Caller</th>
              <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Emails</th>
              <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Meetings</th>
              <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Bills</th>
              <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map(summary => (
              <tr key={summary.user_id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800">{summary.full_name}</td>
                <td className="text-right px-4 py-2.5 text-gray-600">
                  <span className="text-xs">{summary.email_count}×</span>
                  <span className="ml-1 font-medium">${summary.email_total.toFixed(2)}</span>
                </td>
                <td className="text-right px-4 py-2.5 text-gray-600">
                  <span className="text-xs">{summary.meeting_count}×</span>
                  <span className="ml-1 font-medium">${summary.meeting_total.toFixed(2)}</span>
                </td>
                <td className="text-right px-4 py-2.5 text-gray-600">
                  <span className="text-xs">{summary.bill_count}×</span>
                  <span className="ml-1 font-medium">${summary.bill_total.toFixed(2)}</span>
                </td>
                <td className="text-right px-4 py-2.5 font-semibold text-gray-800">
                  ${summary.grand_total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-100 font-semibold">
              <td className="px-4 py-3 text-gray-800">Total Payouts</td>
              <td colSpan={3} className="text-right text-gray-600"></td>
              <td className="text-right px-4 py-3 text-gray-800">${totalEarned.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
