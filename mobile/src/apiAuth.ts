// How a request proves who it is. Android: the anonymous install id. Web: apiAuth.web.ts (Firebase token).

/** Identity headers for every API call. Null = a call without identity (/api/config): no header. */
export async function identityHeaders(installId: string | null): Promise<Record<string, string>> {
  return installId ? { "X-Install-Id": installId } : {};
}

/** Adds the identity to a POST body (the server also reads installId from the body). */
export function identityBody<T extends object>(installId: string, body: T): { installId?: string } & T {
  return { installId, ...body };
}

/** Called on a 401 AUTH_INVALID. True = credentials were renewed, retry the request once. False = could not renew. */
export async function renewIdentity(): Promise<boolean> {
  return false;
}

/** Called when the server rejects the renewed credentials with AUTH_INVALID again. */
export async function identityRejected(): Promise<void> {}

/** How long a request may take before it is abandoned. Null = no limit (the phone, as before). */
export function requestTimeoutMs(_path: string): number | null {
  return null;
}
