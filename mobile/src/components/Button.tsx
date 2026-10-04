import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { color, radius, space } from "../theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "quiet";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = "primary", disabled, loading, style }: Props) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.quiet,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? color.white : color.olive} />
      ) : (
        <Text style={[styles.label, { color: primary ? color.white : color.olive }]}>{label}</Text>
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
  label: { fontSize: 16, fontWeight: "600", letterSpacing: 0.2 },
});
