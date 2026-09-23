import { z } from "zod";
export const contributionInput = z
  .object({
    projectId: z.string().uuid(),
    requestId: z.string().uuid(),
    accessToken: z.string().regex(/^[a-f0-9]{64}$/),
    amount: z
      .string()
      .regex(
        /^\d{1,7}(?:\.\d{1,2})?$/,
        "Enter an amount in rupees with up to two decimal places.",
      ),
    name: z.string().trim().min(2).max(120),
    email: z
      .string()
      .trim()
      .email()
      .max(200)
      .transform((v) => v.toLowerCase()),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
    creditName: z.string().trim().max(120),
    acceptedTerms: z.literal(true),
    termsVersion: z.string().min(1).max(64),
  })
  .strict();
export type ContributionInput = z.infer<typeof contributionInput>;
export function paise(value: string | number): number {
  const str = String(value);
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(str))
    throw new Error("Invalid monetary amount");
  const [whole, decimal = ""] = str.split(".");
  const result = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(result)) throw new Error("Invalid monetary amount");
  return result;
}
export function closingTime(value: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T23:59:59.999+05:30`);
    return Number.isFinite(date.getTime()) &&
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date) === value
      ? date
      : null;
  }
  const match = value.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})$/,
  );
  if (!match) return null;
  const month = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ].indexOf(match[1]);
  return new Date(Date.UTC(Number(match[2]), month + 1, 1) - 330 * 60000 - 1);
}
export type Campaign = {
  _id: string;
  environment: "sandbox" | "production";
  title: string;
  goalPaise: number;
  openingPaise: number;
  openingBackers: number;
  paidPaise: number;
  refundedPaise: number;
  reservedPaise: number;
  paidCount: number;
  state: "open" | "paused" | "closed";
  published: boolean;
  closesAt: Date;
  minPaise: number;
  maxPaise: number;
  terms: string;
  termsVersion: string;
  fundedAt?: Date;
  updatedAt: Date;
};
export type Contribution = {
  _id: string;
  requestId: string;
  projectId: string;
  projectTitle: string;
  amountPaise: number;
  currency: "INR";
  accessHash: string;
  requestHash: string;
  emailHash: string;
  name: string;
  email: string;
  phone: string;
  creditName: string;
  terms: string;
  termsVersion: string;
  acceptedAt: Date;
  createdAt: Date;
  expiresAt: Date;
  nextCheckAt: Date;
  environment: "sandbox" | "production";
  state:
    | "creating"
    | "pending"
    | "paid"
    | "expired"
    | "refund_pending"
    | "refunded"
    | "review";
  reservationActive: boolean;
  paymentSessionId?: string;
  cfOrderId?: string;
  paymentId?: string;
  paidAt?: Date;
  credited: boolean;
  refundedPaise: number;
  reviewReason?: string;
  lastError?: string;
  providerStatus?: string;
  lastCheckedAt?: Date;
  receiptSentAt?: Date;
};
export type FundingView = {
  projectId: string;
  goalPaise: number;
  raisedPaise: number;
  reservedPaise: number;
  availablePaise: number;
  backers: number;
  status: "setup" | "open" | "paused" | "closed" | "funded" | "reserved";
  minPaise: number;
  maxPaise: number;
  closesAt: string | null;
  terms: string;
  termsVersion: string;
  checkoutAvailable: boolean;
  mode: "sandbox" | "production";
};
export function campaignView(
  c: Campaign,
  ready: boolean,
  mode: "sandbox" | "production",
  now = new Date(),
): FundingView {
  const raised = c.openingPaise + c.paidPaise - c.refundedPaise;
  const available = Math.max(0, c.goalPaise - raised - c.reservedPaise);
  const funded = !!c.fundedAt || raised >= c.goalPaise;
  const status = funded
    ? "funded"
    : !c.published || c.state === "closed" || c.closesAt <= now
      ? "closed"
      : c.state === "paused"
        ? "paused"
        : available === 0
          ? "reserved"
          : "open";
  return {
    projectId: c._id,
    goalPaise: c.goalPaise,
    raisedPaise: raised,
    reservedPaise: c.reservedPaise,
    availablePaise: available,
    backers: c.openingBackers + c.paidCount,
    status,
    minPaise: Math.max(100, Math.min(c.minPaise, available)),
    maxPaise: Math.min(c.maxPaise, available),
    closesAt: c.closesAt.toISOString(),
    terms: c.terms,
    termsVersion: c.termsVersion,
    checkoutAvailable:
      ready &&
      c.environment === mode &&
      status === "open" &&
      available >= 100 &&
      c.closesAt.getTime() - now.getTime() >= 5 * 60 * 1000,
    mode,
  };
}
