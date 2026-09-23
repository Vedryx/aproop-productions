import http from "node:http";
import { CashfreeMock } from "./cashfree-mock.mjs";
const mock = new CashfreeMock();
http
  .createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const text = Buffer.concat(chunks).toString();
      const body = text ? JSON.parse(text) : undefined;
      let result;
      if (req.url === "/health") result = { status: 200, body: { ok: true } };
      else if (req.url === "/__test/reset") {
        mock.clear();
        result = { status: 200, body: { ok: true } };
      } else if (req.url === "/__test/pay") {
        mock.pay(body.orderId);
        result = { status: 200, body: { ok: true } };
      } else if (req.url === "/__test/fail") {
        mock.payments.set(body.orderId, [
          { order_id: body.orderId, payment_status: "FAILED" },
        ]);
        result = { status: 200, body: { ok: true } };
      } else
        result = mock.handle(
          req.method,
          new URL(req.url, "http://localhost").pathname,
          body,
        );
      res.writeHead(result.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result.body));
    } catch {
      res.writeHead(500);
      res.end("{}");
    }
  })
  .listen(3199, "127.0.0.1", () =>
    console.log("Cashfree test double listening on 3199"),
  );
