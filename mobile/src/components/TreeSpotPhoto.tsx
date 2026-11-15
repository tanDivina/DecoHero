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
};

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
export function TreeSpotPhoto({ photo, place, onPlace }: Props) {
  const [view, setView] = useState({ width: 0, height: 0 });
  const at = place && onPlace && view.width ? placeToView(place, view, photo) : null;
  return (
    <Pressable
      disabled={!onPlace}
      onLayout={(e) => setView({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      onPress={(e) => {
        if (!onPlace || !view.width) return;
        const at = pressPoint(e);
        if (at) onPlace(viewToPlace(at.x, at.y, view, photo));
      }}
      accessibilityLabel={onPlace ? t.placeHint : undefined}
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
});
