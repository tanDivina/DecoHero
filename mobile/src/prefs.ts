// Small key/value store for app preferences. Native: SecureStore. Web: prefs.web.ts (localStorage).
export { getItemAsync as getPref, setItemAsync as setPref, deleteItemAsync as deletePref } from "expo-secure-store";
