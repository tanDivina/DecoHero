// Web build of prefs.ts (expo-secure-store has no web module). localStorage can throw in private windows.
export async function getPref(key: string): Promise<string | null> {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setPref(key: string, value: string): Promise<void> {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export async function deletePref(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch {}
}
