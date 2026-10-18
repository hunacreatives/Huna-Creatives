// Status updates to job applicants: under review, shortlisted (with the interview), or not moving forward.
import { details, esc, hunaEmail, p } from '../_shared/emailLayout.ts';

export type Status = 'reviewing' | 'archived' | 'shortlisted';

function formatInterviewDateTime(date: string, time: string): string {
  // date: "YYYY-MM-DD", time: "HH:MM" — both interpreted as Asia/Manila (PH office time)
  const dt = new Date(`${date}T${time}:00+08:00`);
  const dateLabel = dt.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeLabel = dt.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
  return `${dateLabel} at ${timeLabel} (Philippine Time)`;
}

export function applicantEmail(
  status: Status,
  name: string,
  role: string,
  interview?: { date: string; time: string; link?: string },
): { subject: string; html: string } {
  const first = esc(name.trim().split(' ')[0] || name);
  const r = esc(role);
  const note = 'You’re receiving this because you applied for a role at Huna Creatives.';

  if (status === 'reviewing') {
    return {
      subject: `Your application for ${role} is being reviewed`,
      html: hunaEmail({
        title: `Your application for ${role} is being reviewed`,
        body: [
          p(`Hi ${first},`),
          p(`Thanks for applying for the ${r} position at Huna Creatives. We wanted to let you know that your application is currently under review.`),
          p('We’ll reach out if we’d like to move forward. Thanks for your patience.'),
          p('Huna Creatives'),
        ].join(''),
        note,
      }),
    };
  }

  if (status === 'shortlisted' && interview) {
    const meet = interview.link && /^https:\/\//.test(interview.link) ? interview.link : '';
    return {
      subject: `You're shortlisted for ${role} — Interview scheduled`,
      html: hunaEmail({
        title: `You’re shortlisted for ${role}`,
        body: [
          p(`Hi ${first},`),
          p(`You’ve been shortlisted for the ${r} position at Huna Creatives, and we’d like to schedule an interview with you.`),
          details([['When', `<strong>${esc(formatInterviewDateTime(interview.date, interview.time))}</strong>`], ['Where', meet && 'Google Meet']]),
          p('If this time doesn’t work for you, just reply to this email and we’ll find another slot.'),
          p('Looking forward to speaking with you.'),
          p('Huna Creatives'),
        ].join(''),
        buttons: meet ? [{ label: 'Join on Google Meet', url: esc(meet) }] : [],
        note,
      }),
    };
  }

  return {
    subject: `Update on your application for ${role}`,
    html: hunaEmail({
      title: `Update on your application for ${role}`,
      body: [
        p(`Hi ${first},`),
        p(`Thank you for taking the time to apply for the ${r} position at Huna Creatives, and for your interest in joining our team.`),
        p('Unfortunately, we’ve decided to move forward with another candidate for this position.'),
        p('We’ll keep your application on file. Once we have an opening that’s a good fit, we’ll be sure to reach out.'),
        p('Huna Creatives'),
      ].join(''),
      note,
    }),
  };
}
