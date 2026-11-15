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

async function call<T>(path: string, installId: string | null, init?: RequestInit): Promise<T> {
  if (BAD_CONFIG) throw new ApiError("CONFIG");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(installId ? { "X-Install-Id": installId } : {}),
        ...(init?.headers ?? {}),
      },
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

/** Settings the server can change without an app release. Older servers don't have the endpoint (404). */
export type AppConfig = { christmas: boolean; treeShopUrl: string; shopLinks: unknown; treeCatalog: unknown };

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
   */
  redesign: (
    installId: string, image: string, styleId: string, requestId: string,
    size?: { ceilingCm: number; treeCm?: number },
    place?: { x: number; y: number } | null
  ) =>
    call<{ image: string; credits: number }>("/api/redesign", installId, {
      method: "POST",
      body: JSON.stringify({ installId, image, styleId, requestId, ...size, ...(place ? { place: { x: place.x, y: place.y } } : {}) }),
    }),

  report: (installId: string, styleId: string) =>
    call<{ ok: true }>("/api/report", installId, {
      method: "POST",
      body: JSON.stringify({ installId, styleId, reason: "user_flag" }),
    }),
};
