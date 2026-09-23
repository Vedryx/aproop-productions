import { database } from "@/lib/admin/db";
import { createContactStore, type ContactStore } from "@/lib/contact/store";
import { createContactHandler } from "@/lib/contact/handler";
import { deliverEmail } from "@/lib/contact/delivery";

export const runtime = "nodejs";
export const maxDuration = 60;

// Initialize TTL indexes once per server instance; retry initialization on failure.
let store: Promise<ContactStore> | undefined;
function getStore() {
  return store ??= database().then(createContactStore).catch((error) => {
    store = undefined;
    throw error;
  });
}

export const POST = createContactHandler({
  store: getStore,
  configured: () => !!process.env.RESEND_API_KEY,
  send: (payload, id) => deliverEmail(payload, id, process.env.RESEND_API_KEY!),
  from: process.env.CONTACT_FROM || "Aproop Production <onboarding@resend.dev>",
  to: process.env.CONTACT_TO || "aproop.production22@gmail.com",
  origin: process.env.APP_ORIGIN,
  vercel: process.env.VERCEL === "1",
  trustedIpHeader: process.env.TRUSTED_IP_HEADER || process.env.CONTACT_TRUSTED_IP_HEADER,
});
