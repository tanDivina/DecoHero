import { identityBody, identityHeaders, identityRejected, renewIdentity, requestTimeoutMs } from "./apiAuth";

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

const PAUSE_WAIT_MS = 15_000;

/**
 * Stops all API traffic and waits (up to 15 s) for requests already on the wire. Call before
 * deleteAccount(). False = something is still in flight: call resumeApi() and do not delete.
 */
export async function pauseApiForDelete(): Promise<boolean> {
  deleting = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settled = Promise.allSettled([...inFlight]).then(() => true);
  const tooLong = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), PAUSE_WAIT_MS);
  });
  const ok = await Promise.race([settled, tooLong]);
  clearTimeout(timer);
  return ok;
}

/** The delete did not happen: let API calls through again. */
export function resumeApi(): void {
  deleting = false;
}

function call<T>(path: string, installId: string | null, init?: RequestInit): Promise<T> {
  const p = send<T>(path, installId, init, {});
  inFlight.add(p);
  const done = () => inFlight.delete(p);
  p.then(done, done);
  return p;
}

/** renewed: already retried with a fresh token. recreated: already asked /api/me to set the account up. */
type Retried = { renewed?: boolean; recreated?: boolean };

/** installId null: a call that needs no identity (/api/config). The phone then sends no X-Install-Id; the web still sends its sign-in. */
async function send<T>(path: string, installId: string | null, init: RequestInit | undefined, retried: Retried): Promise<T> {
  if (BAD_CONFIG) throw new ApiError("CONFIG");
  if (deleting && path !== DELETE_PATH) throw new ApiError("DELETING");
  // Web only (null on the phone): give up on a request that hangs, and report it as a lost connection.
  const timeoutMs = requestTimeoutMs(path);
  const abort = timeoutMs ? new AbortController() : null;
  const timer = abort ? setTimeout(() => abort.abort(), timeoutMs!) : undefined;
  let res: Response;
  try {
    // Android: X-Install-Id. Web: Authorization: Bearer <Firebase ID token>. See apiAuth(.web).ts.
    const identity = await identityHeaders(installId);
    res = await fetch(`${BASE}${path}`, {
      ...init,
      ...(abort ? { signal: abort.signal } : {}),
      headers: { "Content-Type": "application/json", ...identity, ...(init?.headers ?? {}) },
    });
  } catch {
    clearTimeout(timer);
    throw new ApiError("NETWORK");
  }
  let body: any;
  try {
    body = await res.json();
  } catch {
    // A 200 whose body never fully arrived is a dropped connection, not a server error.
    if (res.ok || abort?.signal.aborted) throw new ApiError("NETWORK");
    body = {};
  } finally {
    clearTimeout(timer);
  }
  // Web only (the phone never gets these codes).
  if (res.status === 401 && body.error === "AUTH_INVALID") {
    // Expired or revoked sign-in: retry once with a freshly renewed token. Sign out only when that
    // retry is rejected too, never on the first failure or when the renewal itself could not run.
    // (The delete call decides for itself what a rejected token means, so it never signs out here.)
    if (retried.renewed) {
      if (path !== DELETE_PATH) await identityRejected();
    } else if (await renewIdentity()) return send<T>(path, installId, init, { ...retried, renewed: true });
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

/** Settings the server can change without an app release. Older servers don't have the endpoint (404). */
export type AppConfig = { christmas: boolean; treeShopUrl: string; shopLinks: unknown; treeCatalog: unknown; treeRemove: boolean };

/**
 * A "Shop this look" link for one Christmas theme. "amazon" and "partner" are affiliate links and are shown
 * with their disclosure; "plain" (app 1.0.6+) earns nothing and is shown without one. Amazon affiliate links
 * only arrive once the server's gate is open.
 */
export type ShopLink = { en: string; es: string; url: string; kind: "amazon" | "partner" | "plain" };
export type ShopLinks = Record<string, ShopLink[]>;

const MAX_LINKS_PER_THEME = 4;

/** Keeps only well-formed https links from /api/config; anything else (or an older server) gives no links. */
export function parseShopLinks(raw: unknown): ShopLinks {
  const out: ShopLinks = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  for (const [theme, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) continue;
    const links = list.filter(
      (l): l is ShopLink =>
        !!l && typeof l.en === "string" && !!l.en && typeof l.es === "string" && !!l.es &&
        typeof l.url === "string" && l.url.startsWith("https://") && (l.kind === "amazon" || l.kind === "partner" || l.kind === "plain")
    );
    if (links.length) out[theme] = links.slice(0, MAX_LINKS_PER_THEME);
  }
  return out;
}

export const api = {
  config: () => call<Partial<AppConfig>>("/api/config", null),

  me: (installId: string) => call<Me>("/api/me", installId),

  /**
   * requestId lets the server refund the credit if this design never reaches the phone.
   * size is for Christmas styles only: ceiling and tree height in cm, so the tree is drawn to scale.
   * place (Christmas only, optional): where the user tapped for the tree, as fractions of the photo.
   * tree.remove (1.0.7+, needs place): furniture the user lets us take out. tree.moveOf: the designId being moved;
   * the server makes the first move of a design free. Christmas designs come back with their own designId.
   */
  redesign: (
    installId: string, image: string, styleId: string, requestId: string,
    size?: { ceilingCm: number; treeCm?: number },
    place?: { x: number; y: number } | null,
    tree: { remove?: { x: number; y: number }[]; moveOf?: string } = {}
  ) =>
    call<{ image: string; credits: number; designId?: string; freeMove?: boolean }>("/api/redesign", installId, {
      method: "POST",
      body: JSON.stringify(identityBody(installId, {
        image, styleId, requestId, ...size,
        ...(place ? { place: { x: place.x, y: place.y } } : {}),
        ...(place && tree.remove?.length ? { remove: tree.remove.map((r) => ({ x: r.x, y: r.y })) } : {}),
        ...(tree.moveOf ? { moveOf: tree.moveOf } : {}),
      })),
    }),

  report: (installId: string, styleId: string) =>
    call<{ ok: true }>("/api/report", installId, {
      method: "POST",
      body: JSON.stringify(identityBody(installId, { styleId, reason: "user_flag" })),
    }),

  /** Web accounts only: deletes the signed-in account and its credits. */
  deleteAccount: (installId: string) => call<{ ok: true }>(DELETE_PATH, installId, { method: "POST" }),
};
