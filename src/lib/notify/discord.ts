// Optional Discord webhook posting — inert unless DISCORD_WEBHOOK_URL is set,
// so the app and cron run fine without it. Returns whether a message was sent.

export function discordEnabled(): boolean {
  return Boolean(process.env.DISCORD_WEBHOOK_URL);
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  footer?: { text: string };
}

export async function postToDiscord(payload: { content?: string; embeds?: DiscordEmbed[] }): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "NEFELI", ...payload }),
    });
    if (!res.ok) {
      console.error("postToDiscord failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("postToDiscord error:", e);
    return false;
  }
}
