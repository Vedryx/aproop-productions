import type { Source } from "../contact";
import { decodeAcknowledgement, requestJson } from "./http";

export type EnquirySubmission = {
  name: string; email: string; kind: string; note: string; source: Source;
  website: string; t: number;
};

export function submitEnquiry(payload: EnquirySubmission, idempotencyKey: string) {
  return requestJson("/api/contact", {
    method: "POST", json: payload, headers: { "Idempotency-Key": idempotencyKey },
  }, decodeAcknowledgement);
}
