// Web only: shows the sign-in screen (or a "not set up yet" page) before the app itself.
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { InstrumentSerif_400Regular, useFonts } from "@expo-google-fonts/instrument-serif";
import { finishRedirectSignIn, signInWithGoogle, watchAccount, type Account } from "./auth";
import { DELETED_FLASH_KEY } from "./components/AccountCard.web";
import { Button } from "./components/Button";
import { lang, loadLangPref, t } from "./i18n";
import { color, font, space } from "./theme";
import { webConfigProblems } from "./webConfig";

/** The landing site at the domain root serves these. */
export const sitePage = (path: "/privacy" | "/terms") => `${window.location.origin}${path}`;

export function AuthGate({ children }: { children: (account: Account | null) => ReactNode }) {
  const [fontsLoaded] = useFonts({ InstrumentSerif_400Regular });
  const [langReady, setLangReady] = useState(false);
  // undefined = still asking Firebase whether someone is signed in.
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [problems] = useState(webConfigProblems);
  // Set by the account delete just before it reloads the page: "all" or "data" (sign-in link not removed).
  const [deleted] = useState(() => {
    try {
      const v = sessionStorage.getItem(DELETED_FLASH_KEY);
      sessionStorage.removeItem(DELETED_FLASH_KEY);
      return v;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    loadLangPref().finally(() => {
      document.documentElement.lang = lang;
      setLangReady(true);
    });
  }, []);

  useEffect(() => {
    if (problems.length) return;
    try {
      finishRedirectSignIn().catch(() => setFailed(true));
      return watchAccount(setAccount);
    } catch {
      setAccount(null);
      setFailed(true);
    }
  }, [problems]);

  async function signIn() {
    setBusy(true);
    setFailed(false);
    try {
      // "redirect": the page is on its way to Google, keep the button busy.
      if ((await signInWithGoogle()) !== "redirect") setBusy(false);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  if (!fontsLoaded || !langReady) return null;
  if (account) return <>{children(account)}</>;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.column}>
          <Text style={styles.brand} accessibilityRole="header">DecoHero</Text>
          {problems.length ? (
            <View style={styles.card}>
              <Text style={styles.title}>{t.notConfiguredTitle}</Text>
              <Text style={styles.text}>{t.notConfiguredBody}</Text>
              <Text style={styles.small}>
                {t.notConfiguredMissing} {problems.join(", ")}
              </Text>
            </View>
          ) : account === undefined ? (
            <ActivityIndicator color={color.olive} size="large" style={styles.loading} />
          ) : (
            <>
              <Text style={styles.tagline}>{t.tagline}</Text>
              {!!deleted && (
                <Text style={styles.flash} accessibilityLiveRegion="polite">
                  {deleted === "all" ? t.accountDeleted : t.accountDataDeleted}
                </Text>
              )}
              <View style={styles.card}>
                <Button label={t.signInGoogle} onPress={signIn} loading={busy} />
                <Text style={styles.why}>{t.signInWhy}</Text>
                {failed && <Text style={styles.error} accessibilityLiveRegion="polite">{t.signInFailed}</Text>}
              </View>
              <Text style={styles.small}>{t.aiNotice}</Text>
            </>
          )}
          <View style={styles.links}>
            <Pressable onPress={() => Linking.openURL(sitePage("/privacy")).catch(() => {})} style={styles.target} accessibilityRole="link">
              <Text style={styles.link}>{t.privacyPolicy}</Text>
            </Pressable>
            <Pressable onPress={() => Linking.openURL(sitePage("/terms")).catch(() => {})} style={styles.target} accessibilityRole="link">
              <Text style={styles.link}>{t.terms}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.limewash },
  body: { flexGrow: 1, justifyContent: "center", paddingHorizontal: space(5), paddingVertical: space(10) },
  column: { width: "100%", maxWidth: 440, alignSelf: "center", gap: space(4) },
  brand: { fontFamily: font.display, fontSize: 56, lineHeight: 60, color: color.ink },
  tagline: { fontFamily: font.display, fontSize: 28, lineHeight: 33, color: color.ink },
  title: { fontFamily: font.display, fontSize: 30, lineHeight: 34, color: color.ink },
  card: {
    backgroundColor: color.plaster,
    borderRadius: 6,
    padding: space(5),
    gap: space(3),
    borderWidth: 1.5,
    borderColor: color.line,
  },
  text: { fontSize: 15, lineHeight: 22, color: color.ink },
  flash: { fontSize: 15, lineHeight: 21, color: color.ink, fontWeight: "600" },
  why: { fontSize: 15, lineHeight: 21, color: color.stone, textAlign: "center" },
  small: { fontSize: 13, lineHeight: 19, color: color.stone },
  error: { fontSize: 15, lineHeight: 21, color: color.danger, textAlign: "center" },
  loading: { marginVertical: space(10) },
  links: { flexDirection: "row", gap: space(6) },
  target: { minHeight: 44, justifyContent: "center" },
  link: { color: color.olive, fontWeight: "600", fontSize: 15 },
});
