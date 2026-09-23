import { contributionStatus, publicContribution } from "@/lib/payments/service";
import { failure, HttpError, json } from "@/lib/admin/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await params;
    if (!/^aproop_[a-f0-9]{32}$/.test(orderId))
      throw new HttpError("Contribution not found.", 404);
    return json(
      publicContribution(
        await contributionStatus(
          orderId,
          request.headers.get("authorization")?.replace(/^Bearer /, "") || "",
        ),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
