// Deterministic provider double. Imported only by tests, never by application code.
export class CashfreeMock {
  orders = new Map();
  payments = new Map();
  refunds = new Map();
  createCalls = 0;
  refundCalls = 0;
  terminationPending = false;
  loseCreateResponse = false;
  clear() {
    this.orders.clear();
    this.payments.clear();
    this.refunds.clear();
    this.createCalls = 0;
    this.refundCalls = 0;
    this.terminationPending = false;
    this.loseCreateResponse = false;
  }
  pay(id, overrides = {}) {
    const o = this.orders.get(id);
    if (!o) throw Error("Order missing");
    o.order_status = "PAID";
    this.payments.set(id, [
      {
        order_id: id,
        cf_payment_id: `payment_${id}`,
        payment_status: "SUCCESS",
        payment_amount: o.order_amount,
        payment_currency: o.order_currency,
        is_captured: true,
        ...overrides,
      },
    ]);
  }
  handle(method, path, body) {
    const parts = path.split("/").filter(Boolean);
    if (parts[0] === "pg") parts.shift();
    if (method === "POST" && parts.length === 1 && parts[0] === "orders") {
      this.createCalls++;
      if (!this.orders.has(body.order_id)) {
        this.orders.set(body.order_id, {
          ...body,
          cf_order_id: `cf_${body.order_id}`,
          order_status: "ACTIVE",
          payment_session_id: `session_${body.order_id}`,
        });
        this.payments.set(body.order_id, []);
        this.refunds.set(body.order_id, []);
      }
      if (this.loseCreateResponse) {
        this.loseCreateResponse = false;
        throw new DOMException("Lost response", "TimeoutError");
      }
      return { status: 200, body: this.orders.get(body.order_id) };
    }
    const id = parts[1],
      order = this.orders.get(id);
    if (!order) return { status: 404, body: { message: "Order not found" } };
    if (parts[2] === "payments")
      return { status: 200, body: this.payments.get(id) || [] };
    if (parts[2] === "refunds") {
      if (method === "POST") {
        this.refundCalls++;
        const all = this.refunds.get(id) || [];
        if (!all.some((r) => r.refund_id === body.refund_id))
          all.push({
            ...body,
            cf_refund_id: `cf_${body.refund_id}`,
            order_id: id,
            refund_status: "SUCCESS",
            refund_currency: "INR",
          });
        this.refunds.set(id, all);
        return {
          status: 200,
          body: all.find((r) => r.refund_id === body.refund_id),
        };
      }
      return { status: 200, body: this.refunds.get(id) || [] };
    }
    if (method === "PATCH" && order.order_status !== "PAID")
      order.order_status = this.terminationPending
        ? "TERMINATION_REQUESTED"
        : "TERMINATED";
    return { status: 200, body: order };
  }
}
