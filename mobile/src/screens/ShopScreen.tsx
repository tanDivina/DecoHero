import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PurchasesPackage } from "react-native-purchases";
import { Button } from "../components/Button";
import { t } from "../i18n";
import { buyPack, getCreditPacks } from "../purchases";
import { color, font, space } from "../theme";

type Props = {
  credits: number | null;
  onBack: () => void;
  /** Polls the server until the webhook has granted credits. */
  waitForCredits: (before: number) => Promise<boolean>;
  onNotice: (msg: string) => void;
};

const BEST_VALUE_ID = "credits_50";

export function ShopScreen({ credits, onBack, waitForCredits, onNotice }: Props) {
  const [packs, setPacks] = useState<PurchasesPackage[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getCreditPacks()
      .then(setPacks)
      .catch(() => setPacks([]));
  }, []);

  async function buy(pkg: PurchasesPackage) {
    setBusy(pkg.identifier);
    try {
      const before = credits ?? 0;
      const ok = await buyPack(pkg);
      if (!ok) return;
      onNotice(t.purchasePending);
      if (await waitForCredits(before)) {
        onNotice(t.purchaseDone);
        onBack();
      }
    } catch {
      onNotice(t.network);
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.link}>{t.back}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>{t.shopTitle}</Text>
        <Text style={styles.sub}>{t.shopSub}</Text>

        {packs === null && <ActivityIndicator color={color.olive} style={{ marginTop: space(8) }} />}
        {packs?.length === 0 && <Text style={styles.sub}>{t.noOfferings}</Text>}

        {packs?.map((pkg) => {
          const best = pkg.product.identifier.startsWith(BEST_VALUE_ID);
          return (
            <View key={pkg.identifier} style={[styles.pack, best && styles.packBest]}>
              <View style={styles.packTop}>
                <Text style={styles.packTitle}>{pkg.product.title.replace(/\s*\(.*\)$/, "")}</Text>
                {best && <Text style={styles.badge}>{t.bestValue}</Text>}
              </View>
              {!!pkg.product.description && <Text style={styles.packDesc}>{pkg.product.description}</Text>}
              <Button
                label={t.buy(pkg.product.priceString)}
                onPress={() => buy(pkg)}
                loading={busy === pkg.identifier}
                disabled={!!busy && busy !== pkg.identifier}
              />
            </View>
          );
        })}
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
  sub: { fontSize: 15, lineHeight: 22, color: color.stone },
  pack: {
    backgroundColor: color.plaster,
    borderRadius: 6,
    padding: space(5),
    gap: space(3),
    borderWidth: 1.5,
    borderColor: color.line,
  },
  packBest: { borderColor: color.brass },
  packTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  packTitle: { fontSize: 18, fontWeight: "700", color: color.ink, flexShrink: 1 },
  badge: { color: color.brass, fontWeight: "700", fontSize: 13 },
  packDesc: { fontSize: 14, color: color.stone },
});
