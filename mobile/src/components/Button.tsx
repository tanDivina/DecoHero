import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { color, radius, space } from "../theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "quiet";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  /** Cap for large system font sizes where the button sits in a tight row. */
  maxFontSizeMultiplier?: number;
};

export function Button({ label, onPress, variant = "primary", disabled, loading, style, maxFontSizeMultiplier }: Props) {
  const primary = variant === "primary";
  // Disabled = solid, readable fill (not a faded button) so the label still reads.
  const textColor = disabled ? color.stone : primary ? color.white : color.olive;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.quiet,
        disabled && styles.disabled,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? color.white : color.olive} />
      ) : (
        <Text style={[styles.label, { color: textColor }]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: space(6),
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: color.olive },
  quiet: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: color.olive },
  disabled: { backgroundColor: color.disabled, borderColor: color.disabled },
  label: { fontSize: 16, fontWeight: "600", letterSpacing: 0.2 },
});
