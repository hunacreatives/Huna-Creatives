import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

interface CallerStat {
  callerId: string;
  callerName: string;
  callsToday: number;
  successfulToday: number;
  emailFoundToday: number;
  phoneFoundToday: number;
  interestedToday: number;
  callbackToday: number;
  notInterestedToday: number;
  voicemailToday: number;
  noAnswerToday: number;
}

interface OutcomeBreakdown {
  interested: number;
  callback: number;
  notInterested: number;
  voicemail: number;
  noAnswer: number;
  skip: number;
}

interface StatsPayload {
  total: number;
  complete: number;
  calling: number;
  attempted: number;
  outcomes: OutcomeBreakdown;
  daily: CallerStat[];
  weekly: CallerStat[];
  monthly: CallerStat[];
  lifetime: CallerStat[];
}

export async function getSmartGridStats(): Promise<StatsPayload> {
  try {
    // Find SmartGrid Western project
    const { data: projects, error: projErr } = await supabase
      .from("hub_projects")
      .select("id")
      .eq("project_name", "SmartGrid Western")
      .limit(1);

    if (projErr || !projects || projects.length === 0) {
      throw new Error("SmartGrid Western project not found");
    }

    const projectId = projects[0].id;

    const countStatus = async (status?: string) => {
      let q = supabase
        .from("hub_project_leads")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId);
      if (status) q = q.eq("status", status);
      const { count, error } = await q;
      if (error) throw error;
      return count || 0;
    };
    const [total, complete, calling, attempted] = await Promise.all([
      countStatus(),
      countStatus("complete"),
      countStatus("calling"),
      countStatus("attempted"),
    ]);

    // One row per saved call, paged past the 1,000-row API cap
    const activities: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("hub_project_activity")
        .select("id, entity_id, user_id, hub_users(full_name), meta, created_at")
        .eq("project_id", projectId)
        .eq("action", "lead_outcome_logged")
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (error) throw error;
      activities.push(...(data || []));
      if (!data || data.length < 1000) break;
    }

    // Same rules as the hub Lead Tracker: the night shift counts toward the
    // Manila date it started on (noon cutoff).
    const shiftDayOf = (ts: string | number) =>
      new Date(new Date(ts).getTime() - 12 * 60 * 60 * 1000)
        .toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    const addDays = (day: string, n: number) => {
      const d = new Date(`${day}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const today = shiftDayOf(Date.now());
    const periods: Record<string, (day: string) => boolean> = {
      daily: (day) => day === today,
      weekly: (day) => day > addDays(today, -7) && day <= today,
      monthly: (day) => day.slice(0, 7) === today.slice(0, 7),
      lifetime: () => true,
    };

    const allCallerStats: Record<string, CallerStat[]> = {};
    const outcomeBreakdown: OutcomeBreakdown = {
      interested: 0,
      callback: 0,
      notInterested: 0,
      voicemail: 0,
      noAnswer: 0,
      skip: 0,
    };

    Object.entries(periods).forEach(([period, matches]) => {
      const callerMap = new Map<string, {
        name: string;
        calls: number;
        successful: Set<string>;
        emailFound: Set<string>;
        phoneFound: Set<string>;
        interested: number;
        callback: number;
        notInterested: number;
        voicemail: number;
        noAnswer: number;
      }>();

      activities.forEach((activity: any) => {
        if (!activity.user_id || !matches(shiftDayOf(activity.created_at))) return;
        if (activity.meta?.outcome === "skip") {
          if (period === "daily") outcomeBreakdown.skip++;
          return;
        }

        const callerId = activity.user_id;
        const callerName = activity.hub_users?.full_name || "Unknown";

        if (!callerMap.has(callerId)) {
          callerMap.set(callerId, {
            name: callerName,
            calls: 0,
            successful: new Set(),
            emailFound: new Set(),
            phoneFound: new Set(),
            interested: 0,
            callback: 0,
            notInterested: 0,
            voicemail: 0,
            noAnswer: 0,
          });
        }

        const caller = callerMap.get(callerId)!;
        const leadId = String(activity.entity_id);
        caller.calls++;

        const outcome = activity.meta?.outcome;
        if (outcome === "interested") {
          caller.interested++;
          if (period === "daily") outcomeBreakdown.interested++;
        } else if (outcome === "callback") {
          caller.callback++;
          if (period === "daily") outcomeBreakdown.callback++;
        } else if (outcome === "not_interested") {
          caller.notInterested++;
          if (period === "daily") outcomeBreakdown.notInterested++;
        } else if (outcome === "voicemail") {
          caller.voicemail++;
          if (period === "daily") outcomeBreakdown.voicemail++;
        } else if (outcome === "no_answer") {
          caller.noAnswer++;
          if (period === "daily") outcomeBreakdown.noAnswer++;
        }

        // Successful = an email was captured on the call
        if (activity.meta?.email_found) {
          caller.successful.add(leadId);
          caller.emailFound.add(leadId);
        }
        if (activity.meta?.phone_found) {
          caller.phoneFound.add(leadId);
        }
      });

      allCallerStats[period] = Array.from(callerMap.entries()).map(([callerId, data]) => ({
        callerId,
        callerName: data.name,
        callsToday: data.calls,
        successfulToday: data.successful.size,
        emailFoundToday: data.emailFound.size,
        phoneFoundToday: data.phoneFound.size,
        interestedToday: data.interested,
        callbackToday: data.callback,
        notInterestedToday: data.notInterested,
        voicemailToday: data.voicemail,
        noAnswerToday: data.noAnswer,
      }));
    });

    return {
      total,
      complete,
      calling,
      attempted,
      outcomes: outcomeBreakdown,
      daily: allCallerStats.daily,
      weekly: allCallerStats.weekly,
      monthly: allCallerStats.monthly,
      lifetime: allCallerStats.lifetime,
    };
  } catch (err) {
    console.error("Error computing stats:", err);
    throw err;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "OPTIONS") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const stats = await getSmartGridStats();
    return new Response(JSON.stringify(stats), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: "Failed to compute stats" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
