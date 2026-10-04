import { useState } from "react";
import {
  ActivityIndicator, FlatList, Image, NativeScrollEvent, NativeSyntheticEvent,
  Pressable, StyleSheet, Text, View, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { styleName, t } from "../i18n";
import { color, font, space } from "../theme";

export type Result = {
  styleId: string;
  status: "loading" | "done" | "error";
  uri?: string;
  errorCode?: string;
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
  onOpenShop: () => void;
};

export function ResultsScreen({ originalUri, aspect, results, onBack, onSave, onShare, onReport, onOpenShop }: Props) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [comparing, setComparing] = useState(false);
  const current = results[index];

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button">
          <Text style={styles.link}>{t.back}</Text>
        </Pressable>
        {results.length > 1 && (
          <Text style={styles.counter}>
            {index + 1} / {results.length}
          </Text>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(r) => r.styleId}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: space(5) }}>
            <Pressable
              onPressIn={() => item.status === "done" && setComparing(true)}
              onPressOut={() => setComparing(false)}
              accessibilityHint={t.holdToCompare}
            >
              <Image
                source={{ uri: item.status === "done" && !comparing ? item.uri : originalUri }}
                style={[styles.image, { aspectRatio: aspect }]}
                resizeMode="cover"
              />
              {comparing && item.status === "done" && (
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

            {item.status === "error" && (
              <View style={{ gap: space(3) }}>
                <Text style={styles.error}>
                  {item.errorCode === "NO_CREDITS" ? t.outOfCredits : item.errorCode === "NETWORK" ? t.network : t.failed}
                </Text>
                {item.errorCode === "NO_CREDITS" && <Button label={t.getCredits} onPress={onOpenShop} />}
              </View>
            )}
          </View>
        )}
      />

      {current?.status === "done" && (
        <View style={styles.actions}>
          <Text style={styles.hint}>{t.holdToCompare}</Text>
          <View style={styles.row}>
            <Button label={t.save} onPress={() => onSave(current)} style={styles.flex} />
            <Button label={t.share} variant="quiet" onPress={() => onShare(current)} style={styles.flex} />
          </View>
          <View style={styles.footRow}>
            <Text style={styles.notice}>{t.aiNotice}</Text>
            <Pressable onPress={() => onReport(current)} disabled={current.reported} hitSlop={8}>
              <Text style={[styles.report, current.reported && { opacity: 0.4 }]}>{t.report}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.bottom}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.link}>{t.tryMore}</Text>
        </Pressable>
      </View>
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
    paddingVertical: space(3),
  },
  link: { color: color.olive, fontWeight: "600", fontSize: 16 },
  counter: { color: color.stone, fontSize: 15, fontVariant: ["tabular-nums"] },
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
  styleTitle: { fontFamily: font.display, fontSize: 32, color: color.ink, marginTop: space(3), marginBottom: space(2) },
  error: { color: color.danger, fontSize: 15, lineHeight: 21 },
  actions: { paddingHorizontal: space(5), gap: space(3) },
  hint: { color: color.stone, fontSize: 13 },
  row: { flexDirection: "row", gap: space(3) },
  flex: { flex: 1 },
  footRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space(4) },
  notice: { flex: 1, color: color.stone, fontSize: 12, lineHeight: 16 },
  report: { color: color.stone, fontSize: 13, textDecorationLine: "underline" },
  bottom: { alignItems: "center", paddingVertical: space(4) },
});
