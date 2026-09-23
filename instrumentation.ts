import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = (_error, _request, context) => {
  // Framework-provided route templates are safe; raw request paths, query strings,
  // error messages and headers can include customer input or credentials.
  console.error("[server] Unhandled request failure", {
    route: context.routePath, type: context.routeType,
  });
};
