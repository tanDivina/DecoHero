import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PurchasesPackage } from "react-native-purchases";
import { Button } from "../components/Button";
import { getLocales } from "expo-localization";
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

const HIGHLIGHT_ID = "credits_50"; // "Most popular"

/** Credits in a pack, from its product id (credits_15, credits_15:base, ...). Null if unknown. */
function packCredits(pkg: PurchasesPackage): number | null {
  const m = /credits_(\d+)/.exec(pkg.product.identifier);
  return m ? Number(m[1]) : null;
}

/** Per-design price in the phone's own number format, so it reads like Play's price string next to it. */
function perDesignPrice(pkg: PurchasesPackage, credits: number): string | null {
  const { price, currencyCode } = pkg.product;
  if (!price || !currencyCode) return null;
  const tags = [getLocales()[0]?.languageTag, "en-US"].filter((x): x is string => !!x);
  for (const tag of tags) {
    try {
      return new Intl.NumberFormat(tag, { style: "currency", currency: currencyCode }).format(price / credits);
    } catch {}
  }
  return null;
}

export function ShopScreen({ credits, onBack, waitForCredits, onNotice }: Props) {
  const [packs, setPacks] = useState<PurchasesPackage[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getCreditPacks()
      // Smallest pack first; titles come from the app (not Play) so they follow the app language.
      .then((p) => setPacks([...p].sort((a, b) => (packCredits(a) ?? 0) - (packCredits(b) ?? 0))))
      .catch(() => setPacks([]));
  }, []);

  async function buy(pkg: PurchasesPackage) {
    setBusy(pkg.identifier);
    try {
      const before = credits ?? 0;
      const result = await buyPack(pkg);
      if (result === "cancelled") return;
      if (result === "pending") return onNotice(t.paymentPending);
      if (result === "notAllowed") return onNotice(t.purchaseNotAllowed);
      if (result === "store") return onNotice(t.storeProblem);
      if (result === "network") return onNotice(t.network);
      if (result === "error") return onNotice(t.purchaseFailed);
      onNotice(t.purchasePending);
      if (await waitForCredits(before)) {
        onNotice(t.purchaseDone);
        onBack();
      } else {
        onNotice(t.purchaseSlow);
      }
    } catch {
      onNotice(t.purchaseFailed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.target} accessibilityRole="button">
          <Text style={styles.link}>{t.back}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View>
          <Text style={styles.title}>{t.shopTitle}</Text>
          {credits !== null && <Text style={styles.balance}>{t.youHave(credits)}</Text>}
        </View>
        <Text style={styles.sub}>{t.shopSub}</Text>

        {packs === null && <ActivityIndicator color={color.olive} style={{ marginTop: space(8) }} />}
        {packs?.length === 0 && <Text style={styles.sub}>{t.noOfferings}</Text>}

        {packs?.map((pkg) => {
          const best = pkg.product.identifier.startsWith(HIGHLIGHT_ID);
          const n = packCredits(pkg);
          const each = n ? perDesignPrice(pkg, n) : null;
          return (
            <View key={pkg.identifier} style={[styles.pack, best && styles.packBest]}>
              <View style={styles.packTop}>
                <Text style={styles.packTitle}>{n ? t.packTitle(n) : pkg.product.title.replace(/\s*\(.*\)$/, "")}</Text>
                {best && <Text style={styles.badge}>{t.mostPopular}</Text>}
              </View>
              {!!each && <Text style={styles.packDesc}>{t.perDesign(each)}</Text>}
              <Button
                label={t.buy(pkg.product.priceString)}
                variant={best ? "primary" : "quiet"}
                onPress={() => buy(pkg)}
                loading={busy === pkg.identifier}
                disabled={!!busy && busy !== pkg.identifier}
              />
            </View>
          );
        })}
        {!!packs?.length && <Text style={styles.stay}>{t.creditsStay}</Text>}
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
  balance: { fontSize: 16, fontWeight: "600", color: color.brass, marginTop: space(1) },
  sub: { fontSize: 15, lineHeight: 22, color: color.stone },
  stay: { fontSize: 13, lineHeight: 19, color: color.stone, textAlign: "center" },
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
