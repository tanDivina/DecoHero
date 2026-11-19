import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { RemoveControls } from "../components/RemoveControls";
import { TreeSpotPhoto } from "../components/TreeSpotPhoto";
import { t, styleName, treeAdvice, treeDescription, treeSizeLabel } from "../i18n";
import { MAX_STYLES_PER_RUN, STYLE_PRESETS, TREE_PRESETS } from "../stylePresets";
import { Ceiling, TreeProduct, Unit, ceilingCm, switchUnit, treeFit, treeOptions } from "../treeSize";
import { color, font, radius, space } from "../theme";
import { Photo, Place, choosePhoto, takePhoto } from "../photo";
import { usePhotoDrop } from "../photoDrop";

// Large system font sizes still scale these, just not past the point where the row or grid breaks.
const MAX_SCALE = 1.3;
// Web: one file picker (phones offer the camera from it) plus drag-and-drop, instead of Camera / Gallery.
const WEB = Platform.OS === "web";

type Props = {
  credits: number | null;
  /** Server says free designs are off for this device/network; packs still work. */
  freeDenied: boolean;
  photo: Photo | null;
  onPhoto: (p: Photo) => void;
  /** Christmas mode: the spot the user tapped for the tree; null = DecoHero chooses. */
  place: Place | null;
  onPlace: (place: Place | null) => void;
  /** Christmas mode: furniture the user lets us take out (1.0.7+). */
  removals: Place[];
  onRemovals: (removals: Place[]) => void;
  /** The server offers "Take out furniture" (TREE_REMOVE). */
  canRemove: boolean;
  /** The server offers "Take out furniture" on regular redesigns (STYLE_REMOVE, 1.0.8+). */
  canStyleRemove: boolean;
  /** The server offers "Decorate whole room" (ROOM_DECOR, 1.0.8+), and its checkbox. */
  canDecorate: boolean;
  decorateRoom: boolean;
  onDecorateRoom: (on: boolean) => void;
  /** The partner's trees, for the live recommendation. */
  treeCatalog: TreeProduct[];
  /** False when the server switched the tree shop off: sizes are shown without product names or prices. */
  treeShop: boolean;
  mode: "rooms" | "christmas";
  /** Missing when the server has switched Christmas mode off: the switch is hidden. */
  onMode?: (mode: "rooms" | "christmas") => void;
  /** Picks of the current mode. */
  selected: string[];
  onSelect: (styleIds: string[]) => void;
  ceiling: Ceiling;
  onCeiling: (c: Ceiling) => void;
  /** Product id of the tree size the user picked; null = the recommended (tallest) tree that fits. */
  treeChoice: string | null;
  onTreeChoice: (id: string | null) => void;
  onRedesign: (styleIds: string[]) => void;
  /** Shown when finished designs from the last run can be reopened. */
  onViewResults?: () => void;
  onOpenShop: () => void;
  onOpenAbout: () => void;
  /** Opens the list of shop links per Christmas style; missing when there are no links at all. */
  onOpenLooks?: () => void;
  onNotice: (msg: string) => void;
};

export function HomeScreen({
  credits, freeDenied, photo, onPhoto, place, onPlace, removals, onRemovals, canRemove, canStyleRemove, canDecorate, decorateRoom, onDecorateRoom, treeCatalog, treeShop, mode, onMode, selected, onSelect, ceiling, onCeiling,
  treeChoice, onTreeChoice, onRedesign, onViewResults, onOpenShop, onOpenAbout, onOpenLooks, onNotice,
}: Props) {
  const christmas = mode === "christmas";
  const presets = christmas ? TREE_PRESETS : STYLE_PRESETS;
  const height = christmas ? ceilingCm(ceiling) : null;
  const badCeiling = christmas && height === null;
  // The tree this run will draw and link to: the recommended one, or the smaller size picked below.
  const fit = height === null ? null : treeFit(height, ceiling.unit, treeCatalog, treeChoice);
  const sizes = height === null ? [] : treeOptions(height, treeCatalog);
  const [picking, setPicking] = useState<"camera" | "gallery" | null>(null);
  // What a tap on the photo does in Christmas mode: set the tree spot, or mark furniture to take out.
  const [tapMode, setTapMode] = useState<"tree" | "remove">("tree");
  const removing = christmas && canRemove && tapMode === "remove";
  // Marked furniture counts when the option is on for this mode; in Christmas mode it needs a tree spot to make room at.
  const canMark = christmas ? canRemove : canStyleRemove;
  const marked = canMark ? removals : [];
  const needsSpot = christmas && marked.length > 0 && !place;
  // Web: adjustsFontSizeToFit does nothing in a browser, so long names ("Tropical moderno") wrap to two
  // lines there, in slightly smaller type on narrow phones.
  const { width } = useWindowDimensions();
  const chipTextWeb = WEB && (width < 400 ? styles.chipTextWebNarrow : styles.chipTextWeb);
  const { dragging, canDrop } = usePhotoDrop(onPhoto, () => onNotice(t.photoFailed));

  async function pick(source: "camera" | "gallery") {
    setPicking(source);
    try {
      const r = source === "camera" ? await takePhoto() : await choosePhoto();
      if (r.denied) onNotice(t.cameraDenied);
      if (r.failed) onNotice(t.photoFailed);
      if (r.photo) onPhoto(r.photo);
    } finally {
      setPicking(null);
    }
  }

  function toggle(id: string) {
    if (selected.includes(id)) return onSelect(selected.filter((x) => x !== id));
    if (selected.length >= MAX_STYLES_PER_RUN) return onNotice(t.maxStyles);
    onSelect([...selected, id]);
  }

  const ready = !!photo && selected.length > 0 && !badCeiling && !needsSpot;
  // Known balance too low for this run: send them to the shop instead of firing requests that will all fail.
  const short = ready && credits !== null && credits < selected.length;
  const instruction =
    !photo && !selected.length ? (christmas ? t.pickFirstTree : t.pickFirst)
    : !photo ? t.needPhoto
    : !selected.length ? (christmas ? t.needTree : t.needStyle)
    : badCeiling ? t.ceilingRange(ceiling.unit)
    : needsSpot ? t.removeNeedsSpot
    : null;
  const units: Unit[] = ["ft", "m"];

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.brand}>DecoHero</Text>
        <Pressable
          onPress={onOpenShop}
          style={styles.creditPill}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={credits === null ? t.getCredits : `${t.credits(credits)}. ${t.getCredits}`}
        >
          <Text style={styles.creditText} maxFontSizeMultiplier={MAX_SCALE}>
            {credits === null ? "…" : t.credits(credits)}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {freeDenied && credits === 0 && (
          <View style={styles.freeDenied}>
            <Text style={styles.freeDeniedText}>{t.freeDenied}</Text>
            <Pressable onPress={onOpenShop} style={styles.linkTarget} accessibilityRole="button">
              <Text style={styles.link}>{t.getCredits}</Text>
            </Pressable>
          </View>
        )}

        {photo ? (
          <View>
            <TreeSpotPhoto
              photo={photo}
              place={christmas ? place : null}
              onPlace={christmas ? onPlace : undefined}
              removals={marked}
              tapMode={removing ? "remove" : "tree"}
              onRemovals={canMark ? onRemovals : undefined}
            />
            {canMark && (
              <RemoveControls
                tree={christmas}
                tapMode={christmas ? tapMode : "remove"}
                onTapMode={setTapMode}
                count={marked.length}
                onKeepAll={() => onRemovals([])}
              />
            )}
            {christmas && !removing && (
              <View style={styles.placeRow}>
                <Text style={styles.placeText}>{place ? t.placeSet : t.placeHint}</Text>
                {place && (
                  <Pressable onPress={() => onPlace(null)} style={styles.linkTarget} accessibilityRole="button">
                    <Text style={styles.link}>{t.placeAuto}</Text>
                  </Pressable>
                )}
              </View>
            )}
            <View style={styles.changeRow}>
              {WEB ? (
                <Pressable onPress={() => pick("gallery")} disabled={!!picking} style={[styles.linkTarget, styles.changeWeb]} accessibilityRole="button">
                  <Text style={styles.link}>{dragging ? t.dropHere : t.changePhoto}</Text>
                </Pressable>
              ) : (
              <>
              <Text style={styles.changeLabel}>{t.changePhoto}</Text>
              <Pressable
                onPress={() => pick("camera")}
                disabled={!!picking}
                style={styles.linkTarget}
                accessibilityRole="button"
                accessibilityLabel={`${t.changePhoto}: ${t.camera}`}
              >
                <Text style={styles.link}>{t.camera}</Text>
              </Pressable>
              <Pressable
                onPress={() => pick("gallery")}
                disabled={!!picking}
                style={styles.linkTarget}
                accessibilityRole="button"
                accessibilityLabel={`${t.changePhoto}: ${t.gallery}`}
              >
                <Text style={styles.link}>{t.gallery}</Text>
              </Pressable>
              </>
              )}
            </View>
          </View>
        ) : (
          <View style={[styles.emptyFrame, dragging && styles.emptyFrameDrop]}>
            <Text style={styles.tagline}>{dragging ? t.dropHere : christmas ? t.treeTagline : t.tagline}</Text>
            {WEB ? (
              <Button label={t.choosePhotoWeb} onPress={() => pick("gallery")} loading={picking === "gallery"} />
            ) : (
            <>
            <Button label={t.takePhoto} onPress={() => pick("camera")} loading={picking === "camera"} disabled={picking === "gallery"} />
            <Button label={t.choosePhoto} variant="quiet" onPress={() => pick("gallery")} loading={picking === "gallery"} disabled={picking === "camera"} />
            </>
            )}
            <Text style={styles.tip}>{t.tip}</Text>
            {canDrop && <Text style={styles.tip}>{t.dropHint}</Text>}
          </View>
        )}

        {onViewResults && (
          <Pressable onPress={onViewResults} style={[styles.linkTarget, styles.viewResults]} accessibilityRole="button">
            <Text style={styles.link}>{t.viewResults}</Text>
          </Pressable>
        )}

        {onMode && (
          <View style={styles.modes} accessibilityRole="radiogroup">
            {(["rooms", "christmas"] as const).map((m) => {
              const on = m === mode;
              return (
                <Pressable
                  key={m}
                  onPress={() => onMode(m)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.mode, on && styles.modeOn]}
                >
                  {m === "christmas" && <TreeMark />}
                  <Text style={styles.modeText} maxFontSizeMultiplier={MAX_SCALE}>
                    {m === "christmas" ? t.modeChristmas : t.modeRooms}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={[styles.sectionTitle, onMode && styles.sectionAfterModes]}>{christmas ? t.pickTrees : t.pickStyles}</Text>
        {christmas && <Text style={styles.intro}>{t.treeIntro}</Text>}
        <View style={styles.chips}>
          {presets.map((s) => {
            const on = selected.includes(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => toggle(s.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={styleName(s.id)}
                style={[styles.chip, on && styles.chipOn]}
              >
                {on && <View style={styles.chipMark} />}
                <Text
                  style={[styles.chipText, chipTextWeb]}
                  numberOfLines={WEB ? 2 : 1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  maxFontSizeMultiplier={MAX_SCALE}
                >
                  {styleName(s.id)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {christmas && canDecorate && (
          <Pressable
            onPress={() => onDecorateRoom(!decorateRoom)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: decorateRoom }}
            accessibilityLabel={`${t.decorateRoom}. ${t.decorateRoomHint}`}
            style={styles.checkRow}
          >
            <View style={[styles.checkBox, decorateRoom && styles.checkBoxOn]}>{decorateRoom && <View style={styles.checkTick} />}</View>
            <View style={styles.checkTexts}>
              <Text style={styles.checkLabel} maxFontSizeMultiplier={MAX_SCALE}>{t.decorateRoom}</Text>
              <Text style={styles.checkHint} maxFontSizeMultiplier={MAX_SCALE}>{t.decorateRoomHint}</Text>
            </View>
          </Pressable>
        )}

        {christmas && (
          <View>
            <Text style={styles.sectionTitle}>{t.ceilingTitle}</Text>
            <View style={styles.ceilingRow}>
              <TextInput
                value={ceiling.text}
                onChangeText={(text) => onCeiling({ ...ceiling, text })}
                keyboardType="decimal-pad"
                maxLength={5}
                selectTextOnFocus
                returnKeyType="done"
                accessibilityLabel={`${t.ceilingTitle}, ${t.ceilingUnit(ceiling.unit)}`}
                style={[styles.ceilingInput, badCeiling && styles.ceilingInputBad]}
                maxFontSizeMultiplier={MAX_SCALE}
              />
              <View style={styles.units} accessibilityRole="radiogroup">
                {units.map((u) => {
                  const on = u === ceiling.unit;
                  return (
                    <Pressable
                      key={u}
                      onPress={() => onCeiling(switchUnit(ceiling, u))}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={t.ceilingUnit(u)}
                      style={[styles.unit, on && styles.modeOn]}
                    >
                      <Text style={styles.modeText} maxFontSizeMultiplier={MAX_SCALE}>{u}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Text style={[styles.fit, badCeiling && styles.fitBad]}>
              {height === null
                ? t.ceilingRange(ceiling.unit)
                : `${treeAdvice(fit!, ceiling.unit, treeShop, height)} ${t.treeEstimate}`}
            </Text>
            {/* Smaller sizes from the partner's catalogue; the last pill is the recommended tree. */}
            {sizes.length > 1 && fit?.product && (
              <View style={styles.sizes}>
                <Text style={styles.sizesTitle}>{t.treeSizeTitle}</Text>
                <View style={styles.sizePills} accessibilityRole="radiogroup" accessibilityLabel={t.treeSizeTitle}>
                  {sizes.map((p, i) => {
                    const on = p.id === fit.product!.id;
                    return (
                      <Pressable
                        key={p.id}
                        // The recommended tree is stored as "no choice", so it keeps following the ceiling.
                        onPress={() => onTreeChoice(i === sizes.length - 1 ? null : p.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={treeDescription(p, ceiling.unit, treeShop)}
                        style={[styles.sizePill, on && styles.modeOn]}
                      >
                        <Text style={styles.sizeText} maxFontSizeMultiplier={MAX_SCALE}>{treeSizeLabel(p)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.prices}>{t.treeSizeHint}</Text>
              </View>
            )}
            {height !== null && treeShop && <Text style={styles.prices}>{t.pricesNote}</Text>}
            {/* Shop links never sit behind a design or a credit: this entry needs neither.
                Placed after the ceiling block so the style chips above can't be mistaken for shop buttons. */}
            {onOpenLooks && (
              <Pressable onPress={onOpenLooks} style={[styles.linkTarget, styles.looks]} accessibilityRole="button">
                <Text style={styles.link}>{t.shopStyles}</Text>
              </Pressable>
            )}
          </View>
        )}

        <Pressable onPress={onOpenAbout} style={[styles.linkTarget, styles.about]} accessibilityRole="button">
          <Text style={styles.aboutText}>{t.about}</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        {short && <Text style={styles.instruction}>{t.notEnough(credits ?? 0)}</Text>}
        {!!instruction && <Text style={styles.instruction}>{instruction}</Text>}
        <Button
          label={
            short ? t.getCredits
            : christmas ? (selected.length ? t.addTree(selected.length) : t.addTreeLabel)
            : selected.length ? t.redesign(selected.length) : t.redesignLabel
          }
          disabled={!ready}
          onPress={() => (short ? onOpenShop() : onRedesign(selected))}
        />
      </View>
    </SafeAreaView>
  );
}

/** A small fir drawn from plain views: two tiers and a trunk. */
function TreeMark() {
  return (
    <View style={styles.tree} importantForAccessibility="no-hide-descendants">
      <View style={[styles.treeTier, { borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 6 }]} />
      <View style={[styles.treeTier, { borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 7, marginTop: -2 }]} />
      <View style={styles.treeTrunk} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.limewash },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space(5),
    paddingVertical: space(3),
  },
  brand: { fontFamily: font.display, fontSize: 34, color: color.ink },
  creditPill: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: color.brass,
    borderRadius: radius.control,
    paddingHorizontal: space(4),
  },
  creditText: { color: color.brass, fontWeight: "700", fontSize: 14 },
  body: { paddingHorizontal: space(5), paddingBottom: space(8) },
  freeDenied: {
    marginBottom: space(4),
    padding: space(4),
    borderRadius: 6,
    backgroundColor: color.plaster,
    borderWidth: 1.5,
    borderColor: color.brass,
    gap: space(1),
  },
  freeDeniedText: { fontSize: 15, lineHeight: 21, color: color.ink },
  placeRow: { marginTop: space(2) },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: space(3), marginTop: space(4), minHeight: 44 },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: color.olive, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkBoxOn: { backgroundColor: color.olive },
  checkTick: { width: 10, height: 10, borderRadius: 2, backgroundColor: color.white },
  checkTexts: { flex: 1, gap: 2 },
  checkLabel: { color: color.ink, fontSize: 16, fontWeight: "600" },
  checkHint: { color: color.stone, fontSize: 14, lineHeight: 20 },
  placeText: { color: color.stone, fontSize: 14, lineHeight: 20 },
  prices: { marginTop: space(1), fontSize: 12, lineHeight: 16, color: color.stone },
  changeRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: space(4) },
  changeLabel: { color: color.stone, fontSize: 15, marginRight: "auto" },
  // 44dp tall tap area for text links.
  linkTarget: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  link: { color: color.olive, fontWeight: "600", fontSize: 15 },
  viewResults: { marginTop: space(2) },
  // Grows with its content (tagline, two buttons, tip) instead of a fixed 4:3 that would clip it.
  emptyFrame: {
    minHeight: 260,
    borderRadius: radius.photo,
    borderWidth: 1.5,
    borderColor: color.line,
    borderStyle: "dashed",
    backgroundColor: color.plaster,
    padding: space(6),
    justifyContent: "center",
    gap: space(3),
  },
  emptyFrameDrop: { borderColor: color.brass, backgroundColor: color.brassWash },
  changeWeb: { marginLeft: "auto" },
  tagline: { fontFamily: font.display, fontSize: 26, lineHeight: 30, color: color.ink, marginBottom: space(2) },
  tip: { fontSize: 13, lineHeight: 18, color: color.stone, textAlign: "center" },
  sectionTitle: { marginTop: space(6), marginBottom: space(3), fontSize: 17, fontWeight: "600", color: color.ink },
  sectionAfterModes: { marginTop: space(4) },
  // Rooms / Christmas switch. Selection is border + fill only, like the style grid.
  modes: { flexDirection: "row", gap: space(2), marginTop: space(6) },
  mode: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space(2),
    paddingHorizontal: space(2),
    borderRadius: radius.chip,
    backgroundColor: color.plaster,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  modeOn: { borderColor: color.brass, backgroundColor: color.brassWash },
  modeText: { fontSize: 15, fontWeight: "600", color: color.ink },
  tree: { alignItems: "center" },
  treeTier: { width: 0, height: 0, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: color.olive },
  treeTrunk: { width: 3, height: 3, backgroundColor: color.brass },
  looks: { marginTop: space(3), alignSelf: "flex-start" },
  intro: { marginTop: -space(1), marginBottom: space(3), fontSize: 14, lineHeight: 20, color: color.stone },
  ceilingRow: { flexDirection: "row", alignItems: "center", gap: space(3) },
  ceilingInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: space(4),
    paddingVertical: space(2),
    borderRadius: radius.chip,
    backgroundColor: color.plaster,
    borderWidth: 1.5,
    borderColor: color.line,
    fontSize: 17,
    color: color.ink,
    fontVariant: ["tabular-nums"],
  },
  ceilingInputBad: { borderColor: color.danger },
  units: { flexDirection: "row", gap: space(2) },
  unit: {
    minWidth: 56,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.chip,
    backgroundColor: color.plaster,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  fit: { marginTop: space(2), fontSize: 14, lineHeight: 20, color: color.stone },
  fitBad: { color: color.danger },
  // Tree size pills: same border + fill selection as the unit switch, sized to their label, wrapping on small screens.
  sizes: { marginTop: space(3) },
  sizesTitle: { fontSize: 14, fontWeight: "600", color: color.ink, marginBottom: space(2) },
  sizePills: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  sizePill: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: space(3),
    borderRadius: radius.chip,
    backgroundColor: color.plaster,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  sizeText: { fontSize: 14, fontWeight: "600", color: color.ink, fontVariant: ["tabular-nums"] },
  // 3 equal columns: 12 styles = 4 rows. Labels stay on one line and shrink a little to fit, never wrap or clip.
  // Selection is border + fill + mark only: no weight change, so labels don't reflow when tapped.
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: {
    flexGrow: 1,
    flexBasis: "30%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space(1),
    paddingVertical: space(2),
    borderRadius: radius.chip,
    backgroundColor: color.plaster,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  chipOn: { borderColor: color.brass, backgroundColor: color.brassWash },
  chipMark: {
    position: "absolute",
    top: space(1.5),
    right: space(1.5),
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.brass,
  },
  chipText: { fontSize: 14, color: color.ink, textAlign: "center" },
  chipTextWeb: { lineHeight: 17 },
  chipTextWebNarrow: { fontSize: 13, lineHeight: 16 },
  about: { marginTop: space(4) },
  aboutText: { color: color.stone, fontSize: 14, textDecorationLine: "underline" },
  instruction: { color: color.stone, fontSize: 14, textAlign: "center", marginBottom: space(2) },
  footer: { paddingHorizontal: space(5), paddingTop: space(3), paddingBottom: space(2), backgroundColor: color.limewash },
});
