const BASE = process.env.EXPO_PUBLIC_API_URL ?? "";
// Release builds only talk to an https server (app.config.js also blocks such builds at bundle time).
const BAD_CONFIG = !__DEV__ && !BASE.startsWith("https://");

export class ApiError extends Error {
  constructor(public code: string, public credits?: number) {
    super(code);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (BAD_CONFIG) throw new ApiError("CONFIG");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("NETWORK");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? `HTTP_${res.status}`, body.credits);
  return body as T;
}

export const api = {
  me: (installId: string) =>
    call<{ credits: number; paid: boolean }>(`/api/me?installId=${encodeURIComponent(installId)}`),

  redesign: (installId: string, image: string, styleId: string) =>
    call<{ image: string; credits: number }>("/api/redesign", {
      method: "POST",
      body: JSON.stringify({ installId, image, styleId }),
    }),

  report: (installId: string, styleId: string) =>
    call<{ ok: true }>("/api/report", {
      method: "POST",
      body: JSON.stringify({ installId, styleId, reason: "user_flag" }),
    }),
};
