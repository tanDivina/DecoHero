import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, BackHandler, Platform, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { InstrumentSerif_400Regular, useFonts } from "@expo-google-fonts/instrument-serif";
import * as SplashScreen from "expo-splash-screen";
import { randomUUID } from "expo-crypto";
import { api, ApiError } from "./src/api";
import type { Account } from "./src/auth";
import { AuthGate } from "./src/AuthGate";
import { getInstallId } from "./src/identity";
import { initPurchases } from "./src/purchases";
import { saveToGallery, shareImage, writeTempJpeg } from "./src/files";
import { errorMessage, followPhoneLang, lang, langPref, loadLangPref, setLang, syncDeviceLang, t, type Lang } from "./src/i18n";
import type { Photo } from "./src/photo";
import { useScreenHistory } from "./src/screenHistory";
import { HomeScreen } from "./src/screens/HomeScreen";
import { Result, ResultsScreen } from "./src/screens/ResultsScreen";
import { ShopScreen } from "./src/screens/ShopScreen";
import { AboutScreen, type LangChoice } from "./src/screens/AboutScreen";
import { color, font, space } from "./src/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

type Screen = "home" | "results" | "shop" | "about";

// Web-only behaviour lives in *.web.ts(x) files and behind this flag; the Android app is unchanged.
const WEB = Platform.OS === "web";
// Web layout: a centred column, wider on Results so designs can sit side by side.
const COLUMN_WIDTH = 560;
const RESULTS_WIDTH = 1180;

/** Android: AuthGate renders the app at once. Web: it asks for a Google sign-in first (AuthGate.web.tsx). */
export default function App() {
  // The key gives each web account its own fresh state (photo, results, credits).
  return <AuthGate>{(account) => <Main key={account?.uid ?? "app"} account={account} />}</AuthGate>;
}

function Main({ account }: { account: Account | null }) {
  const [fontsLoaded] = useFonts({ InstrumentSerif_400Regular });
  const [langReady, setLangReady] = useState(false);
  const [uiLang, setUiLang] = useState<Lang>(lang);
  const [langChoice, setLangChoice] = useState<LangChoice>("phone");
  const [installId, setInstallId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [freeDenied, setFreeDenied] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [returnTo, setReturnTo] = useState<Screen>("home");
  const [photo, setPhoto] = useState<Photo | null>(null);
  // Styles picked on Home; kept here so they survive trips to the shop, About and results.
  const [selected, setSelected] = useState<string[]>([]);
  // The photo the current results were made from (the user may pick a new photo after Back).
  const [resultPhoto, setResultPhoto] = useState<Photo | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  // Web only: the server has the web app switched off (503 WEB_DISABLED).
  const [webClosed, setWebClosed] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }, []);

  useEffect(() => {
    loadLangPref().finally(() => {
      setUiLang(lang);
      setLangChoice(langPref() ?? "phone");
      setLangReady(true);
    });
  }, []);

  const changeLang = useCallback((choice: LangChoice) => {
    if (choice === "phone") followPhoneLang();
    else setLang(choice);
    setLangChoice(choice);
    setUiLang(lang);
  }, []);

  // No in-app choice: follow a phone or per-app language change (Settings > Apps > DecoHero > Language).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && syncDeviceLang()) setUiLang(lang);
    });
    return () => sub.remove();
  }, []);

  const refreshMe = useCallback(async (id: string) => {
    const me = await api.me(id);
    // Web: RevenueCat Web Billing must use the server's userId, so it is set up once /api/me answers.
    if (WEB && me.userId) initPurchases(me.userId);
    setCredits(me.credits);
    setFreeDenied(!!me.freeDenied);
    return me;
  }, []);

  useEffect(() => {
    (async () => {
      const id = await getInstallId();
      setInstallId(id);
      if (!WEB) initPurchases(id);
      try {
        await refreshMe(id);
      } catch (e) {
        if (WEB && e instanceof ApiError && e.code === "WEB_DISABLED") setWebClosed(true);
        showNotice(errorMessage(e instanceof ApiError ? e.code : undefined, t.network));
      }
    })();
  }, [refreshMe, showNotice]);

  // Refresh the balance when the app comes back to the foreground (e.g. a pending payment cleared).
  useEffect(() => {
    if (!installId) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshMe(installId).catch(() => {});
    });
    return () => sub.remove();
  }, [installId, refreshMe]);

  useEffect(() => {
    if (fontsLoaded && langReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, langReady]);

  // Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen === "home") return false;
      setScreen(screen === "shop" ? returnTo : "home");
      return true;
    });
    return () => sub.remove();
  }, [screen, returnTo]);

  // Web: the browser's back and forward buttons move between screens (no-op on the phone).
  useScreenHistory<Screen>(screen, (to, cameFrom) => {
    // Results that no longer exist (the page was reloaded) fall back to Home.
    if (to === "results" && !(results.length && resultPhoto)) return setScreen("home");
    if (to === "shop") setReturnTo(cameFrom === "shop" ? "home" : cameFrom);
    setScreen(to);
  });

  const openShop = useCallback(() => {
    setReturnTo(screen === "shop" ? "home" : screen);
    setScreen("shop");
  }, [screen]);

  // Matched on requestId, so a late answer from an older attempt never overwrites a newer one.
  const updateResult = (requestId: string, patch: Partial<Result>) =>
    setResults((cur) => cur.map((r) => (r.requestId === requestId ? { ...r, ...patch } : r)));

  async function runStyle(id: string, source: Photo, styleId: string, requestId: string) {
    try {
      const res = await api.redesign(id, source.base64, styleId, requestId);
      const uri = await writeTempJpeg(res.image, `decohero-${styleId}-${Date.now()}`);
      setCredits(res.credits);
      updateResult(requestId, { status: "done", uri });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("UNKNOWN");
      if (typeof err.credits === "number") setCredits(err.credits);
      updateResult(requestId, { status: "error", errorCode: err.code, retryAfterSec: err.retryAfterSec });
      // The server may have refunded (dropped connection) or not charged at all: show the real balance.
      refreshMe(id).catch(() => {});
    }
  }

  function redesign(styleIds: string[]) {
    if (!installId || !photo) return;
    const run = styleIds.map((styleId) => ({ styleId, requestId: randomUUID(), status: "loading" as const }));
    setResultPhoto(photo);
    setResults(run);
    setScreen("results");
    // One request per style, in parallel: each design appears as soon as it's ready.
    run.forEach((r) => runStyle(installId, photo, r.styleId, r.requestId));
  }

  function retry(r: Result) {
    if (!installId || !resultPhoto) return;
    const requestId = randomUUID();
    setResults((cur) =>
      cur.map((x) => (x.styleId === r.styleId ? { styleId: x.styleId, requestId, status: "loading" } : x))
    );
    runStyle(installId, resultPhoto, r.styleId, requestId);
  }

  async function waitForCredits(before: number): Promise<boolean> {
    if (!installId) return false;
    // Credits arrive via the server webhook. Phone: 12 tries, 1.5 s apart. Web: every 2 s for up to 60 s.
    const tries = WEB ? 30 : 12;
    const everyMs = WEB ? 2000 : 1500;
    for (let i = 0; i < tries; i++) {
      await new Promise((r) => setTimeout(r, everyMs));
      try {
        const me = await refreshMe(installId);
        if (me.credits > before) return true;
      } catch {}
    }
    return false;
  }

  if (!fontsLoaded || !langReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={color.limewash} />
      <View style={styles.root} key={uiLang}>
        <View style={[styles.column, WEB && styles.columnWeb, WEB && { maxWidth: screen === "results" ? RESULTS_WIDTH : COLUMN_WIDTH }]}>
        {webClosed && (
          <View style={styles.closed}>
            <Text style={styles.closedBrand}>DecoHero</Text>
            <Text style={styles.closedText}>{t.webDisabled}</Text>
          </View>
        )}
        {!webClosed && screen === "home" && (
          <HomeScreen
            credits={credits}
            freeDenied={freeDenied}
            photo={photo}
            onPhoto={setPhoto}
            selected={selected}
            onSelect={setSelected}
            onRedesign={redesign}
            onViewResults={results.length && resultPhoto ? () => setScreen("results") : undefined}
            onOpenShop={openShop}
            onOpenAbout={() => setScreen("about")}
            onNotice={showNotice}
          />
        )}
        {!webClosed && screen === "about" && (
          <AboutScreen installId={installId} account={account} onNotice={showNotice} langChoice={langChoice} onChangeLang={changeLang} onBack={() => setScreen("home")} />
        )}
        {!webClosed && screen === "results" && resultPhoto && (
          <ResultsScreen
            originalUri={resultPhoto.uri}
            aspect={resultPhoto.aspect}
            results={results}
            onBack={() => setScreen("home")}
            onOpenShop={openShop}
            onRetry={retry}
            onSave={async (r) => {
              if (!r.uri) return;
              try {
                const ok = await saveToGallery(r.uri);
                showNotice(ok ? (WEB ? t.downloaded : t.saved) : t.mediaDenied);
              } catch {
                showNotice(t.saveFailed);
              }
            }}
            onShare={async (r) => {
              if (!r.uri) return;
              try {
                if (!(await shareImage(r.uri))) showNotice(t.shareFailed);
              } catch {
                showNotice(t.shareFailed);
              }
            }}
            onReport={(r) => {
              if (!installId) return;
              updateResult(r.requestId, { reported: true });
              api.report(installId, r.styleId).catch(() => {});
              showNotice(t.reported);
            }}
          />
        )}
        {!webClosed && screen === "shop" && (
          <ShopScreen
            credits={credits}
            onBack={() => setScreen(returnTo)}
            waitForCredits={waitForCredits}
            onNotice={showNotice}
          />
        )}

        {notice && <Notice text={notice} atTop={screen === "results"} />}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

/** Toast. On Results it sits at the top, over the photo, so it never covers Save / Share / Try again. */
function Notice({ text, atTop }: { text: string; atTop: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.notice, atTop ? { top: insets.top + space(14) } : { bottom: insets.bottom + space(28) }]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.limewash },
  column: { flex: 1 },
  columnWeb: { width: "100%", alignSelf: "center" },
  closed: { flex: 1, justifyContent: "center", paddingHorizontal: space(5), gap: space(3) },
  closedBrand: { fontFamily: font.display, fontSize: 48, color: color.ink },
  closedText: { fontSize: 16, lineHeight: 23, color: color.ink },
  notice: {
    position: "absolute",
    left: space(5),
    right: space(5),
    backgroundColor: color.oliveDeep,
    borderRadius: 8,
    paddingVertical: space(3),
    paddingHorizontal: space(4),
  },
  noticeText: { color: color.white, fontSize: 15, lineHeight: 20 },
});
