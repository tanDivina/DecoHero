import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { t, type Lang } from "../i18n";
import { color, font, radius, space } from "../theme";

export const PRIVACY_URL = "https://hero-apps.com/decohero/privacy.html";

/** "phone" = no in-app choice, follow the phone / Android per-app language. */
export type LangChoice = Lang | "phone";

type Props = {
  installId: string | null;
  langChoice: LangChoice;
  onChangeLang: (l: LangChoice) => void;
  onBack: () => void;
};

export function AboutScreen({ installId, langChoice, onChangeLang, onBack }: Props) {
  const langs: { id: LangChoice; label: string }[] = [
    { id: "phone", label: t.phoneLanguage },
    { id: "en", label: "English" },
    { id: "es", label: "Español" },
  ];
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.target} accessibilityRole="button">
          <Text style={styles.link}>{t.back}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>{t.aboutTitle}</Text>

        <View style={styles.langBlock}>
          <Text style={styles.label}>{t.language}</Text>
          <View style={styles.langRow} accessibilityRole="radiogroup">
            {langs.map((l) => {
              const on = l.id === langChoice;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => onChangeLang(l.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.langOption, on && styles.langOptionOn]}
                >
                  <Text style={styles.langText}>{l.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Text style={styles.text}>{t.aboutBody}</Text>
        <Text style={styles.text}>{t.aiNotice}</Text>

        <Pressable
          onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
          style={styles.target}
          accessibilityRole="link"
        >
          <Text style={styles.link}>{t.privacyPolicy}</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.label}>{t.installIdLabel}</Text>
          <Text style={styles.id} selectable>
            {installId ?? "…"}
          </Text>
          <Text style={styles.help}>{t.installIdHelp}</Text>
          {installId && (
            <Button
              label={t.shareInstallId}
              variant="quiet"
              onPress={() => Share.share({ message: t.installIdShare(installId) }).catch(() => {})}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.limewash },
  header: { paddingHorizontal: space(5), paddingVertical: space(3) },
  target: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  link: { color: color.olive, fontWeight: "600", fontSize: 16 },
  body: { paddingHorizontal: space(5), paddingBottom: space(10), gap: space(4) },
  title: { fontFamily: font.display, fontSize: 40, color: color.ink },
  text: { fontSize: 15, lineHeight: 22, color: color.ink },
  card: {
    marginTop: space(2),
    backgroundColor: color.plaster,
    borderRadius: 6,
    padding: space(5),
    gap: space(3),
    borderWidth: 1.5,
    borderColor: color.line,
  },
  label: { fontSize: 14, fontWeight: "700", color: color.stone },
  id: { fontSize: 15, color: color.ink, fontVariant: ["tabular-nums"] },
  help: { fontSize: 14, lineHeight: 20, color: color.stone },
  langBlock: { gap: space(2) },
  langRow: { flexDirection: "row", gap: space(2) },
  // Selection is border + fill only (no bold), so labels don't reflow when tapped.
  langOption: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space(2),
    paddingVertical: space(2),
    borderRadius: radius.chip,
    backgroundColor: color.plaster,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  langOptionOn: { borderColor: color.brass, backgroundColor: color.brassWash },
  langText: { fontSize: 15, lineHeight: 19, color: color.ink, textAlign: "center" },
});
