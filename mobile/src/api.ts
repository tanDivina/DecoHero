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

const DELETE_PATH = "/api/account/delete";
// Web account deletion only (never set on the phone): while true, every call except the delete itself
// is refused before it is sent, so no balance refresh or poll can re-create the account mid-delete.
let deleting = false;
const inFlight = new Set<Promise<unknown>>();

/** Stops all API traffic and waits for requests already on the wire. Call before deleteAccount(). */
export async function pauseApiForDelete(): Promise<void> {
  deleting = true;
  await Promise.allSettled([...inFlight]);
}

/** The delete did not happen: let API calls through again. */
export function resumeApi(): void {
  deleting = false;
}

function call<T>(path: string, installId: string, init?: RequestInit): Promise<T> {
  const p = send<T>(path, installId, init, {});
  inFlight.add(p);
  const done = () => inFlight.delete(p);
  p.then(done, done);
  return p;
}

/** renewed: already retried with a fresh token. recreated: already asked /api/me to set the account up. */
type Retried = { renewed?: boolean; recreated?: boolean };

async function send<T>(path: string, installId: string, init: RequestInit | undefined, retried: Retried): Promise<T> {
  if (BAD_CONFIG) throw new ApiError("CONFIG");
  if (deleting && path !== DELETE_PATH) throw new ApiError("DELETING");
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
  // Web only (the phone never gets these codes).
  if (res.status === 401 && body.error === "AUTH_INVALID") {
    // Expired or revoked sign-in: retry once with a freshly renewed token. Sign out only when that
    // retry is rejected too, never on the first failure or when the renewal itself could not run.
    if (retried.renewed) await identityRejected();
    else if (await renewIdentity()) return send<T>(path, installId, init, { ...retried, renewed: true });
  }
  if (res.status === 401 && body.error === "ACCOUNT_NOT_FOUND" && !retried.recreated && path !== "/api/me" && path !== DELETE_PATH) {
    // Only GET /api/me creates the web account: ask it once, then repeat this request.
    await send("/api/me", installId, undefined, { recreated: true });
    return send<T>(path, installId, init, { ...retried, recreated: true });
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
  deleteAccount: (installId: string) => call<{ ok: true }>(DELETE_PATH, installId, { method: "POST" }),
};
