import { Pressable, StyleSheet, Text, View } from "react-native";
import { t } from "../i18n";
import { color, radius, space } from "../theme";

type Props = {
  tapMode: "tree" | "remove";
  onTapMode: (mode: "tree" | "remove") => void;
  /** Pieces marked so far. */
  count: number;
  onKeepAll: () => void;
};

/**
 * "Take out furniture" (app 1.0.7+, server TREE_REMOVE): what a tap on the photo does, tree spot or X mark,
 * plus the honest warning that a piece touching a marked one can go too.
 */
export function RemoveControls({ tapMode, onTapMode, count, onKeepAll }: Props) {
  const removing = tapMode === "remove";
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
      {count > 0 && (
        <Pressable onPress={onKeepAll} style={styles.linkTarget} accessibilityRole="button">
          <Text style={styles.link}>{t.removeKeepAll}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space(3), gap: space(2) },
  segment: { flexDirection: "row", borderWidth: 1, borderColor: color.line, borderRadius: radius.control, padding: 3, backgroundColor: color.plaster },
  option: { flex: 1, minHeight: 40, borderRadius: radius.control, alignItems: "center", justifyContent: "center", paddingHorizontal: space(2) },
  optionOn: { backgroundColor: color.olive },
  optionText: { color: color.ink, fontSize: 14, fontWeight: "600", textAlign: "center" },
  optionTextOn: { color: color.white },
  text: { color: color.stone, fontSize: 14, lineHeight: 20 },
  tip: { color: color.ink, fontSize: 14, lineHeight: 20, backgroundColor: color.brassWash, borderRadius: radius.chip, padding: space(3) },
  linkTarget: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  link: { color: color.olive, fontWeight: "600", fontSize: 15 },
});
