/**
 * Shared shape and formatting for the two enquiry forms — the one in the
 * Contact section and the pitch modal on /be-the-producer. Both post the same
 * payload to /api/contact; `source` is what tells them apart in the inbox.
 */

export type Source = "contact" | "pitch";

export type Enquiry = {
  name: string;
  email: string;
  kind: string;
  note: string;
  source: Source;
};

/** Caps that keep a hostile payload from turning into a huge email. */
const LIMITS: Record<keyof Enquiry, number> = {
  name: 120,
  email: 200,
  kind: 80,
  note: 4000,
  source: 16,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validates and trims an untrusted body. Returns the clean enquiry, or the
 * first problem found so the form can say something useful.
 */
export function parseEnquiry(
  body: unknown,
): { ok: true; value: Enquiry } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Malformed request." };
  }
  const raw = body as Record<string, unknown>;

  const str = (k: keyof Enquiry) =>
    (typeof raw[k] === "string" ? raw[k] : "").trim().slice(0, LIMITS[k]);

  const name = str("name");
  const email = str("email");
  const kind = str("kind") || "Not specified";
  const note = str("note");
  const source: Source = raw.source === "pitch" ? "pitch" : "contact";

  if (!name) return { ok: false, error: "Please add your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please check your email address." };

  return { ok: true, value: { name, email, kind, note, source } };
}

export function subjectFor(e: Enquiry) {
  const lead = e.source === "pitch" ? "Pitch" : "Enquiry";
  return `${lead} — ${e.kind} — ${e.name}`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function textFor(e: Enquiry) {
  return [
    `From:  ${e.name} <${e.email}>`,
    `Type:  ${e.kind}`,
    `Form:  ${e.source === "pitch" ? "Be the Producer — pitch modal" : "Contact section"}`,
    "",
    e.note || "(no message)",
    "",
    "— Reply to this email to answer them directly.",
  ].join("\n");
}

export function htmlFor(e: Enquiry) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#8a8378;font:500 12px/1.6 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.12em;vertical-align:top">${k}</td>` +
    `<td style="padding:4px 0;color:#141414;font:400 15px/1.6 system-ui,sans-serif">${v}</td></tr>`;

  return `<div style="max-width:640px;margin:0 auto;padding:28px">
  <div style="font:600 12px/1.6 system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#a8781c;margin-bottom:18px">
    Aproop Production — new ${e.source === "pitch" ? "pitch" : "enquiry"}
  </div>
  <table style="border-collapse:collapse;margin-bottom:22px">
    ${row("Name", esc(e.name))}
    ${row("Email", `<a href="mailto:${esc(e.email)}" style="color:#a8781c">${esc(e.email)}</a>`)}
    ${row("Type", esc(e.kind))}
    ${row("Form", e.source === "pitch" ? "Be the Producer — pitch modal" : "Contact section")}
  </table>
  <div style="border-left:3px solid #d9b23c;padding:2px 0 2px 16px;color:#141414;font:400 15px/1.75 system-ui,sans-serif;white-space:pre-wrap">${
    esc(e.note) || "<em style='color:#8a8378'>(no message)</em>"
  }</div>
  <div style="margin-top:24px;color:#8a8378;font:400 12px/1.6 system-ui,sans-serif">
    Reply to this email to answer them directly.
  </div>
</div>`;
}
