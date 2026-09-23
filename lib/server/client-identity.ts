import { isIP } from "node:net";

export function clientIdentity(headers: Headers, vercel: boolean, trustedHeader?: string) {
  // Opt into a proxy header only when the ingress overwrites it and cannot be bypassed.
  const header = vercel ? "x-vercel-forwarded-for" : trustedHeader;
  const value = header ? headers.get(header)?.trim() : undefined;
  if (!value || !isIP(value)) return "unknown";
  return isIP(value) === 6 ? new URL(`http://[${value}]/`).hostname : value;
}
