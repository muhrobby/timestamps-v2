import { applySecurityHeaders, validateOrigin } from "../utils/security";

/**
 * Server middleware to apply security headers to all responses
 */
export default defineEventHandler((event) => {
  // Apply security headers
  applySecurityHeaders(event);

  // Set CORS headers for API routes
  const path = getRequestPath(event);
  if (path.startsWith("/api/")) {
    const config = useRuntimeConfig();
    const originsConfig = config.public.allowedOrigins as string | undefined;
    const allowedOrigins = originsConfig ? originsConfig.split(",") : ["*"];

    // Handle preflight requests
    if (event.method === "OPTIONS") {
      setHeader(event, "Access-Control-Allow-Origin", allowedOrigins[0] || "*");
      setHeader(
        event,
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      setHeader(
        event,
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, X-CSRF-Token"
      );
      setHeader(event, "Access-Control-Allow-Credentials", "true");
      setResponseHeader(event, "Access-Control-Max-Age", 86400);

      // Return empty response for preflight
      event.node.res.statusCode = 204;
      event.node.res.end();
      return;
    }

    // Validate origin for non-GET requests
    if (event.method !== "GET" && !validateOrigin(event, allowedOrigins)) {
      throw createError({
        statusCode: 403,
        statusMessage: "Forbidden",
        message: "Origin tidak diizinkan",
      });
    }

    // Set CORS header for actual requests
    const origin = getHeader(event, "origin");
    if (origin && allowedOrigins.includes(origin)) {
      setHeader(event, "Access-Control-Allow-Origin", origin);
    } else if (allowedOrigins.includes("*")) {
      setHeader(event, "Access-Control-Allow-Origin", "*");
    }
    setHeader(event, "Access-Control-Allow-Credentials", "true");
  }
});
