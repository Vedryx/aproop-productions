import "server-only";
import { HttpError } from "@/lib/admin/http";
import {
  collections,
  transaction,
  hash,
  privateHash,
  allowCheckout,
} from "./store";
import {
  campaignView,
  paise,
  type ContributionInput,
  type Contribution,
} from "./model";
import { paymentConfig, paymentMode, paymentReady } from "./config";
import {
  createOrder,
  getOrder,
  getPayments,
  getRefunds,
  terminateOrder,
  refundUnallocated,
  ProviderError,
  type ProviderOrder,
} from "./provider";

function authorize(c: Contribution, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token) || c.accessHash !== hash(token))
    throw new HttpError(
      "This contribution could not be accessed from this browser.",
      403,
    );
}
function validateOrder(c: Contribution, o: ProviderOrder) {
  if (
    !o.cf_order_id ||
    ![
      "ACTIVE",
      "PAID",
      "EXPIRED",
      "TERMINATED",
      "TERMINATION_REQUESTED",
    ].includes(o.order_status) ||
    o.order_id !== c._id ||
    o.order_currency !== "INR" ||
    paise(o.order_amount) !== c.amountPaise ||
    (c.cfOrderId && c.cfOrderId !== String(o.cf_order_id))
  )
    throw new Error("Provider order identity/amount mismatch");
}
async function holdForReview(id: string, reason: string) {
  const { contributions } = await collections();
  const c = await contributions.findOne({ _id: id });
  await contributions.updateOne(
    { _id: id },
    {
      $set: {
        ...(!c?.paymentId ? { state: "review" as const } : {}),
        reviewReason: reason,
        nextCheckAt: new Date(Date.now() + 3600000),
      },
    },
  );
}
export async function beginContribution(input: ContributionInput, ip: string) {
  paymentConfig();
  const { contributions, campaigns } = await collections();
  const id = `aproop_${input.requestId.replaceAll("-", "")}`,
    existing = await contributions.findOne({ _id: id });
  const requestHash = hash(JSON.stringify(input));
  if (existing) {
    authorize(existing, input.accessToken);
    if (existing.requestHash !== requestHash)
      throw new HttpError(
        "This checkout request was already used with different details. Start a new contribution.",
        409,
      );
    return ensureOrder(existing);
  }
  await allowCheckout(ip, input.email);
  const amount = paise(input.amount);
  if (amount < 100)
    throw new HttpError(
      "Enter an amount of at least ₹1 with up to two decimal places.",
      400,
    );
  let contribution: Contribution;
  try {
    contribution = await transaction(async (session) => {
      const duplicate = await contributions.findOne({ _id: id }, { session });
      if (duplicate) {
        authorize(duplicate, input.accessToken);
        if (duplicate.requestHash !== requestHash)
          throw new HttpError("Checkout details changed. Start again.", 409);
        return duplicate;
      }
      const campaign = await campaigns.findOne(
        { _id: input.projectId },
        { session },
      );
      if (!campaign)
        throw new HttpError(
          "This project is not accepting online contributions yet.",
          409,
        );
      const view = campaignView(campaign, paymentReady(), paymentMode());
      if (!view.checkoutAvailable)
        throw new HttpError(
          view.status === "funded"
            ? "This project is fully funded. Thank you!"
            : view.status === "reserved"
              ? "The remaining funds are reserved by checkouts in progress. Please check again shortly."
              : "This project is not accepting new contributions.",
          409,
        );
      if (input.termsVersion !== campaign.termsVersion)
        throw new HttpError(
          "The contribution terms changed. Refresh and review them before continuing.",
          409,
        );
      if (amount < view.minPaise || amount > view.maxPaise)
        throw new HttpError(
          `Choose an amount between ₹${view.minPaise / 100} and ₹${view.maxPaise / 100}.`,
          409,
        );
      const now = new Date(),
        expiresAt = new Date(
          Math.min(now.getTime() + 15 * 60000, campaign.closesAt.getTime()),
        );
      const c: Contribution = {
        _id: id,
        requestId: input.requestId,
        projectId: input.projectId,
        projectTitle: campaign.title,
        amountPaise: amount,
        currency: "INR",
        accessHash: hash(input.accessToken),
        requestHash,
        emailHash: privateHash(input.email),
        name: input.name,
        email: input.email,
        phone: input.phone,
        creditName: input.creditName || input.name,
        terms: campaign.terms,
        termsVersion: campaign.termsVersion,
        acceptedAt: now,
        createdAt: now,
        expiresAt,
        nextCheckAt: new Date(now.getTime() + 60000),
        environment: paymentMode(),
        state: "creating",
        reservationActive: true,
        credited: false,
        refundedPaise: 0,
      };
      await campaigns.updateOne(
        { _id: campaign._id },
        { $inc: { reservedPaise: amount }, $set: { updatedAt: now } },
        { session },
      );
      await contributions.insertOne(c, { session });
      return c;
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      const duplicate = await contributions.findOne({ _id: id });
      if (duplicate) {
        authorize(duplicate, input.accessToken);
        if (duplicate.requestHash === requestHash)
          return ensureOrder(duplicate);
      }
      throw new HttpError(
        "A checkout for this email and project is already in progress. Resume it or wait for it to close.",
        409,
      );
    }
    throw error;
  }
  return ensureOrder(contribution);
}
export async function ensureOrder(c: Contribution): Promise<Contribution> {
  const { contributions } = await collections();
  if (c.environment !== paymentMode())
    throw new HttpError(
      "This contribution belongs to a different payment environment.",
      409,
    );
  if (!c.reservationActive || c.paymentSessionId) return c;
  try {
    let order: ProviderOrder;
    try {
      order = await getOrder(c._id);
    } catch (e) {
      if (!(e instanceof ProviderError) || e.status !== 404) throw e;
      // Never create a new provider order too close to or after its fixed expiry.
      if (c.expiresAt.getTime() - Date.now() < 5 * 60000) return c;
      order = await createOrder(c);
    }
    validateOrder(c, order);
    await contributions.updateOne(
      { _id: c._id, state: { $in: ["creating", "pending"] } },
      {
        $set: {
          state: "pending",
          cfOrderId: String(order.cf_order_id),
          ...(order.payment_session_id
            ? { paymentSessionId: order.payment_session_id }
            : {}),
          providerStatus: order.order_status,
          lastCheckedAt: new Date(),
        },
        $unset: { lastError: "" },
      },
    );
  } catch (e) {
    await contributions.updateOne(
      { _id: c._id },
      {
        $set: {
          lastError:
            e instanceof ProviderError
              ? `provider_http_${e.status}`
              : "provider_unconfirmed",
          nextCheckAt: new Date(Date.now() + 60000),
        },
      },
    );
  }
  return (await contributions.findOne({ _id: c._id }))!;
}
async function release(id: string, providerStatus: string) {
  const { contributions, campaigns } = await collections();
  await transaction(async (session) => {
    const c = await contributions.findOne({ _id: id }, { session });
    if (!c?.reservationActive || c.paymentId) return;
    await campaigns.updateOne(
      { _id: c.projectId },
      {
        $inc: { reservedPaise: -c.amountPaise },
        $set: { updatedAt: new Date() },
      },
      { session },
    );
    await contributions.updateOne(
      { _id: id },
      {
        $set: {
          reservationActive: false,
          state: "expired",
          providerStatus,
          lastCheckedAt: new Date(),
          nextCheckAt: new Date(Date.now() + 86400000),
        },
      },
      { session },
    );
  });
}
async function acceptPayment(id: string, paymentId: string) {
  const { contributions, campaigns } = await collections();
  await transaction(async (session) => {
    const c = await contributions.findOne({ _id: id }, { session });
    if (!c) return;
    if (c.paymentId) {
      if (c.paymentId !== paymentId)
        throw new Error("More than one successful provider payment");
      return;
    }
    const campaign = await campaigns.findOne({ _id: c.projectId }, { session });
    if (!campaign) throw new Error("Payment campaign missing");
    const fits =
      c.reservationActive &&
      campaign.openingPaise +
        campaign.paidPaise -
        campaign.refundedPaise +
        c.amountPaise <=
        campaign.goalPaise;
    const now = new Date();
    if (fits) {
      const priorBacker = await contributions.findOne(
        {
          projectId: c.projectId,
          emailHash: c.emailHash,
          credited: true,
          $expr: { $lt: ["$refundedPaise", "$amountPaise"] },
        },
        { session },
      );
      const reached =
        campaign.openingPaise +
          campaign.paidPaise -
          campaign.refundedPaise +
          c.amountPaise >=
        campaign.goalPaise;
      await campaigns.updateOne(
        { _id: campaign._id },
        {
          $inc: {
            paidPaise: c.amountPaise,
            reservedPaise: -c.amountPaise,
            paidCount: priorBacker ? 0 : 1,
          },
          $set: {
            updatedAt: now,
            ...(reached && !campaign.fundedAt ? { fundedAt: now } : {}),
          },
        },
        { session },
      );
    } else if (c.reservationActive)
      await campaigns.updateOne(
        { _id: campaign._id },
        { $inc: { reservedPaise: -c.amountPaise } },
        { session },
      );
    await contributions.updateOne(
      { _id: id },
      {
        $set: {
          paymentId,
          paidAt: now,
          credited: fits,
          reservationActive: false,
          state: fits ? "paid" : "refund_pending",
          providerStatus: "PAID",
          lastCheckedAt: now,
          nextCheckAt: new Date(now.getTime() + 86400000),
          ...(!fits
            ? {
                reviewReason:
                  "Payment arrived without available reserved capacity; automatic refund required.",
              }
            : {}),
        },
      },
      { session },
    );
  });
}
async function syncRefunds(c: Contribution) {
  const refunds = await getRefunds(c._id);
  if (!Array.isArray(refunds)) throw new Error("Invalid refund response");
  const successes = refunds.filter((r) => r.refund_status === "SUCCESS");
  const unique = new Map(successes.map((r) => [r.cf_refund_id, r]));
  let total = 0;
  for (const r of unique.values()) {
    if (r.order_id !== c._id || r.refund_currency !== "INR" || !r.cf_refund_id)
      throw new Error("Refund identity mismatch");
    total += paise(r.refund_amount);
  }
  if (total > c.amountPaise)
    throw new Error("Refund amount exceeds contribution");
  const { contributions, campaigns, db } = await collections();
  await transaction(async (session) => {
    const current = await contributions.findOne({ _id: c._id }, { session });
    if (!current) return;
    // Partial/out-of-order refund responses never roll an acknowledged refund back.
    const delta = Math.max(0, total - current.refundedPaise);
    for (const r of unique.values())
      await db
        .collection<{
          _id: string;
          orderId: string;
          amountPaise: number;
          recordedAt: Date;
        }>("payment_refunds")
        .updateOne(
          { _id: String(r.cf_refund_id) },
          {
            $setOnInsert: {
              orderId: c._id,
              amountPaise: paise(r.refund_amount),
              recordedAt: new Date(),
            },
          },
          { upsert: true, session },
        );
    const otherBacker =
      total === c.amountPaise
        ? await contributions.findOne(
            {
              _id: { $ne: c._id },
              projectId: c.projectId,
              emailHash: current.emailHash,
              credited: true,
              $expr: { $lt: ["$refundedPaise", "$amountPaise"] },
            },
            { session },
          )
        : null;
    if (delta && current.credited)
      await campaigns.updateOne(
        { _id: c.projectId },
        {
          $inc: {
            refundedPaise: delta,
            ...(total === c.amountPaise && !otherBacker
              ? { paidCount: -1 }
              : {}),
          },
          $set: { updatedAt: new Date() },
        },
        { session },
      );
    if (delta)
      await contributions.updateOne(
        { _id: c._id },
        {
          $set: {
            refundedPaise: total,
            ...(total === c.amountPaise ? { state: "refunded" } : {}),
          },
        },
        { session },
      );
  });
}
export async function reconcileOrder(id: string) {
  const { contributions } = await collections();
  let c = await contributions.findOne({ _id: id });
  if (!c) return null;
  if (c.environment !== paymentMode())
    throw new Error("Wrong payment environment");
  if (!paymentReady()) return c;
  try {
    if (c.state === "creating") c = await ensureOrder(c);
    let order: ProviderOrder;
    try {
      order = await getOrder(id);
    } catch (error) {
      if (
        error instanceof ProviderError &&
        error.status === 404 &&
        c.expiresAt.getTime() + 60000 < Date.now() &&
        !c.cfOrderId
      ) {
        await release(id, "NOT_CREATED");
        return await contributions.findOne({ _id: id });
      }
      throw error;
    }
    validateOrder(c, order);
    let payments = await getPayments(id);
    if (!Array.isArray(payments)) throw new Error("Invalid payment response");
    let success = payments.filter((p) => p.payment_status === "SUCCESS");
    if (success.length > 1)
      throw new Error("Multiple successful payments need review");
    if (success.length === 1) {
      const p = success[0];
      if (
        p.order_id !== id ||
        p.payment_currency !== "INR" ||
        paise(p.payment_amount) !== c.amountPaise ||
        !p.cf_payment_id ||
        p.is_captured === false
      )
        throw new Error("Payment identity/amount mismatch");
      await acceptPayment(id, String(p.cf_payment_id));
    } else if (c.reservationActive && c.expiresAt <= new Date()) {
      if (
        order.order_status !== "TERMINATED" &&
        order.order_status !== "PAID"
      ) {
        try {
          order = await terminateOrder(id);
          validateOrder(c, order);
        } catch {
          /* Keep the reservation if termination is uncertain. */
        }
      }
      if (order.order_status === "TERMINATED") await release(id, "TERMINATED");
      else if (
        order.order_status === "EXPIRED" &&
        c.expiresAt.getTime() + 25 * 3600000 < Date.now()
      ) {
        // Cashfree TTL is at most 24 hours; fetch again after that horizon.
        payments = await getPayments(id);
        success = payments.filter((p) => p.payment_status === "SUCCESS");
        if (
          !success.length &&
          payments.every((p) =>
            ["FAILED", "USER_DROPPED", "VOID", "CANCELLED"].includes(
              p.payment_status,
            ),
          )
        )
          await release(id, "EXPIRED");
      }
    }
    c = (await contributions.findOne({ _id: id }))!;
    if (c.paymentId) {
      await syncRefunds(c);
      c = (await contributions.findOne({ _id: id }))!;
      if (c.state === "refund_pending" && !c.credited) {
        await refundUnallocated(c);
        await syncRefunds(c);
      }
    }
    await contributions.updateOne(
      { _id: id },
      {
        $set: {
          providerStatus: order.order_status,
          lastCheckedAt: new Date(),
          nextCheckAt: new Date(
            Date.now() + (c.reservationActive ? 60000 : 86400000),
          ),
        },
        $unset: { lastError: "" },
      },
    );
  } catch (error) {
    if (
      error instanceof ProviderError ||
      (error instanceof Error &&
        ["TimeoutError", "AbortError", "TypeError"].includes(error.name))
    ) {
      await contributions.updateOne(
        { _id: id },
        {
          $set: {
            lastError: "provider_unavailable",
            nextCheckAt: new Date(Date.now() + 60000),
          },
        },
      );
    } else
      await holdForReview(
        id,
        "Payment reconciliation needs administrator review.",
      );
  }
  return await contributions.findOne({ _id: id });
}
export async function contributionStatus(
  id: string,
  token: string,
  refresh = true,
) {
  const { contributions } = await collections();
  const c = await contributions.findOne({ _id: id });
  if (!c) throw new HttpError("Contribution not found.", 404);
  authorize(c, token);
  return refresh &&
    (!c.lastCheckedAt || Date.now() - c.lastCheckedAt.getTime() > 5000)
    ? (await reconcileOrder(id))!
    : c;
}
export function publicContribution(c: Contribution) {
  return {
    orderId: c._id,
    projectId: c.projectId,
    projectTitle: c.projectTitle,
    amountPaise: c.amountPaise,
    refundedPaise: c.refundedPaise,
    status: c.state,
    mode: c.environment,
    expiresAt: c.expiresAt.toISOString(),
    paymentId: c.paymentId || null,
    canRetry:
      c.reservationActive &&
      c.expiresAt > new Date() &&
      c.state !== "review" &&
      c.providerStatus === "ACTIVE",
    paymentSessionId:
      c.reservationActive &&
      c.expiresAt > new Date() &&
      c.state !== "review" &&
      c.providerStatus === "ACTIVE"
        ? c.paymentSessionId
        : null,
  };
}
export async function reconcileBatch(projectId?: string, limit = 10) {
  if (!paymentReady()) return 0;
  const { contributions } = await collections();
  const rows = await contributions
    .find({
      environment: paymentMode(),
      ...(projectId
        ? { projectId, reservationActive: true, expiresAt: { $lt: new Date() } }
        : { nextCheckAt: { $lte: new Date() } }),
    })
    .sort({ nextCheckAt: 1 })
    .limit(limit)
    .toArray();
  for (let i = 0; i < rows.length; i += 3)
    await Promise.all(rows.slice(i, i + 3).map((c) => reconcileOrder(c._id)));
  return rows.length;
}
