import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { InstrumentSerif_400Regular, useFonts } from "@expo-google-fonts/instrument-serif";
import * as SplashScreen from "expo-splash-screen";
import { api, ApiError } from "./src/api";
import { getInstallId } from "./src/identity";
import { initPurchases } from "./src/purchases";
import { saveToGallery, shareImage, writeTempJpeg } from "./src/files";
import { t } from "./src/i18n";
import type { Photo } from "./src/photo";
import { HomeScreen } from "./src/screens/HomeScreen";
import { Result, ResultsScreen } from "./src/screens/ResultsScreen";
import { ShopScreen } from "./src/screens/ShopScreen";
import { color, space } from "./src/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

type Screen = "home" | "results" | "shop";

export default function App() {
  const [fontsLoaded] = useFonts({ InstrumentSerif_400Regular });
  const [installId, setInstallId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [returnTo, setReturnTo] = useState<Screen>("home");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }, []);

  useEffect(() => {
    (async () => {
      const id = await getInstallId();
      setInstallId(id);
      initPurchases(id);
      try {
        const me = await api.me(id);
        setCredits(me.credits);
      } catch {
        showNotice(t.network);
      }
    })();
  }, [showNotice]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen === "home") return false;
      setScreen(screen === "shop" ? returnTo : "home");
      return true;
    });
    return () => sub.remove();
  }, [screen, returnTo]);

  const openShop = useCallback(() => {
    setReturnTo(screen === "shop" ? "home" : screen);
    setScreen("shop");
  }, [screen]);

  const updateResult = (styleId: string, patch: Partial<Result>) =>
    setResults((cur) => cur.map((r) => (r.styleId === styleId ? { ...r, ...patch } : r)));

  function redesign(styleIds: string[]) {
    if (!installId || !photo) return;
    setResults(styleIds.map((styleId) => ({ styleId, status: "loading" })));
    setScreen("results");

    // One request per style, in parallel: each design appears as soon as it's ready.
    styleIds.forEach(async (styleId) => {
      try {
        const res = await api.redesign(installId, photo.base64, styleId);
        const uri = await writeTempJpeg(res.image, `decohero-${styleId}-${Date.now()}`);
        setCredits(res.credits);
        updateResult(styleId, { status: "done", uri });
      } catch (e) {
        const err = e instanceof ApiError ? e : new ApiError("UNKNOWN");
        if (typeof err.credits === "number") setCredits(err.credits);
        updateResult(styleId, { status: "error", errorCode: err.code });
      }
    });
  }

  async function waitForCredits(before: number): Promise<boolean> {
    if (!installId) return false;
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const me = await api.me(installId);
        setCredits(me.credits);
        if (me.credits > before) return true;
      } catch {}
    }
    return false;
  }

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={color.limewash} />
      <View style={styles.root}>
        {screen === "home" && (
          <HomeScreen
            credits={credits}
            photo={photo}
            onPhoto={setPhoto}
            onRedesign={redesign}
            onOpenShop={openShop}
            onNotice={showNotice}
          />
        )}
        {screen === "results" && photo && (
          <ResultsScreen
            originalUri={photo.uri}
            aspect={photo.aspect}
            results={results}
            onBack={() => setScreen("home")}
            onOpenShop={openShop}
            onSave={async (r) => {
              if (!r.uri) return;
              const ok = await saveToGallery(r.uri);
              showNotice(ok ? t.saved : t.mediaDenied);
            }}
            onShare={(r) => r.uri && shareImage(r.uri)}
            onReport={async (r) => {
              if (!installId) return;
              updateResult(r.styleId, { reported: true });
              api.report(installId, r.styleId).catch(() => {});
              showNotice(t.reported);
            }}
          />
        )}
        {screen === "shop" && (
          <ShopScreen
            credits={credits}
            onBack={() => setScreen(returnTo)}
            waitForCredits={waitForCredits}
            onNotice={showNotice}
          />
        )}

        {notice && (
          <View style={styles.notice} pointerEvents="none" accessibilityLiveRegion="polite">
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.limewash },
  notice: {
    position: "absolute",
    left: space(5),
    right: space(5),
    bottom: space(28),
    backgroundColor: color.oliveDeep,
    borderRadius: 8,
    paddingVertical: space(3),
    paddingHorizontal: space(4),
  },
  noticeText: { color: color.white, fontSize: 15, lineHeight: 20 },
});
