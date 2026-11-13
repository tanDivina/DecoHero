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

async function call<T>(path: string, installId: string, init?: RequestInit): Promise<T> {
  if (BAD_CONFIG) throw new ApiError("CONFIG");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "X-Install-Id": installId, ...(init?.headers ?? {}) },
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
  if (!res.ok) throw new ApiError(body.error ?? `HTTP_${res.status}`, body.credits, retryAfter(body, res));
  return body as T;
}

export type Me = { credits: number; paid: boolean; freeDenied?: boolean };

export const api = {
  me: (installId: string) => call<Me>("/api/me", installId),

  /** requestId lets the server refund the credit if this design never reaches the phone. */
  redesign: (installId: string, image: string, styleId: string, requestId: string) =>
    call<{ image: string; credits: number }>("/api/redesign", installId, {
      method: "POST",
      body: JSON.stringify({ installId, image, styleId, requestId }),
    }),

  report: (installId: string, styleId: string) =>
    call<{ ok: true }>("/api/report", installId, {
      method: "POST",
      body: JSON.stringify({ installId, styleId, reason: "user_flag" }),
    }),
};
