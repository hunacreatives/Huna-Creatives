const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const INTERNAL_ATTENDEE = 'contact@hunacreatives.com';

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: Deno.env.get('GOOGLE_CALENDAR_REFRESH_TOKEN')!,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(data));
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const {
      applicant_email,
      applicant_name,
      role,
      date,
      time,
      duration_minutes = 30,
    } = await req.json() as {
      applicant_email: string;
      applicant_name: string;
      role: string;
      date: string;
      time: string;
      duration_minutes?: number;
    };

    if (!applicant_email || !applicant_name || !role || !date || !time) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: CORS });
    }

    // date: "YYYY-MM-DD", time: "HH:MM" — both interpreted as Asia/Manila (PH office time)
    const start = new Date(`${date}T${time}:00+08:00`);
    const end = new Date(start.getTime() + duration_minutes * 60_000);

    const accessToken = await getAccessToken();

    const eventRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `Huna Creatives — Interview for ${role}`,
          description: `Interview with ${applicant_name} for the ${role} position at Huna Creatives.`,
          start: { dateTime: start.toISOString(), timeZone: 'Asia/Manila' },
          end: { dateTime: end.toISOString(), timeZone: 'Asia/Manila' },
          attendees: [{ email: applicant_email }, { email: INTERNAL_ATTENDEE }],
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }),
      },
    );

    const eventData = await eventRes.json();
    if (!eventRes.ok) {
      return new Response(JSON.stringify({ error: eventData }), { status: 500, headers: CORS });
    }

    const meetLink =
      eventData.hangoutLink ??
      eventData.conferenceData?.entryPoints?.find((e: { entryPointType: string }) => e.entryPointType === 'video')?.uri;

    if (!meetLink) {
      return new Response(JSON.stringify({ error: 'Event created but no Meet link was returned', event: eventData }), {
        status: 500,
        headers: CORS,
      });
    }

    return new Response(
      JSON.stringify({ meet_link: meetLink, event_id: eventData.id, html_link: eventData.htmlLink }),
      { headers: CORS },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});
