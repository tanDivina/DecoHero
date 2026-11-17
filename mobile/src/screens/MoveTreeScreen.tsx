import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { TreeSpotPhoto } from "../components/TreeSpotPhoto";
import { styleName, t } from "../i18n";
import type { Photo, Place } from "../photoShape";
import { color, font, space } from "../theme";

type Props = {
  /** The photo the design was made from. */
  photo: Photo;
  styleId: string;
  /** Where the tree was asked to stand last time, if the user picked a spot. */
  initial: Place | null;
  credits: number | null;
  /** Re-runs this one style with the tree on the new spot. Costs 1 credit like any design. */
  onConfirm: (place: Place) => void;
  onOpenShop: () => void;
  onBack: () => void;
};

/** "Move tree" from a Christmas result: tap a new spot on the photo, then run that style again. */
export function MoveTreeScreen({ photo, styleId, initial, credits, onConfirm, onOpenShop, onBack }: Props) {
  const [place, setPlace] = useState<Place | null>(initial);
  const broke = credits !== null && credits < 1;
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.target} accessibilityRole="button">
          <Text style={styles.link}>{t.back}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>{t.moveTreeTitle}</Text>
        <Text style={styles.style}>{styleName(styleId)}</Text>
        <TreeSpotPhoto photo={photo} place={place} onPlace={setPlace} />
        <Text style={styles.text}>{t.moveTreeHint}</Text>
      </ScrollView>
      <View style={styles.footer}>
        {broke && <Text style={styles.instruction}>{t.outOfCredits}</Text>}
        <Button
          label={broke ? t.getCredits : t.moveTree}
          disabled={!broke && !place}
          onPress={() => (broke ? onOpenShop() : place && onConfirm(place))}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.limewash },
  header: { paddingHorizontal: space(5), paddingVertical: space(1) },
  target: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  link: { color: color.olive, fontWeight: "600", fontSize: 16 },
  body: { paddingHorizontal: space(5), paddingBottom: space(8), gap: space(3) },
  title: { fontFamily: font.display, fontSize: 34, color: color.ink },
  style: { fontSize: 15, color: color.stone, marginTop: -space(2) },
  text: { fontSize: 15, lineHeight: 22, color: color.ink },
  instruction: { color: color.stone, fontSize: 14, textAlign: "center", marginBottom: space(2) },
  footer: { paddingHorizontal: space(5), paddingTop: space(3), paddingBottom: space(2), backgroundColor: color.limewash },
});
