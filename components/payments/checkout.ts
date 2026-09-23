type Checkout = {
  checkout(options: {
    paymentSessionId: string;
    redirectTarget: string;
  }): Promise<{ error?: { message?: string } } | undefined>;
};
declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => Checkout;
  }
}
let loaded: Promise<void> | undefined;
export async function launchCheckout(
  sessionId: string,
  mode: "sandbox" | "production",
) {
  if (!window.Cashfree) {
    loaded ||= new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      const fail = () => {
        clearTimeout(timeout);
        loaded = undefined;
        script.remove();
        reject(new Error("Cashfree checkout couldn’t load. Please try again."));
      };
      const timeout = setTimeout(fail, 15000);
      script.onload = () => {
        if (!window.Cashfree) {
          fail();
          return;
        }
        clearTimeout(timeout);
        resolve();
      };
      script.onerror = fail;
      document.head.appendChild(script);
    });
    await loaded;
  }
  if (!window.Cashfree)
    throw new Error("Cashfree checkout is unavailable. Please try again.");
  const result = await window
    .Cashfree({ mode })
    .checkout({ paymentSessionId: sessionId, redirectTarget: "_self" });
  if (result?.error)
    throw new Error(
      result.error.message ||
        "Cashfree checkout could not open. Please try again.",
    );
}
export const tokenKey = (id: string) => `aproop-contribution:${id}`;
export function saveAccess(id: string, token: string) {
  localStorage.setItem(tokenKey(id), token);
}
export function readAccess(id: string) {
  try {
    return localStorage.getItem(tokenKey(id));
  } catch {
    return null;
  }
}
