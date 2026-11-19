import { useState } from "react";
import {
  ActivityIndicator, FlatList, Image, NativeScrollEvent, NativeSyntheticEvent,
  Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import type { ShopLinks } from "../api";
import { canShareImages } from "../files";
import { buyTreeLabel, lang, redesignErrorMessage, styleName, t, treeForCeiling } from "../i18n";
import type { Place } from "../photoShape";
import { isTreeStyle } from "../stylePresets";
import { color, font, space } from "../theme";
import type { TreeFit } from "../treeSize";

export type Result = {
  styleId: string;
  /** One per attempt; a retry gets a new one so late answers from an older attempt are ignored. */
  requestId: string;
  status: "loading" | "done" | "error";
  uri?: string;
  errorCode?: string;
  retryAfterSec?: number;
  reported?: boolean;
  /** Christmas only: the spot the user tapped for the tree in this attempt; missing = DecoHero chose. */
  place?: Place | null;
  /** Christmas only (1.0.7+): furniture taken out in this attempt. */
  remove?: Place[];
  /** Christmas only (1.0.8+): made with "Decorate whole room". */
  decor?: boolean;
  /** Christmas only: the server's id for this design, sent back as moveOf by "Move tree". */
  designId?: string;
  /** The design's one free move is still unused. */
  freeMove?: boolean;
  /** Set when this attempt is a move: the designId it moves, so a retry after an error is the same move. */
  moveOf?: string;
};

type Props = {
  originalUri: string;
  /** Width ÷ height of the original photo; used until a design has loaded and reports its own shape. */
  aspect: number;
  results: Result[];
  /** Ceiling, tree height and recommended product of a Christmas run; null for room designs. */
  tree: TreeFit | null;
  /** Style to open on (after "Move tree"); the first design otherwise. */
  startAt?: string;
  /** Christmas results: pick a new spot for the tree and run that style again (1 credit). */
  onMoveTree: (r: Result) => void;
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
const WEB = Platform.OS === "web";
// Web: from this window width up, designs sit side by side instead of one per row.
const TWO_COLUMNS_FROM = 900;

export function ResultsScreen({
  originalUri, aspect, results, tree, startAt, treeShopUrl, shopLinks, onOpenLink, onBack, onSave, onShare, onReport, onRetry,
  onMoveTree, onOpenShop,
}: Props) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(() => Math.max(0, results.findIndex((r) => r.styleId === startAt)));
  const [comparing, setComparing] = useState<string | null>(null);
  // Real width ÷ height of each loaded design, by file uri. The model doesn't always keep the photo's shape.
  const [shapes, setShapes] = useState<Record<string, number>>({});
  // Always true on the phone. In a browser Share is hidden unless it can share image files.
  const [canShare] = useState(canShareImages);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  }

  /** One design: photo (hold to compare), style name, then its actions or its error. */
  function renderCard(item: Result) {
    const done = item.status === "done";
    const showOriginal = done && comparing === item.styleId;
    const designUri = done ? item.uri : undefined;
    const shape = designUri ? shapes[designUri] : undefined;
    const christmas = isTreeStyle(item.styleId);
    const showTree = !!tree && christmas;
    // "Shop this look": the real tree first, then this theme's decor. No links at all = no section.
    const decor = christmas ? shopLinks[item.styleId] ?? [] : [];
    const showShop = christmas && (!!treeShopUrl || decor.length > 0);
    // The real tree to order for this ceiling; its link already carries the affiliate parameters.
    const product = showTree && tree && treeShopUrl ? tree.product : null;
    // Disclosures follow the links: the tree button carries its own, plain decor links carry none.
    const partnerShown = decor.some((l) => l.kind === "partner");
    const amazonShown = decor.some((l) => l.kind === "amazon");
    return (
      <>
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
              // The phone reports the size as `source`; a browser only gives the loaded <img> itself.
              const img = (e.nativeEvent as unknown as { target?: { naturalWidth?: number; naturalHeight?: number } }).target;
              const { width: w, height: h } = e.nativeEvent.source ?? { width: img?.naturalWidth, height: img?.naturalHeight };
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
              {canShare && (
              <Button
                label={t.share}
                variant="quiet"
                onPress={() => onShare(item)}
                style={styles.flex}
                maxFontSizeMultiplier={MAX_SCALE}
              />
              )}
            </View>
            {christmas && (
              <Button label={item.freeMove ? t.moveTreeFree : t.moveTree} variant="quiet" onPress={() => onMoveTree(item)} maxFontSizeMultiplier={MAX_SCALE} />
            )}
            {(showTree || showShop) && (
              <View style={styles.treeCard}>
                {showTree && tree && (
                  <>
                    <Text style={styles.treeTitle}>
                      {treeForCeiling(tree, !!treeShopUrl)}
                    </Text>
                    <Text style={styles.treeText}>{t.treeEstimate}</Text>
                  </>
                )}
                {showShop && (
                  <>
                    <Text style={styles.shopTitle} accessibilityRole="header">{t.shopLook}</Text>
                    {!!treeShopUrl && (
                      <>
                        <Button
                          label={product ? buyTreeLabel(product) : t.buyTree}
                          onPress={() => onOpenLink(product ? product.url : treeShopUrl)}
                          maxFontSizeMultiplier={MAX_SCALE}
                        />
                        {/* The picture shows a flocked tree; the shop sells the same fir without the snow. */}
                        {product && item.styleId === "xmas-winter" && (
                          <Text style={styles.flock}>{t.flockNote(t.species(product.species))}</Text>
                        )}
                        <Text style={styles.treeNote}>{t.buyTreeNote} {t.partnerDisclosure}{product ? ` ${t.pricesNote}` : ""}</Text>
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
                    {/* One disclosure per kind of affiliate decor link that is actually on screen. */}
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
      </>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.target} accessibilityRole="button">
          <Text style={styles.link}>{t.back}</Text>
        </Pressable>
        {results.length > 1 && !WEB && (
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

      {WEB ? (
        // Web: every design on one scrolling page, two across on wide windows. No swiping needed.
        <ScrollView style={styles.flex} contentContainerStyle={[styles.page, styles.grid]}>
          {results.map((r) => (
            <View key={r.styleId} style={width >= TWO_COLUMNS_FROM && results.length > 1 ? styles.cellHalf : styles.cellFull}>
              {renderCard(r)}
            </View>
          ))}
        </ScrollView>
      ) : (
      <FlatList
        style={styles.flex}
        data={results}
        keyExtractor={(r) => r.styleId}
        horizontal
        pagingEnabled
        // Pages are exactly one screen wide, so the list can open on any of them.
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        initialScrollIndex={index}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          // Each page scrolls on its own so tall portrait photos never push the actions off small screens.
          <ScrollView style={{ width }} contentContainerStyle={styles.page}>
            {renderCard(item)}
          </ScrollView>
        )}
      />
      )}
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
  flock: { fontSize: 14, lineHeight: 20, color: color.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space(8) },
  cellHalf: { width: "48.5%" },
  cellFull: { width: "100%", maxWidth: 720, marginHorizontal: "auto" },
  footRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space(4) },
  notice: { flex: 1, color: color.stone, fontSize: 12, lineHeight: 16 },
  reportTarget: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "flex-end", paddingLeft: space(2) },
  report: { color: color.stone, fontSize: 13, textDecorationLine: "underline" },
  reported: { opacity: 0.5 },
});
