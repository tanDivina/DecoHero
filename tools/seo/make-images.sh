#!/usr/bin/env bash
# Guide-page images: the real sample renders in store/rooms (see store/rooms/README.md) as WebP, 1000 px
# on the long edge, into site/img/g/. Re-run after adding renders. Needs ImageMagick (magick).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="$ROOT/site/img/g"
mkdir -p "$OUT"
for f in "$ROOT"/store/rooms/before/*.jpg; do
  n=$(basename "$f" .jpg)
  magick "$f" -resize 1000x1000 -strip -quality 72 "$OUT/$n-before.webp"
done
for f in "$ROOT"/store/rooms/after/*.jpg; do
  n=$(basename "$f" .jpg)
  magick "$f" -resize 1000x1000 -strip -quality 72 "$OUT/$n.webp"
done
ls "$OUT" | wc -l
