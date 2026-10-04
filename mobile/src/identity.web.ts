// Browser stand-in for identity.ts, used only for web previews (expo-secure-store has no web module).
const KEY = "decohero_install_id";

export async function getInstallId(): Promise<string> {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
