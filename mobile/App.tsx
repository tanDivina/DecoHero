import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, BackHandler, Linking, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { InstrumentSerif_400Regular, useFonts } from "@expo-google-fonts/instrument-serif";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import { api, ApiError, parseShopLinks, type ShopLinks } from "./src/api";
import { getInstallId } from "./src/identity";
import { initPurchases } from "./src/purchases";
import { saveToGallery, shareImage, writeTempJpeg } from "./src/files";
import { errorMessage, followPhoneLang, lang, langPref, loadLangPref, setLang, syncDeviceLang, t, type Lang } from "./src/i18n";
import type { Photo, Place } from "./src/photo";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LooksScreen } from "./src/screens/LooksScreen";
import { Result, ResultsScreen } from "./src/screens/ResultsScreen";
import { MoveTreeScreen } from "./src/screens/MoveTreeScreen";
import { ShopScreen } from "./src/screens/ShopScreen";
import { AboutScreen, type LangChoice } from "./src/screens/AboutScreen";
import { isTreeStyle } from "./src/stylePresets";
import {
  ceilingCm, DEFAULT_CEILING, defaultUnit, FALLBACK_CATALOG, parseTreeCatalog, treeFit, withAffiliate,
  type Ceiling, type TreeFit, type TreeProduct,
} from "./src/treeSize";
import { color, space } from "./src/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

// "shop" sells credit packs; "looks" lists the Christmas shop links (free to open, nothing to generate).
const MODE_KEY = "decohero_mode";

// "move" picks a new spot for the tree of one finished Christmas design.
type Screen = "home" | "results" | "shop" | "about" | "looks" | "move";
export type Mode = "rooms" | "christmas";

// Used until the server's /api/config answers, and when it can't be reached.
const DEFAULT_TREE_SHOP_URL = "https://christmastreesinthemail.com";

export default function App() {
  const [fontsLoaded] = useFonts({ InstrumentSerif_400Regular });
  const [langReady, setLangReady] = useState(false);
  const [uiLang, setUiLang] = useState<Lang>(lang);
  const [langChoice, setLangChoice] = useState<LangChoice>("phone");
  const [installId, setInstallId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [freeDenied, setFreeDenied] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [returnTo, setReturnTo] = useState<Screen>("home");
  const [photo, setPhotoState] = useState<Photo | null>(null);
  // Christmas mode: where the user tapped for the tree on the current photo; null = DecoHero chooses.
  const [place, setPlace] = useState<Place | null>(null);
  const setPhoto = useCallback((p: Photo) => {
    setPhotoState(p);
    setPlace(null);
  }, []);
  // "Move tree": the result being redone, and the page Results opens on afterwards.
  const [moving, setMoving] = useState<{ styleId: string; place: Place | null } | null>(null);
  const [resultsAt, setResultsAt] = useState<string | undefined>(undefined);
  // Styles picked on Home; kept here so they survive trips to the shop, About and results.
  const [selected, setSelected] = useState<string[]>([]);
  // Christmas mode keeps its own picks, so switching back and forth loses nothing.
  const [mode, setModeState] = useState<Mode>("rooms");
  const christmasOffRef = useRef(false);
  // Remember the last mode on this device, so a holiday user lands back in Christmas mode.
  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    SecureStore.setItemAsync(MODE_KEY, m).catch(() => {});
  }, []);
  useEffect(() => {
    SecureStore.getItemAsync(MODE_KEY)
      // Ignore a saved "christmas" if the server already switched Christmas mode off.
      .then((m) => { if ((m === "christmas" && !christmasOffRef.current) || m === "rooms") setModeState((cur) => (cur === "rooms" ? m : cur)); })
      .catch(() => {});
  }, []);
  const [treeSelected, setTreeSelected] = useState<string[]>([]);
  const [ceiling, setCeiling] = useState<Ceiling>(() => {
    const unit = defaultUnit(lang);
    return { unit, text: DEFAULT_CEILING[unit] };
  });
  // Sizes the current results were made with (Christmas runs only).
  const [resultTree, setResultTree] = useState<TreeFit | null>(null);
  const [christmasOn, setChristmasOn] = useState(true);
  const [treeShopUrl, setTreeShopUrl] = useState(DEFAULT_TREE_SHOP_URL);
  // The partner's trees: the built-in list until the server sends its own.
  const [rawCatalog, setRawCatalog] = useState<TreeProduct[]>(FALLBACK_CATALOG);
  // Product links carry the affiliate parameters of the shop link, which only the server knows.
  const treeCatalog = useMemo(
    () => rawCatalog.map((p) => ({ ...p, url: withAffiliate(p.url, treeShopUrl) })),
    [rawCatalog, treeShopUrl]
  );
  // Decor links per Christmas theme; none until the server sends some.
  const [shopLinks, setShopLinks] = useState<ShopLinks>({});
  // The photo the current results were made from (the user may pick a new photo after Back).
  const [resultPhoto, setResultPhoto] = useState<Photo | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
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
    setCredits(me.credits);
    setFreeDenied(!!me.freeDenied);
    return me;
  }, []);

  useEffect(() => {
    (async () => {
      const id = await getInstallId();
      setInstallId(id);
      initPurchases(id);
      try {
        await refreshMe(id);
      } catch (e) {
        showNotice(errorMessage(e instanceof ApiError ? e.code : undefined, t.network));
      }
    })();
  }, [refreshMe, showNotice]);

  // Server-side switches: the "Shop this look" links and whether Christmas mode is offered.
  useEffect(() => {
    api.config().then((cfg) => {
      if (cfg.christmas === false) {
        christmasOffRef.current = true;
        setChristmasOn(false);
        setModeState("rooms");
      }
      // Empty = no button. Anything else must be an https link, or the built-in default stays.
      if (cfg.treeShopUrl === "" || cfg.treeShopUrl?.startsWith("https://")) setTreeShopUrl(cfg.treeShopUrl);
      setShopLinks(parseShopLinks(cfg.shopLinks));
      setRawCatalog(parseTreeCatalog(cfg.treeCatalog));
    }).catch(() => {});
  }, []);

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
      setScreen(screen === "shop" ? returnTo : screen === "move" ? "results" : "home");
      return true;
    });
    return () => sub.remove();
  }, [screen, returnTo]);

  const openShop = useCallback(() => {
    setReturnTo(screen === "shop" ? "home" : screen);
    setScreen("shop");
  }, [screen]);

  // Matched on requestId, so a late answer from an older attempt never overwrites a newer one.
  const updateResult = (requestId: string, patch: Partial<Result>) =>
    setResults((cur) => cur.map((r) => (r.requestId === requestId ? { ...r, ...patch } : r)));

  async function runStyle(id: string, source: Photo, styleId: string, requestId: string, tree: TreeFit | null, spot: Place | null) {
    try {
      const christmas = isTreeStyle(styleId);
      const size = tree && christmas ? { ceilingCm: tree.ceilingCm, treeCm: tree.treeCm } : undefined;
      const res = await api.redesign(id, source.base64, styleId, requestId, size, christmas ? spot : null);
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
    const spot = mode === "christmas" ? place : null;
    const run = styleIds.map((styleId) => ({ styleId, requestId: randomUUID(), status: "loading" as const, place: spot }));
    // Home only enables the button in Christmas mode once the ceiling height is valid.
    const height = mode === "christmas" ? ceilingCm(ceiling) : null;
    const tree = height === null ? null : treeFit(height, ceiling.unit, treeCatalog);
    setResultTree(tree);
    setResultPhoto(photo);
    setResults(run);
    setResultsAt(undefined);
    setScreen("results");
    // One request per style, in parallel: each design appears as soon as it's ready.
    run.forEach((r) => runStyle(installId, photo, r.styleId, r.requestId, tree, spot));
  }

  function retry(r: Result) {
    if (!installId || !resultPhoto) return;
    const requestId = randomUUID();
    setResults((cur) =>
      cur.map((x) => (x.styleId === r.styleId ? { styleId: x.styleId, requestId, status: "loading", place: x.place } : x))
    );
    runStyle(installId, resultPhoto, r.styleId, requestId, resultTree, r.place ?? null);
  }

  /** "Move tree": the same style again with the tree on a new spot. One credit, like any design. */
  function moveTree(styleId: string, spot: Place) {
    if (!installId || !resultPhoto) return;
    const requestId = randomUUID();
    setResults((cur) => cur.map((x) => (x.styleId === styleId ? { styleId, requestId, status: "loading", place: spot } : x)));
    setMoving(null);
    setResultsAt(styleId);
    setScreen("results");
    runStyle(installId, resultPhoto, styleId, requestId, resultTree, spot);
  }

  async function waitForCredits(before: number): Promise<boolean> {
    if (!installId) return false;
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const me = await refreshMe(installId);
        if (me.credits > before) return true;
      } catch {}
    }
    return false;
  }

  // Always the phone's browser or the store's own app, never a browser inside DecoHero (partner rules).
  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => showNotice(t.linkFailed));
  };
  const hasShopLinks = !!treeShopUrl || Object.keys(shopLinks).length > 0;
  // "Shop the styles" shows the tree for the ceiling typed on Home, when that is a valid height.
  const looksHeight = ceilingCm(ceiling);
  const looksTree = looksHeight === null ? null : treeFit(looksHeight, ceiling.unit, treeCatalog);

  if (!fontsLoaded || !langReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={color.limewash} />
      <View style={styles.root} key={uiLang}>
        {screen === "home" && (
          <HomeScreen
            credits={credits}
            freeDenied={freeDenied}
            photo={photo}
            onPhoto={setPhoto}
            place={place}
            onPlace={setPlace}
            treeCatalog={treeCatalog}
            treeShop={!!treeShopUrl}
            mode={mode}
            onMode={christmasOn ? setMode : undefined}
            selected={mode === "christmas" ? treeSelected : selected}
            onSelect={mode === "christmas" ? setTreeSelected : setSelected}
            ceiling={ceiling}
            onCeiling={setCeiling}
            onRedesign={redesign}
            onViewResults={results.length && resultPhoto ? () => setScreen("results") : undefined}
            onOpenShop={openShop}
            onOpenAbout={() => setScreen("about")}
            onOpenLooks={hasShopLinks ? () => setScreen("looks") : undefined}
            onNotice={showNotice}
          />
        )}
        {screen === "looks" && (
          <LooksScreen
            treeShopUrl={treeShopUrl}
            tree={looksTree}
            shopLinks={shopLinks}
            onOpenLink={openLink}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "about" && (
          <AboutScreen installId={installId} langChoice={langChoice} onChangeLang={changeLang} onBack={() => setScreen("home")} />
        )}
        {screen === "results" && resultPhoto && (
          <ResultsScreen
            originalUri={resultPhoto.uri}
            aspect={resultPhoto.aspect}
            results={results}
            tree={resultTree}
            startAt={resultsAt}
            onMoveTree={(r) => {
              setMoving({ styleId: r.styleId, place: r.place ?? null });
              setResultsAt(r.styleId);
              setScreen("move");
            }}
            treeShopUrl={treeShopUrl}
            shopLinks={shopLinks}
            onOpenLink={openLink}
            onBack={() => setScreen("home")}
            onOpenShop={openShop}
            onRetry={retry}
            onSave={async (r) => {
              if (!r.uri) return;
              try {
                const ok = await saveToGallery(r.uri);
                showNotice(ok ? t.saved : t.mediaDenied);
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
        {screen === "move" && resultPhoto && moving && (
          <MoveTreeScreen
            photo={resultPhoto}
            styleId={moving.styleId}
            initial={moving.place}
            credits={credits}
            onConfirm={(spot) => moveTree(moving.styleId, spot)}
            onOpenShop={openShop}
            onBack={() => setScreen("results")}
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

        {notice && <Notice text={notice} atTop={screen === "results"} />}
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
