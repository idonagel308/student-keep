import type { NextConfig } from "next";

// next/font/google self-hosts fonts at build time, so no runtime requests to
// Google are made and the CSP below doesn't need to allowlist their origins.
//
// script-src needs 'unsafe-inline': Next.js injects inline bootstrap
// scripts on every page (the RSC payload passed to self.__next_f.push(...))
// that hydration depends on. A stricter CSP is possible via a per-request
// nonce generated in proxy.ts, but that's the right tradeoff for apps with
// compliance requirements or third-party scripts to lock down — this is a
// single-user personal app with no XSS sinks (no dangerouslySetInnerHTML,
// eval, or raw HTML rendering anywhere; verified during the security
// audit), so the complexity of nonce plumbing isn't buying much here.
// frame-ancestors, connect-src, and form-action below still do real work
// against clickjacking and data exfiltration to other origins.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
