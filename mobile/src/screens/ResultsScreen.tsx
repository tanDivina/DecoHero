import { useState } from "react";
import {
  ActivityIndicator, FlatList, Image, NativeScrollEvent, NativeSyntheticEvent,
  Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { redesignErrorMessage, styleName, t } from "../i18n";
import { color, font, space } from "../theme";

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
  /** Width ÷ height of the original photo; designs are shown at the same shape. */
  aspect: number;
  results: Result[];
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

export function ResultsScreen({ originalUri, aspect, results, onBack, onSave, onShare, onReport, onRetry, onOpenShop }: Props) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [comparing, setComparing] = useState<string | null>(null);

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
                  style={[styles.image, { aspectRatio: aspect }]}
                  resizeMode="cover"
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
  footRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space(4) },
  notice: { flex: 1, color: color.stone, fontSize: 12, lineHeight: 16 },
  reportTarget: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "flex-end", paddingLeft: space(2) },
  report: { color: color.stone, fontSize: 13, textDecorationLine: "underline" },
  reported: { opacity: 0.5 },
});
