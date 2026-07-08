// Optional transactional email via Resend's REST API — no SDK dependency.
//
// Fully inert unless BOTH RESEND_API_KEY and NEFELI_FROM_EMAIL are set, so the
// app (and the cron) run fine with no email configured. Returns whether a
// message was actually sent.

export interface EmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.NEFELI_FROM_EMAIL);
}

export async function sendEmail(input: EmailInput): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NEFELI_FROM_EMAIL;
  if (!key || !from) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
      }),
    });
    if (!res.ok) {
      console.error("sendEmail failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendEmail error:", e);
    return false;
  }
}
