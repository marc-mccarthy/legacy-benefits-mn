#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/public/media/nate-best-authentic.jpg"
CUTOUT="$ROOT/public/media/nate-cutout.png"
DUOTONE="$ROOT/public/media/nate-duotone.jpg"

if [[ ! -f "$SRC" ]]; then
  echo "portrait-assets: missing source $SRC" >&2
  exit 1
fi

TMPDIR_LOCAL="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT
DUOTONE_PNG="$TMPDIR_LOCAL/nate-duotone.png"

swift - "$SRC" "$CUTOUT" <<'SWIFT'
import Vision
import AppKit
import CoreImage

let args = CommandLine.arguments
let inputPath = args[1]
let outputPath = args[2]

guard let nsImage = NSImage(contentsOfFile: inputPath),
      let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("portrait-assets: failed to load \(inputPath)\n".data(using: .utf8)!)
    exit(1)
}

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()
do {
    try handler.perform([request])
} catch {
    FileHandle.standardError.write("portrait-assets: vision request failed: \(error)\n".data(using: .utf8)!)
    exit(1)
}

guard let result = request.results?.first, !result.allInstances.isEmpty else {
    FileHandle.standardError.write("portrait-assets: empty mask\n".data(using: .utf8)!)
    exit(1)
}

let maskPixelBuffer: CVPixelBuffer
do {
    maskPixelBuffer = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
} catch {
    FileHandle.standardError.write("portrait-assets: mask generation failed: \(error)\n".data(using: .utf8)!)
    exit(1)
}

let maskImage = CIImage(cvPixelBuffer: maskPixelBuffer)
let inputCI = CIImage(cgImage: cgImage)

guard let blendFilter = CIFilter(name: "CIBlendWithMask") else {
    FileHandle.standardError.write("portrait-assets: CIBlendWithMask unavailable\n".data(using: .utf8)!)
    exit(1)
}
blendFilter.setValue(inputCI, forKey: kCIInputImageKey)
blendFilter.setValue(CIImage(color: .clear).cropped(to: inputCI.extent), forKey: kCIInputBackgroundImageKey)
blendFilter.setValue(maskImage, forKey: kCIInputMaskImageKey)

guard let outputCI = blendFilter.outputImage,
      let outputCG = CIContext().createCGImage(outputCI, from: inputCI.extent) else {
    FileHandle.standardError.write("portrait-assets: blend/render failed\n".data(using: .utf8)!)
    exit(1)
}

let rep = NSBitmapImageRep(cgImage: outputCG)
guard let pngData = rep.representation(using: .png, properties: [:]) else {
    FileHandle.standardError.write("portrait-assets: png encode failed\n".data(using: .utf8)!)
    exit(1)
}

try pngData.write(to: URL(fileURLWithPath: outputPath))
SWIFT

if [[ ! -s "$CUTOUT" ]]; then
  echo "portrait-assets: cutout was not written" >&2
  exit 1
fi

magick "$CUTOUT" -channel A -level 15%,85% +channel "$CUTOUT"
magick "$CUTOUT" -channel G -fx "g>((r+b)/2) ? ((r+b)/2) : g" +channel "$CUTOUT"

DUOTONE_RGB="$TMPDIR_LOCAL/duotone-rgb.png"
ALPHA="$TMPDIR_LOCAL/alpha.png"
DUOTONE_RGBA="$TMPDIR_LOCAL/duotone-rgba.png"

magick "$CUTOUT" -alpha off -colorspace gray -sigmoidal-contrast 4x50% \( -size 256x1 gradient:"#081A3A-#FFE7A3" \) -clut "$DUOTONE_RGB"
magick "$CUTOUT" -alpha extract "$ALPHA"
magick "$DUOTONE_RGB" "$ALPHA" -alpha off -compose CopyOpacity -composite "$DUOTONE_RGBA"
magick "$DUOTONE_RGBA" -background "#081A3A" -alpha remove -alpha off "$DUOTONE_PNG"
magick "$DUOTONE_PNG" -colorspace sRGB -quality 90 "$DUOTONE"

SRC_WIDTH="$(magick identify -format "%w" "$SRC")"

for width in 480 900 1920; do
  if (( width > SRC_WIDTH )); then
    continue
  fi
  magick "$DUOTONE" -resize "${width}x" -quality 82 "$ROOT/public/media/nate-duotone-${width}.avif"
  magick "$DUOTONE" -resize "${width}x" -quality 82 "$ROOT/public/media/nate-duotone-${width}.webp"
done
