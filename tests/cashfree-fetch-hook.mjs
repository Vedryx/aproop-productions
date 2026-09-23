// Node test preload: substitutes only the sandbox host. Never included in deploys.
const fetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (url.startsWith("https://sandbox.cashfree.com/pg/"))
    return fetch(
      "http://127.0.0.1:3199" +
        url.slice("https://sandbox.cashfree.com".length),
      options,
    );
  return fetch(input, options);
};
