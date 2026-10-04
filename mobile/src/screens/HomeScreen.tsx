import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { t, styleName } from "../i18n";
import { MAX_STYLES_PER_RUN, STYLE_PRESETS } from "../stylePresets";
import { color, font, radius, space } from "../theme";
import { Photo, choosePhoto, takePhoto } from "../photo";

type Props = {
  credits: number | null;
  photo: Photo | null;
  onPhoto: (p: Photo) => void;
  onRedesign: (styleIds: string[]) => void;
  onOpenShop: () => void;
  onNotice: (msg: string) => void;
};

export function HomeScreen({ credits, photo, onPhoto, onRedesign, onOpenShop, onNotice }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [picking, setPicking] = useState<"camera" | "gallery" | null>(null);

  async function pick(source: "camera" | "gallery") {
    setPicking(source);
    try {
      const r = source === "camera" ? await takePhoto() : await choosePhoto();
      if (r.denied) onNotice(t.cameraDenied);
      if (r.photo) onPhoto(r.photo);
    } finally {
      setPicking(null);
    }
  }

  function toggle(id: string) {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_STYLES_PER_RUN ? cur : [...cur, id]
    );
  }

  const ready = !!photo && selected.length > 0;
  // Known balance too low for this run: send them to the shop instead of firing requests that will all fail.
  const short = ready && credits !== null && credits < selected.length;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.brand}>DecoHero</Text>
        <Pressable onPress={onOpenShop} style={styles.creditPill} accessibilityRole="button">
          <Text style={styles.creditText}>{credits === null ? "…" : t.credits(credits)}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {photo ? (
          <View>
            <Image source={{ uri: photo.uri }} style={[styles.photo, { aspectRatio: photo.aspect }]} resizeMode="cover" />
            <Pressable onPress={() => pick("gallery")} style={styles.changePhoto} hitSlop={8}>
              <Text style={styles.link}>{t.changePhoto}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyFrame}>
            <Text style={styles.tagline}>{t.tagline}</Text>
            <Button label={t.takePhoto} onPress={() => pick("camera")} loading={picking === "camera"} disabled={!!picking} />
            <Button label={t.choosePhoto} variant="quiet" onPress={() => pick("gallery")} loading={picking === "gallery"} disabled={!!picking} />
          </View>
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
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{styleName(s.id)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.tip}>{t.tip}</Text>
      </ScrollView>

      <View style={styles.footer}>
        {short && <Text style={styles.short}>{t.notEnough(credits ?? 0)}</Text>}
        <Button
          label={short ? t.getCredits : ready ? t.redesign(selected.length) : t.pickFirst}
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
    borderWidth: 1.5,
    borderColor: color.brass,
    borderRadius: radius.control,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
  },
  creditText: { color: color.brass, fontWeight: "700", fontSize: 14 },
  body: { paddingHorizontal: space(5), paddingBottom: space(8) },
  photo: { width: "100%", borderRadius: radius.photo, backgroundColor: color.line },
  changePhoto: { alignSelf: "flex-end", paddingVertical: space(2) },
  link: { color: color.olive, fontWeight: "600", fontSize: 15 },
  emptyFrame: {
    aspectRatio: 4 / 3,
    borderRadius: radius.photo,
    borderWidth: 1.5,
    borderColor: color.line,
    borderStyle: "dashed",
    backgroundColor: color.plaster,
    padding: space(6),
    justifyContent: "center",
    gap: space(3),
  },
  tagline: { fontFamily: font.display, fontSize: 26, lineHeight: 30, color: color.ink, marginBottom: space(2) },
  sectionTitle: { marginTop: space(6), marginBottom: space(3), fontSize: 17, fontWeight: "600", color: color.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: {
    paddingHorizontal: space(4),
    paddingVertical: space(2.5),
    borderRadius: radius.chip,
    backgroundColor: color.plaster,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  chipOn: { borderColor: color.brass, backgroundColor: "#F3EBDD" },
  chipText: { fontSize: 15, color: color.ink },
  chipTextOn: { fontWeight: "700" },
  tip: { marginTop: space(5), fontSize: 14, lineHeight: 20, color: color.stone },
  short: { color: color.stone, fontSize: 14, textAlign: "center", marginBottom: space(2) },
  footer: { paddingHorizontal: space(5), paddingTop: space(3), paddingBottom: space(2), backgroundColor: color.limewash },
});
