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

    // Get all leads
    const { data: leads, error: leadsErr } = await supabase
      .from("hub_project_leads")
      .select("status")
      .eq("project_id", projectId);

    if (leadsErr) throw leadsErr;

    const total = leads?.length || 0;
    const complete = leads?.filter(l => l.status === "complete").length || 0;
    const calling = leads?.filter(l => l.status === "calling").length || 0;
    const attempted = leads?.filter(l => l.status === "attempted").length || 0;

    // Get activities for per-caller stats
    const { data: activities, error: activitiesErr } = await supabase
      .from("hub_project_activity")
      .select("user_id, hub_users(full_name), meta, created_at")
      .eq("project_id", projectId)
      .eq("entity_type", "lead");

    if (activitiesErr) throw activitiesErr;

    // Calculate stats for each period
    const now = new Date();
    const periods: Record<string, Date> = {
      daily: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      weekly: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      monthly: new Date(now.getFullYear(), now.getMonth(), 1),
      lifetime: new Date(0),
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

    Object.entries(periods).forEach(([period, startDate]) => {
      const callerMap = new Map<string, {
        name: string;
        calls: Set<string>;
        successful: number;
        emailFound: number;
        phoneFound: number;
        interested: number;
        callback: number;
        notInterested: number;
        voicemail: number;
        noAnswer: number;
      }>();

      (activities || []).forEach((activity: any) => {
        const actDate = new Date(activity.created_at);
        if (actDate < startDate) return;

        if (!activity.user_id) return;
        const callerId = activity.user_id;
        const callerName = activity.hub_users?.full_name || "Unknown";

        if (!callerMap.has(callerId)) {
          callerMap.set(callerId, {
            name: callerName,
            calls: new Set(),
            successful: 0,
            emailFound: 0,
            phoneFound: 0,
            interested: 0,
            callback: 0,
            notInterested: 0,
            voicemail: 0,
            noAnswer: 0,
          });
        }

        const caller = callerMap.get(callerId)!;
        caller.calls.add(activity.meta?.lead_id || "");

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
        } else if (outcome === "skip") {
          if (period === "daily") outcomeBreakdown.skip++;
        }

        if (outcome === "interested" || outcome === "callback") {
          caller.successful++;
        }
        if (activity.meta?.email_found) {
          caller.emailFound++;
        }
        if (activity.meta?.phone_found) {
          caller.phoneFound++;
        }
      });

      allCallerStats[period] = Array.from(callerMap.entries()).map(([callerId, data]) => ({
        callerId,
        callerName: data.name,
        callsToday: data.calls.size,
        successfulToday: data.successful,
        emailFoundToday: data.emailFound,
        phoneFoundToday: data.phoneFound,
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
