import { useState } from "react";
import { Image, Pressable, StyleSheet, View, type GestureResponderEvent } from "react-native";
import { t } from "../i18n";
import { Photo, Place, placeToView, viewToPlace } from "../photoShape";
import { color, radius } from "../theme";

type Props = {
  photo: Photo;
  /** The spot picked for the tree, if any. */
  place: Place | null;
  /** Missing: a plain photo that does not react to taps. */
  onPlace?: (place: Place) => void;
  /** "Take out furniture" (1.0.7+): pieces the user lets us remove, drawn as X marks. */
  removals?: Place[];
  /** "remove": a tap adds an X mark (up to MAX_REMOVALS) or takes away the one it lands on, instead of setting the spot. */
  tapMode?: "tree" | "remove";
  onRemovals?: (removals: Place[]) => void;
};

export const MAX_REMOVALS = 2;

const MARK = 34;

/**
 * Where a press landed inside the photo. The phone reports locationX / locationY. A browser click does not,
 * so there it is worked out from the pointer position; a keyboard "click" has no position and sets no spot.
 */
function pressPoint(e: GestureResponderEvent): { x: number; y: number } | null {
  const ne = e.nativeEvent as unknown as { locationX?: number; locationY?: number; clientX?: number; clientY?: number; detail?: number };
  if (typeof ne.locationX === "number" && typeof ne.locationY === "number") return { x: ne.locationX, y: ne.locationY };
  const box = (e.currentTarget as unknown as { getBoundingClientRect?: () => { left: number; top: number } } | null)?.getBoundingClientRect?.();
  if (!box || typeof ne.clientX !== "number" || typeof ne.clientY !== "number" || ne.detail === 0) return null;
  return { x: ne.clientX - box.left, y: ne.clientY - box.top };
}

/** The room photo. A tap sets (or moves) the spot where the tree's base should stand. */
export function TreeSpotPhoto({ photo, place, onPlace, removals = [], tapMode = "tree", onRemovals }: Props) {
  const [view, setView] = useState({ width: 0, height: 0 });
  const at = place && onPlace && view.width ? placeToView(place, view, photo) : null;
  // Regular redesigns (1.0.8+) have no tree spot: without onPlace, taps only mark furniture when onRemovals is given.
  const removing = !!onRemovals && (tapMode === "remove" || !onPlace);
  const tappable = !!onPlace || removing;
  const marks = tappable && view.width ? removals.map((r) => placeToView(r, view, photo)) : [];
  return (
    <Pressable
      disabled={!tappable}
      onLayout={(e) => setView({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      onPress={(e) => {
        if (!tappable || !view.width) return;
        const at = pressPoint(e);
        if (!at) return;
        if (!removing && onPlace) {
          onPlace(viewToPlace(at.x, at.y, view, photo));
          return;
        }
        // A tap on (or right by) an X mark takes it away; anywhere else adds one while there is room.
        const hit = marks.findIndex((m) => Math.hypot(m.x - at.x, m.y - at.y) <= MARK);
        if (hit >= 0) onRemovals!(removals.filter((_, i) => i !== hit));
        else if (removals.length < MAX_REMOVALS) onRemovals!([...removals, viewToPlace(at.x, at.y, view, photo)]);
      }}
      accessibilityLabel={removing ? (onPlace ? t.removeHint : t.removeHintRoom) : onPlace ? t.placeHint : undefined}
      style={styles.frame}
    >
      <Image source={{ uri: photo.uri }} style={[styles.photo, { aspectRatio: photo.aspect }]} resizeMode="cover" />
      {at && (
        // Drawn from plain views: a ring with a dot, centred on the spot. Touches pass through to the photo.
        <View
          pointerEvents="none"
          accessibilityLabel={t.placeMarker}
          style={[styles.mark, { left: at.x - MARK / 2, top: at.y - MARK / 2 }]}
        >
          <View style={styles.ring}>
            <View style={styles.dot} />
          </View>
        </View>
      )}
      {marks.map((m, i) => (
        // A ring with an X, in the danger colour, so it never reads as the brass tree spot.
        <View
          key={i}
          pointerEvents="none"
          accessibilityLabel={t.removeMarker}
          style={[styles.mark, { left: m.x - MARK / 2, top: m.y - MARK / 2 }]}
        >
          <View style={[styles.ring, styles.removeRing]}>
            <View style={[styles.bar, { transform: [{ rotate: "45deg" }] }]} />
            <View style={[styles.bar, { transform: [{ rotate: "-45deg" }] }]} />
          </View>
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.photo, overflow: "hidden" },
  photo: { width: "100%", borderRadius: radius.photo, backgroundColor: color.line },
  // White edge outside and inside the brass ring, so it reads on light and dark floors alike.
  mark: {
    position: "absolute",
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  ring: {
    width: MARK - 5,
    height: MARK - 5,
    borderRadius: (MARK - 5) / 2,
    borderWidth: 5,
    borderColor: color.brass,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: color.brass },
  removeRing: { borderColor: color.danger, borderWidth: 4 },
  bar: { position: "absolute", width: 14, height: 3, borderRadius: 1.5, backgroundColor: color.danger },
});
