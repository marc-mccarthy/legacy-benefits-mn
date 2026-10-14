#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/public/media/hero-maze.png"
KEYED="$ROOT/public/media/hero-maze-keyed.png"
SAMPLE="$ROOT/public/media/hero-maze-sample.webp"
VIDEO="$ROOT/public/video"
RUN_SECONDS="5.1"
BLACK_POINT="5"

die() {
  echo "❌ maze-assets: $1" >&2
  exit 1
}

[[ -f "$SRC" ]] || die "missing source $SRC"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

magick "$SRC" -alpha off -level "${BLACK_POINT}%,100%" "$WORK/clean.png"
magick "$WORK/clean.png" -channel RGB -separate -evaluate-sequence max \
  "$WORK/coverage.png"
magick "$WORK/clean.png" "$WORK/coverage.png" -compose DivideSrc -composite \
  "$WORK/colour.png"
magick "$WORK/colour.png" "$WORK/coverage.png" -alpha off \
  -compose CopyOpacity -composite -strip "$KEYED"

for width in 480 900 1600; do
  magick "$KEYED" -resize "${width}x${width}" -strip -quality 82 \
    "$ROOT/public/media/hero-maze-$width.webp"
  magick "$KEYED" -resize "${width}x${width}" -strip "$WORK/maze-$width.png"
  avifenc -q 59 --speed 4 "$WORK/maze-$width.png" \
    "$ROOT/public/media/hero-maze-$width.avif" > /dev/null
done

magick "$KEYED" -resize 512x512 -strip -quality 90 "$SAMPLE"

for size in "" "-mobile"; do
  [[ -f "$VIDEO/hero-maze-loop$size.mp4" ]] || die "missing $VIDEO/hero-maze-loop$size.mp4"
  ffmpeg -v error -y -i "$VIDEO/hero-maze-loop$size.mp4" -t "$RUN_SECONDS" \
    -vf "colorlevels=rimin=0.0$BLACK_POINT:gimin=0.0$BLACK_POINT:bimin=0.0$BLACK_POINT" \
    -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 23 -an \
    -movflags +faststart "$VIDEO/hero-maze-run$size.mp4"
done
