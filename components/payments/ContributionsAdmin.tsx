"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fmtINR } from "@/lib/producer";
type Row = {
  orderId: string;
  projectTitle: string;
  amountPaise: number;
  refundedPaise: number;
  name: string;
  email: string;
  creditName: string;
  state: string;
  createdAt: string;
  paymentId?: string;
  reservationActive: boolean;
  reviewReason?: string;
  environment: string;
};
type Campaign = {
  _id: string;
  title: string;
  openingPaise: number;
  paidPaise: number;
  refundedPaise: number;
  reservedPaise: number;
  goalPaise: number;
  fundedAt?: string;
  state: string;
  closesAt: string;
};
type Data = {
  rows: Row[];
  total: number;
  campaigns: Campaign[];
  ready: boolean;
  mode: string;
  openingPolicy: string;
};
export default function ContributionsAdmin() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/contributions?page=${page}`, {
      cache: "no-store",
    });
    if (response.status === 401) {
      router.replace("/admin/login");
      throw new Error("Please sign in again.");
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result as Data;
  }, [page, router]);
  useEffect(() => {
    load()
      .then(setData)
      .catch((e) => setError(e.message));
  }, [load]);
  async function reconcile(orderId?: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderId ? { orderId } : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(await load());
      setNotice(
        `Checked ${result.checked} contribution${result.checked === 1 ? "" : "s"} with Cashfree.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }
  function exportCsv() {
    if (!data) return;
    const escape = (v: unknown) =>
      `"${String(v ?? "")
        .replace(/^[\s]*[=+@-]/, "'$&")
        .replaceAll('"', '""')}"`;
    const rows = [
      [
        "Reference",
        "Project",
        "Name",
        "Email",
        "Credit name",
        "Amount INR",
        "Refunded INR",
        "State",
        "Created",
        "Cashfree payment",
      ],
      ...data.rows.map((r) => [
        r.orderId,
        r.projectTitle,
        r.name,
        r.email,
        r.creditName,
        r.amountPaise / 100,
        r.refundedPaise / 100,
        r.state,
        r.createdAt,
        r.paymentId,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((r) => r.map(escape).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `aproop-contributions-page-${page + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="payment-admin">
      <header>
        <div>
          <a href="/admin">← Content admin</a>
          <h1>Contributions & payments</h1>
          <p>Verified payments, reserved checkouts, and refunds.</p>
        </div>
        <button disabled={busy || !data?.ready} onClick={() => reconcile()}>
          {busy ? "Checking…" : "Check pending payments"}
        </button>
      </header>
      {data && (
        <p className="payment-note">
          {data.mode === "sandbox"
            ? "Sandbox · test payments"
            : "Production payments"}{" "}
          · {data.ready ? "Cashfree configured" : "Cashfree is not enabled"} ·
          Opening balances: {data.openingPolicy}
        </p>
      )}
      {error && (
        <p role="alert" className="payment-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="payment-campaigns">
        {data?.campaigns.map((c) => (
          <article key={c._id}>
            <h2>{c.title}</h2>
            <p>
              {c.fundedAt
                ? "Fully funded · closed to new contributions"
                : new Date(c.closesAt) < new Date()
                  ? "Closing date passed"
                  : c.state}
            </p>
            <strong>
              {fmtINR((c.openingPaise + c.paidPaise - c.refundedPaise) / 100)} /{" "}
              {fmtINR(c.goalPaise / 100)}
            </strong>
            <p>
              Opening funds: {fmtINR(c.openingPaise / 100)}
              <br />
              Checkouts in progress: {fmtINR(c.reservedPaise / 100)}
              <br />
              Confirmed refunds: {fmtINR(c.refundedPaise / 100)}
            </p>
          </article>
        ))}
      </div>
      <p>
        Refunds for cancellation or other agreed reasons can be issued in the
        Cashfree dashboard. Use “Verify” afterwards to sync them. Fully funded
        projects remain closed after refunds.
      </p>
      <div className="payment-admin-nav">
        <span>{data?.total ?? 0} contributions</span>
        <button disabled={!data?.rows.length} onClick={exportCsv}>
          Export this page (CSV)
        </button>
      </div>
      <div className="payment-ledger">
        <table>
          <thead>
            <tr>
              <th>Project / reference</th>
              <th>Supporter</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((r) => (
              <tr key={r.orderId}>
                <td>
                  {r.projectTitle}
                  <small>{r.orderId}</small>
                  {r.paymentId && <small>Cashfree: {r.paymentId}</small>}
                </td>
                <td>
                  {r.name}
                  <small>{r.email}</small>
                  <small>Credit: {r.creditName}</small>
                </td>
                <td>
                  {fmtINR(r.amountPaise / 100)}
                  {r.refundedPaise > 0 && (
                    <small>Refunded {fmtINR(r.refundedPaise / 100)}</small>
                  )}
                </td>
                <td>
                  {r.state.replaceAll("_", " ")}
                  {r.reservationActive && <small>Amount reserved</small>}
                  {r.reviewReason && <small>{r.reviewReason}</small>}
                  <small>{r.environment}</small>
                </td>
                <td>
                  {new Date(r.createdAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST
                </td>
                <td>
                  <button
                    disabled={busy || !data.ready}
                    onClick={() => reconcile(r.orderId)}
                  >
                    Verify
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && !data.rows.length && (
        <p>
          No contributions yet. Enable fundraising in a story’s Funding step
          once its terms and closing date are ready.
        </p>
      )}
      <div className="payment-admin-nav">
        <button
          disabled={page === 0 || busy}
          onClick={() => setPage((v) => v - 1)}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          disabled={!data || (page + 1) * 30 >= data.total || busy}
          onClick={() => setPage((v) => v + 1)}
        >
          Next
        </button>
      </div>
    </main>
  );
}
