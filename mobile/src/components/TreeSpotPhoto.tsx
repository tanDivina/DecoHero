import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
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
        onPlace(viewToPlace(e.nativeEvent.locationX, e.nativeEvent.locationY, view, photo));
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
