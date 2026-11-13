import { identityBody, identityHeaders, identityRejected, renewIdentity } from "./apiAuth";

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "";
// Release builds only talk to an https server (app.config.js also blocks such builds at bundle time).
const BAD_CONFIG = !__DEV__ && !BASE.startsWith("https://");

export class ApiError extends Error {
  constructor(public code: string, public credits?: number, public retryAfterSec?: number) {
    super(code);
  }
}

/** Seconds to wait from the error body, or the Retry-After header as a fallback. */
function retryAfter(body: any, res: Response): number | undefined {
  const fromBody = Number(body?.retryAfterSec);
  if (Number.isFinite(fromBody) && fromBody > 0) return fromBody;
  const fromHeader = Number(res.headers.get("Retry-After"));
  return Number.isFinite(fromHeader) && fromHeader > 0 ? fromHeader : undefined;
}

async function call<T>(path: string, installId: string, init?: RequestInit, renewed = false): Promise<T> {
  if (BAD_CONFIG) throw new ApiError("CONFIG");
  let res: Response;
  try {
    // Android: X-Install-Id. Web: Authorization: Bearer <Firebase ID token>. See apiAuth(.web).ts.
    const identity = await identityHeaders(installId);
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...identity, ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("NETWORK");
  }
  let body: any;
  try {
    body = await res.json();
  } catch {
    // A 200 whose body never fully arrived is a dropped connection, not a server error.
    if (res.ok) throw new ApiError("NETWORK");
    body = {};
  }
  // Web only: an expired or revoked sign-in. Renew the token once, then give up and sign out.
  if (res.status === 401 && (body.error === "AUTH_INVALID" || body.error === "AUTH_REQUIRED")) {
    if (!renewed && body.error === "AUTH_INVALID" && (await renewIdentity())) return call<T>(path, installId, init, true);
    await identityRejected();
  }
  if (!res.ok) throw new ApiError(body.error ?? `HTTP_${res.status}`, body.credits, retryAfter(body, res));
  return body as T;
}

/** userId: web accounts only; it is the RevenueCat Web Billing app user id. */
export type Me = { credits: number; paid: boolean; freeDenied?: boolean; userId?: string };

export const api = {
  me: (installId: string) => call<Me>("/api/me", installId),

  /** requestId lets the server refund the credit if this design never reaches the phone. */
  redesign: (installId: string, image: string, styleId: string, requestId: string) =>
    call<{ image: string; credits: number }>("/api/redesign", installId, {
      method: "POST",
      body: JSON.stringify(identityBody(installId, { image, styleId, requestId })),
    }),

  report: (installId: string, styleId: string) =>
    call<{ ok: true }>("/api/report", installId, {
      method: "POST",
      body: JSON.stringify(identityBody(installId, { styleId, reason: "user_flag" })),
    }),

  /** Web accounts only: deletes the signed-in account and its credits. */
  deleteAccount: (installId: string) => call<{ ok: true }>("/api/account/delete", installId, { method: "POST" }),
};
