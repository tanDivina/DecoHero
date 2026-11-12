import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { t } from "../i18n";
import { color, font, space } from "../theme";

export const PRIVACY_URL = "https://hero-apps.com/decohero/privacy.html";

type Props = {
  installId: string | null;
  onBack: () => void;
};

export function AboutScreen({ installId, onBack }: Props) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button">
          <Text style={styles.link}>{t.back}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>{t.aboutTitle}</Text>
        <Text style={styles.text}>{t.aboutBody}</Text>
        <Text style={styles.text}>{t.aiNotice}</Text>

        <Pressable onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} accessibilityRole="link" hitSlop={8}>
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
              onPress={() => Share.share({ message: `DecoHero install ID: ${installId}` }).catch(() => {})}
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
});
