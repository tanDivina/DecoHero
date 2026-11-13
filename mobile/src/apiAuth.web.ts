// Web build of apiAuth.ts: requests carry the Firebase ID token and never an install id.
import { getIdToken, signOutUser } from "./auth";

export async function identityHeaders(_id: string): Promise<Record<string, string>> {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function identityBody<T extends object>(_id: string, body: T): { installId?: string } & T {
  return body;
}

export async function renewIdentity(): Promise<boolean> {
  try {
    return !!(await getIdToken(true));
  } catch {
    return false;
  }
}

/** Even a freshly renewed token was rejected: sign out (the page reloads to the sign-in screen). */
export async function identityRejected(): Promise<void> {
  await signOutUser().catch(() => {});
}
