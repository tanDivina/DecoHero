import { useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { t, styleName } from "../i18n";
import { MAX_STYLES_PER_RUN, STYLE_PRESETS } from "../stylePresets";
import { color, font, radius, space } from "../theme";
import { Photo, choosePhoto, takePhoto } from "../photo";
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
  selected: string[];
  onSelect: (styleIds: string[]) => void;
  onRedesign: (styleIds: string[]) => void;
  /** Shown when finished designs from the last run can be reopened. */
  onViewResults?: () => void;
  onOpenShop: () => void;
  onOpenAbout: () => void;
  onNotice: (msg: string) => void;
};

export function HomeScreen({
  credits, freeDenied, photo, onPhoto, selected, onSelect, onRedesign, onViewResults, onOpenShop, onOpenAbout, onNotice,
}: Props) {
  const [picking, setPicking] = useState<"camera" | "gallery" | null>(null);
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

  const ready = !!photo && selected.length > 0;
  // Known balance too low for this run: send them to the shop instead of firing requests that will all fail.
  const short = ready && credits !== null && credits < selected.length;
  const instruction = !photo && !selected.length ? t.pickFirst : !photo ? t.needPhoto : !selected.length ? t.needStyle : null;

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

      <ScrollView contentContainerStyle={styles.body}>
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
            <Image source={{ uri: photo.uri }} style={[styles.photo, { aspectRatio: photo.aspect }]} resizeMode="cover" />
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
            <Text style={styles.tagline}>{dragging ? t.dropHere : t.tagline}</Text>
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

        <Text style={styles.sectionTitle}>{t.pickStyles}</Text>
        <View style={styles.chips}>
          {STYLE_PRESETS.map((s) => {
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
        <Pressable onPress={onOpenAbout} style={[styles.linkTarget, styles.about]} accessibilityRole="button">
          <Text style={styles.aboutText}>{t.about}</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        {short && <Text style={styles.instruction}>{t.notEnough(credits ?? 0)}</Text>}
        {!!instruction && <Text style={styles.instruction}>{instruction}</Text>}
        <Button
          label={short ? t.getCredits : selected.length ? t.redesign(selected.length) : t.redesignLabel}
          disabled={!ready}
          onPress={() => (short ? onOpenShop() : onRedesign(selected))}
        />
      </View>
    </SafeAreaView>
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
  photo: { width: "100%", borderRadius: radius.photo, backgroundColor: color.line },
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
