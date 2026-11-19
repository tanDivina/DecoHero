import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { KeepAllPill, RemoveControls } from "../components/RemoveControls";
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
  /** Furniture marked for removal last time (1.0.7+). */
  initialRemovals: Place[];
  /** The server offers "Take out furniture" (TREE_REMOVE). */
  canRemove: boolean;
  /** The design's one free move is still unused (the server decides; this only sets the label). */
  free: boolean;
  credits: number | null;
  /** Re-runs this one style with the tree on the new spot. 1 credit, or free for the first move of a design. */
  onConfirm: (place: Place, removals: Place[]) => void;
  onOpenShop: () => void;
  onBack: () => void;
};

/** "Move tree" from a Christmas result: tap a new spot on the photo, then run that style again. */
export function MoveTreeScreen({ photo, styleId, initial, initialRemovals, canRemove, free, credits, onConfirm, onOpenShop, onBack }: Props) {
  const [place, setPlace] = useState<Place | null>(initial);
  const [removals, setRemovals] = useState<Place[]>(canRemove ? initialRemovals : []);
  const [tapMode, setTapMode] = useState<"tree" | "remove">("tree");
  const broke = !free && credits !== null && credits < 1;
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
        <View>
          <TreeSpotPhoto
            photo={photo}
            place={place}
            onPlace={setPlace}
            removals={removals}
            tapMode={canRemove ? tapMode : "tree"}
            onRemovals={canRemove ? setRemovals : undefined}
          />
          {canRemove && removals.length > 0 && <KeepAllPill onPress={() => setRemovals([])} />}
        </View>
        {canRemove && (
          <RemoveControls tapMode={tapMode} onTapMode={setTapMode} count={removals.length} />
        )}
        <Text style={styles.text}>{free ? t.moveTreeHintFree : t.moveTreeHint}</Text>
      </ScrollView>
      <View style={styles.footer}>
        {broke && <Text style={styles.instruction}>{t.outOfCredits}</Text>}
        <Button
          label={broke ? t.getCredits : free ? t.moveTreeFree : t.moveTree}
          disabled={!broke && !place}
          onPress={() => (broke ? onOpenShop() : place && onConfirm(place, removals))}
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
