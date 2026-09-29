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
}

interface StatsPayload {
  total: number;
  complete: number;
  calling: number;
  attempted: number;
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

    Object.entries(periods).forEach(([period, startDate]) => {
      const callerMap = new Map<string, { name: string; calls: Set<string>; successful: number; emailFound: number; phoneFound: number }>();

      (activities || []).forEach((activity: any) => {
        const actDate = new Date(activity.created_at);
        if (actDate < startDate) return;

        if (!activity.user_id) return;
        const callerId = activity.user_id;
        const callerName = activity.hub_users?.full_name || "Unknown";

        if (!callerMap.has(callerId)) {
          callerMap.set(callerId, { name: callerName, calls: new Set(), successful: 0, emailFound: 0, phoneFound: 0 });
        }

        const caller = callerMap.get(callerId)!;
        caller.calls.add(activity.meta?.lead_id || "");

        if (activity.meta?.outcome === "interested" || activity.meta?.outcome === "callback") {
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
      }));
    });

    return {
      total,
      complete,
      calling,
      attempted,
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
