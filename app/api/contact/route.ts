import { Resend } from "resend";
import { parseEnquiry, subjectFor, textFor, htmlFor } from "@/lib/contact";

/**
 * Receives both enquiry forms and mails them to the studio.
 *
 * The rest of the site is static; this is the one route that runs per request,
 * so it is deliberately dependency-light and never touches a database.
 */

// Until the domain is verified in Resend, `onboarding@resend.dev` is the only
// address that can send, and only to the account owner's own mailbox — which
// here is the destination anyway. Set CONTACT_FROM once DNS is in place.
const FROM = process.env.CONTACT_FROM || "Aproop Production <onboarding@resend.dev>";
const TO = process.env.CONTACT_TO || "aproop.production22@gmail.com";

/**
 * Best-effort flood control. Serverless instances are ephemeral and there may
 * be several, so this is not a real quota — it only blunts a naive loop from
 * one address. The honeypot below does the heavier lifting.
 */
const HITS = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (HITS.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  HITS.set(ip, recent);
  if (HITS.size > 500) HITS.clear(); // bound the map on a long-lived instance
  return recent.length > MAX_PER_WINDOW;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Malformed request." }, 400);
  }

  const raw = (body ?? {}) as Record<string, unknown>;

  // Bots fill every field they find, and they submit instantly. Both cases get
  // a success response: telling a bot why it failed only helps it try again.
  const trapped =
    (typeof raw.website === "string" && raw.website.trim() !== "") ||
    (typeof raw.t === "number" && Date.now() - raw.t < 2000);
  if (trapped) return json({ ok: true });

  const parsed = parseEnquiry(body);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return json({ ok: false, error: "Too many messages just now. Try again shortly." }, 429);
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[contact] RESEND_API_KEY is not set — enquiry dropped");
    return json({ ok: false, error: "Mail is not configured yet." }, 500);
  }

  const enquiry = parsed.value;

  try {
    const { error } = await new Resend(key).emails.send({
      from: FROM,
      to: [TO],
      // So the studio can hit reply and reach the sender, not the robot.
      replyTo: `${enquiry.name} <${enquiry.email}>`,
      subject: subjectFor(enquiry),
      text: textFor(enquiry),
      html: htmlFor(enquiry),
    });

    if (error) {
      console.error("[contact] resend rejected the send:", error);
      return json({ ok: false, error: "We couldn't send that. Please email us directly." }, 502);
    }
  } catch (err) {
    console.error("[contact] send threw:", err);
    return json({ ok: false, error: "We couldn't send that. Please email us directly." }, 502);
  }

  return json({ ok: true });
}
