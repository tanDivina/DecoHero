import { Pressable, StyleSheet, Text, View } from "react-native";
import { t } from "../i18n";
import { color, radius, space } from "../theme";

type Props = {
  tapMode: "tree" | "remove";
  onTapMode: (mode: "tree" | "remove") => void;
  /** Pieces marked so far. */
  count: number;
  /** False on regular redesigns (1.0.8+): no tree spot, so no toggle; every tap on the photo marks a piece. */
  tree?: boolean;
};

/**
 * "Take out furniture" (app 1.0.7+, server TREE_REMOVE): what a tap on the photo does, tree spot or X mark,
 * plus the honest warning (and, on room redesigns, that one chair of a set can come back) that a piece touching a marked one can go too.
 */
export function RemoveControls({ tapMode, onTapMode, count, tree = true }: Props) {
  const removing = tapMode === "remove";
  if (!tree) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.heading}>{count ? `${t.tapRemove} (${count})` : t.tapRemove}</Text>
        <Text style={styles.text}>{count ? t.removeSet(count) : t.removeHintRoom}</Text>
        {/* 1.0.10: with pieces marked the server edits the photo first, then restyles it. */}
        {count > 0 && <Text style={styles.text}>{t.removeSlowNote}</Text>}
        <Text style={styles.tip}>{t.removeTipRoom}</Text>
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <View style={styles.segment} accessibilityRole="tablist">
        {(["tree", "remove"] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => onTapMode(m)}
            style={[styles.option, tapMode === m && styles.optionOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tapMode === m }}
          >
            <Text style={[styles.optionText, tapMode === m && styles.optionTextOn]}>
              {m === "tree" ? t.tapTree : count ? `${t.tapRemove} (${count})` : t.tapRemove}
            </Text>
          </Pressable>
        ))}
      </View>
      {removing && (
        <>
          <Text style={styles.text}>{count ? t.removeSet(count) : t.removeHint}</Text>
          <Text style={styles.tip}>{t.removeTip}</Text>
        </>
      )}
    </View>
  );
}

/**
 * "Keep all furniture", drawn on the photo's top-right corner (1.0.9). Below the photo it sat off screen while
 * people were tapping, so they could not find how to undo. Place it inside the View that wraps the photo.
 */
export function KeepAllPill({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.pill} accessibilityRole="button" hitSlop={8}>
      <Text style={styles.pillText} maxFontSizeMultiplier={1.3}>{t.removeKeepAll}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space(3), gap: space(2) },
  segment: { flexDirection: "row", borderWidth: 1, borderColor: color.line, borderRadius: radius.control, padding: 3, backgroundColor: color.plaster },
  option: { flex: 1, minHeight: 40, borderRadius: radius.control, alignItems: "center", justifyContent: "center", paddingHorizontal: space(2) },
  optionOn: { backgroundColor: color.olive },
  optionText: { color: color.ink, fontSize: 14, fontWeight: "600", textAlign: "center" },
  optionTextOn: { color: color.white },
  heading: { color: color.ink, fontSize: 15, fontWeight: "600" },
  text: { color: color.stone, fontSize: 14, lineHeight: 20 },
  pill: { position: "absolute", top: space(2), right: space(2), minHeight: 36, justifyContent: "center", paddingHorizontal: space(3), borderRadius: 18, backgroundColor: "rgba(31,36,30,0.78)" },
  pillText: { color: color.white, fontSize: 14, fontWeight: "600" },
  tip: { color: color.ink, fontSize: 14, lineHeight: 20, backgroundColor: color.brassWash, borderRadius: radius.chip, padding: space(3) },
});
