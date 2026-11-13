import { useState } from "react";
import {
  ActivityIndicator, FlatList, Image, NativeScrollEvent, NativeSyntheticEvent,
  Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import type { ShopLinks } from "../api";
import { lang, redesignErrorMessage, styleName, t } from "../i18n";
import { isTreeStyle } from "../stylePresets";
import { color, font, space } from "../theme";
import { TreeFit, formatLength, formatTree } from "../treeSize";

export type Result = {
  styleId: string;
  /** One per attempt; a retry gets a new one so late answers from an older attempt are ignored. */
  requestId: string;
  status: "loading" | "done" | "error";
  uri?: string;
  errorCode?: string;
  retryAfterSec?: number;
  reported?: boolean;
};

type Props = {
  originalUri: string;
  /** Width ÷ height of the original photo; used until a design has loaded and reports its own shape. */
  aspect: number;
  results: Result[];
  /** Ceiling and tree height of a Christmas run; null for room designs. */
  tree: TreeFit | null;
  /** Partner store link for real trees; empty hides the button. */
  treeShopUrl: string;
  /** Decor links per Christmas theme, from the server. */
  shopLinks: ShopLinks;
  /** Opens a shop link outside the app. */
  onOpenLink: (url: string) => void;
  onBack: () => void;
  onSave: (r: Result) => void;
  onShare: (r: Result) => void;
  onReport: (r: Result) => void;
  onRetry: (r: Result) => void;
  onOpenShop: () => void;
};

// Retrying these won't help: the user needs credits or a different photo / app build.
const NEEDS_CREDITS = ["NO_CREDITS", "FREE_DAILY_LIMIT"];
const NO_RETRY = [...NEEDS_CREDITS, "CONFIG", "TOO_LARGE", "HTTP_413"];
const MAX_SCALE = 1.3;
// Designs are shown whole at their own shape; only extreme panoramas or strips get letterboxed inside these limits.
const MIN_ASPECT = 9 / 16;
const MAX_ASPECT = 2;

export function ResultsScreen({
  originalUri, aspect, results, tree, treeShopUrl, shopLinks, onOpenLink, onBack, onSave, onShare, onReport, onRetry, onOpenShop,
}: Props) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [comparing, setComparing] = useState<string | null>(null);
  // Real width ÷ height of each loaded design, by file uri. The model doesn't always keep the photo's shape.
  const [shapes, setShapes] = useState<Record<string, number>>({});

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.target} accessibilityRole="button">
          <Text style={styles.link}>{t.back}</Text>
        </Pressable>
        {results.length > 1 && (
          <View style={styles.pager} accessible accessibilityLabel={t.pageOf(index + 1, results.length)}>
            <View style={styles.dots}>
              {results.map((r, i) => (
                <View key={r.styleId} style={[styles.dot, i === index && styles.dotOn]} />
              ))}
            </View>
            <Text style={styles.counter}>
              {index + 1} / {results.length}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        style={styles.flex}
        data={results}
        keyExtractor={(r) => r.styleId}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => {
          const done = item.status === "done";
          const showOriginal = done && comparing === item.styleId;
          const designUri = done ? item.uri : undefined;
          const shape = designUri ? shapes[designUri] : undefined;
          const christmas = isTreeStyle(item.styleId);
          const showTree = !!tree && christmas;
          // "Shop this look": the real tree first, then this theme's decor. No links at all = no section.
          const decor = christmas ? shopLinks[item.styleId] ?? [] : [];
          const showShop = christmas && (!!treeShopUrl || decor.length > 0);
          const partnerShown = !!treeShopUrl || decor.some((l) => l.kind === "partner");
          const amazonShown = decor.some((l) => l.kind === "amazon");
          return (
            // Each page scrolls on its own so tall portrait photos never push the actions off small screens.
            <ScrollView style={{ width }} contentContainerStyle={styles.page}>
              <Pressable
                // Real long press: a quick touch at the start of a swipe no longer flashes the original.
                onLongPress={() => done && setComparing(item.styleId)}
                delayLongPress={150}
                onPressOut={() => setComparing(null)}
                disabled={!done}
                accessibilityHint={done ? t.holdToCompare : undefined}
              >
                <Image
                  source={{ uri: done && !showOriginal ? item.uri : originalUri }}
                  style={[styles.image, { aspectRatio: shape ?? aspect }]}
                  // A finished design is never cropped, so the DecoHero mark and the room's edges stay visible.
                  resizeMode={done ? "contain" : "cover"}
                  onLoad={(e) => {
                    const { width: w, height: h } = e.nativeEvent.source ?? {};
                    if (!designUri || showOriginal || !w || !h || shapes[designUri]) return;
                    const real = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, w / h));
                    setShapes((cur) => ({ ...cur, [designUri]: real }));
                  }}
                />
                {showOriginal && (
                  <View style={styles.badge} pointerEvents="none">
                    <Text style={styles.badgeText}>{t.original}</Text>
                  </View>
                )}
                {item.status === "loading" && (
                  <View style={styles.overlay}>
                    <ActivityIndicator color={color.white} size="large" />
                    <Text style={styles.overlayText}>{t.designing(styleName(item.styleId))}</Text>
                  </View>
                )}
              </Pressable>

              <Text style={styles.styleTitle}>{styleName(item.styleId)}</Text>

              {done && (
                <View style={styles.actions}>
                  <Text style={styles.hint}>{t.holdToCompare}</Text>
                  <View style={styles.row}>
                    <Button label={t.save} onPress={() => onSave(item)} style={styles.flex} maxFontSizeMultiplier={MAX_SCALE} />
                    <Button
                      label={t.share}
                      variant="quiet"
                      onPress={() => onShare(item)}
                      style={styles.flex}
                      maxFontSizeMultiplier={MAX_SCALE}
                    />
                  </View>
                  {(showTree || showShop) && (
                    <View style={styles.treeCard}>
                      {showTree && tree && (
                        <>
                          <Text style={styles.treeTitle}>
                            {t.treeRecommended(formatTree(tree.treeCm, tree.unit), formatLength(tree.ceilingCm, tree.unit))}
                          </Text>
                          <Text style={styles.treeText}>{t.treeEstimate}</Text>
                        </>
                      )}
                      {showShop && (
                        <>
                          <Text style={styles.shopTitle} accessibilityRole="header">{t.shopLook}</Text>
                          {!!treeShopUrl && (
                            <>
                              <Button label={t.buyTree} onPress={() => onOpenLink(treeShopUrl)} maxFontSizeMultiplier={MAX_SCALE} />
                              <Text style={styles.treeNote}>{t.buyTreeNote}</Text>
                            </>
                          )}
                          {decor.map((link, i) => (
                            <Button
                              key={`${i}-${link.url}`}
                              label={link[lang]}
                              variant="quiet"
                              onPress={() => onOpenLink(link.url)}
                              maxFontSizeMultiplier={MAX_SCALE}
                            />
                          ))}
                          {/* One disclosure per kind of link that is actually on screen. */}
                          {partnerShown && <Text style={styles.treeNote}>{t.partnerDisclosure}</Text>}
                          {amazonShown && <Text style={styles.treeNote}>{t.amazonDisclosure}</Text>}
                        </>
                      )}
                    </View>
                  )}
                  <View style={styles.footRow}>
                    <Text style={styles.notice}>{t.aiNotice}</Text>
                    <Pressable
                      onPress={() => onReport(item)}
                      disabled={item.reported}
                      style={styles.reportTarget}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !!item.reported }}
                    >
                      <Text style={[styles.report, item.reported && styles.reported]}>{t.report}</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {item.status === "error" && (
                <View style={styles.actions}>
                  <Text style={styles.error}>{redesignErrorMessage(item.errorCode, item.retryAfterSec)}</Text>
                  {NEEDS_CREDITS.includes(item.errorCode ?? "") && <Button label={t.getCredits} onPress={onOpenShop} />}
                  {!NO_RETRY.includes(item.errorCode ?? "") && (
                    <Button label={t.tryAgain} variant="quiet" onPress={() => onRetry(item)} />
                  )}
                </View>
              )}
            </ScrollView>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.limewash },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space(5),
    paddingVertical: space(1),
  },
  target: { minHeight: 44, justifyContent: "center" },
  link: { color: color.olive, fontWeight: "600", fontSize: 16 },
  pager: { flexDirection: "row", alignItems: "center", gap: space(3) },
  dots: { flexDirection: "row", gap: space(1.5) },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.line },
  dotOn: { backgroundColor: color.olive },
  counter: { color: color.stone, fontSize: 15, fontVariant: ["tabular-nums"] },
  page: { paddingHorizontal: space(5), paddingBottom: space(6) },
  image: { width: "100%", borderRadius: 4, backgroundColor: color.line },
  overlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 4,
    backgroundColor: "rgba(28,35,33,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: space(3),
  },
  badge: {
    position: "absolute",
    top: space(3),
    left: space(3),
    backgroundColor: "rgba(28,35,33,0.72)",
    borderRadius: 999,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
  },
  badgeText: { color: color.white, fontSize: 13, fontWeight: "700", letterSpacing: 0.4 },
  overlayText: { color: color.white, fontSize: 16, fontWeight: "600" },
  styleTitle: { fontFamily: font.display, fontSize: 32, color: color.ink, marginTop: space(2), marginBottom: space(2) },
  error: { color: color.danger, fontSize: 15, lineHeight: 21 },
  actions: { gap: space(3) },
  hint: { color: color.stone, fontSize: 13 },
  row: { flexDirection: "row", gap: space(3) },
  flex: { flex: 1 },
  treeCard: {
    padding: space(4),
    borderRadius: 6,
    backgroundColor: color.plaster,
    borderWidth: 1.5,
    borderColor: color.brass,
    gap: space(2),
  },
  treeTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: color.ink },
  treeText: { fontSize: 14, lineHeight: 20, color: color.stone, marginBottom: space(1) },
  shopTitle: { fontFamily: font.display, fontSize: 22, color: color.ink },
  treeNote: { fontSize: 12, lineHeight: 16, color: color.stone },
  footRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space(4) },
  notice: { flex: 1, color: color.stone, fontSize: 12, lineHeight: 16 },
  reportTarget: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "flex-end", paddingLeft: space(2) },
  report: { color: color.stone, fontSize: 13, textDecorationLine: "underline" },
  reported: { opacity: 0.5 },
});
