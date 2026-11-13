import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ShopLinks } from "../api";
import { Button } from "../components/Button";
import { lang, t } from "../i18n";
import { TREE_PRESETS } from "../stylePresets";
import { color, font, space } from "../theme";

type Props = {
  /** Partner store link for real trees; empty hides that block. */
  treeShopUrl: string;
  /** Decor links per Christmas theme, from the server. */
  shopLinks: ShopLinks;
  /** Opens a shop link outside the app. */
  onOpenLink: (url: string) => void;
  onBack: () => void;
};

/**
 * Every shop link of Christmas mode in one place, reachable from Home without a photo, a design or credits
 * (partner rules: no link may sit behind a payment). Same links and disclosures as under a Christmas result.
 */
export function LooksScreen({ treeShopUrl, shopLinks, onOpenLink, onBack }: Props) {
  const themes = TREE_PRESETS.map((p) => ({ ...p, links: shopLinks[p.id] ?? [] })).filter((p) => p.links.length > 0);
  const all = themes.flatMap((p) => p.links);
  const partnerShown = !!treeShopUrl || all.some((l) => l.kind === "partner");
  const amazonShown = all.some((l) => l.kind === "amazon");
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.target} accessibilityRole="button">
          <Text style={styles.link}>{t.back}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>{t.shopStyles}</Text>
        <Text style={styles.text}>{t.shopStylesIntro}</Text>

        {!!treeShopUrl && (
          <View style={styles.card}>
            <Text style={styles.theme} accessibilityRole="header">{t.realTree}</Text>
            <Button label={t.buyTree} onPress={() => onOpenLink(treeShopUrl)} />
            <Text style={styles.note}>{t.buyTreeNote}</Text>
          </View>
        )}

        {themes.map((p) => (
          <View key={p.id} style={styles.card}>
            <Text style={styles.theme} accessibilityRole="header">{p[lang]}</Text>
            {p.links.map((link, i) => (
              <Button key={`${i}-${link.url}`} label={link[lang]} variant="quiet" onPress={() => onOpenLink(link.url)} />
            ))}
          </View>
        ))}

        {/* One disclosure per kind of link that is actually on screen. */}
        {partnerShown && <Text style={styles.note}>{t.partnerDisclosure}</Text>}
        {amazonShown && <Text style={styles.note}>{t.amazonDisclosure}</Text>}
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
    backgroundColor: color.plaster,
    borderRadius: 6,
    padding: space(4),
    gap: space(3),
    borderWidth: 1.5,
    borderColor: color.line,
  },
  theme: { fontFamily: font.display, fontSize: 24, color: color.ink },
  note: { fontSize: 12, lineHeight: 16, color: color.stone },
});
