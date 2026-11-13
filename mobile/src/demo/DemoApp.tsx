// DECOHERO_SCREENSHOT_DEMO: fixed scenes for store screenshots. Loaded only by index.web.ts in dev builds.
// It renders the real screens with made-up state and never calls the API, sign-in or the shop.
//
//   ?demo=home&photo=<url>&styles=japandi,boho&credits=12&lang=es
//   ?demo=results&photo=<url>&results=japandi|<url>,boho|<url>&lang=en
//
// Image URLs must be on localhost (tools/screenshots/capture.mjs serves store/rooms there).
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { InstrumentSerif_400Regular, useFonts } from "@expo-google-fonts/instrument-serif";
import { setLang } from "../i18n";
import { photoAspect, type Photo } from "../photoShape";
import { HomeScreen } from "../screens/HomeScreen";
import { ResultsScreen, type Result } from "../screens/ResultsScreen";
import { isStyleId } from "./styleIds";
import { color } from "../theme";

const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//;
const noop = () => {};

function read() {
  const q = new URLSearchParams(window.location.search);
  const local = (u: string | null) => (u && LOCAL.test(u) ? u : null);
  const results: Result[] = (q.get("results") ?? "")
    .split(",")
    .map((pair) => pair.split("|"))
    .filter(([style, url]) => isStyleId(style) && local(url))
    .map(([styleId, uri], i) => ({ styleId, uri, requestId: `demo-${i}`, status: "done" as const }));
  return {
    scene: q.get("demo") === "results" ? "results" : "home",
    photo: local(q.get("photo")),
    selected: (q.get("styles") ?? "").split(",").filter(isStyleId).slice(0, 4),
    credits: Number(q.get("credits") ?? 12) || 0,
    lang: q.get("lang") === "es" ? ("es" as const) : ("en" as const),
    results,
  };
}

export function DemoApp() {
  const [fontsLoaded] = useFonts({ InstrumentSerif_400Regular });
  // Language is applied before the first render of the screens.
  const [demo] = useState(() => {
    const d = read();
    setLang(d.lang);
    return d;
  });
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [selected, setSelected] = useState(demo.selected);

  useEffect(() => {
    if (!demo.photo) return;
    const uri = demo.photo;
    Image.getSize(uri, (w, h) => setPhoto({ uri, base64: "", aspect: photoAspect(w, h) }), noop);
  }, [demo.photo]);

  if (!fontsLoaded || (demo.photo && !photo)) return null;

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <View style={styles.column}>
          {demo.scene === "results" && photo ? (
            <ResultsScreen
              originalUri={photo.uri}
              aspect={photo.aspect}
              results={demo.results}
              onBack={noop}
              onSave={noop}
              onShare={noop}
              onReport={noop}
              onRetry={noop}
              onOpenShop={noop}
            />
          ) : (
            <HomeScreen
              credits={demo.credits}
              freeDenied={false}
              photo={photo}
              onPhoto={noop}
              selected={selected}
              onSelect={setSelected}
              onRedesign={noop}
              onOpenShop={noop}
              onOpenAbout={noop}
              onNotice={noop}
            />
          )}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.limewash },
  column: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center" },
});
