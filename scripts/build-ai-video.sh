#!/usr/bin/env bash
# Encodes the AI-GENERATED clips: abstract atmosphere loops (ElevenLabs, text-to-video), plus the
# beer pour and the drink hover clips (Runway; the hover clips animate the real photos).
# Originals live in ./assets-src/ai. Each one is made into a seamless loop by crossfading its tail
# into its head, cropped to the shape it is used at, and encoded to H.264 + VP9 with posters.
# Run: npm run assets:ai-video
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets-src/ai
OUT=public/media/video
mkdir -p "$OUT"
X=1.2     # crossfade seconds used to hide the loop point
FPS=24

dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }

# loop <src> <name> <crop/scale filter> <grade filter> <crf264> <crfvp9> [crossfade seconds]
loop() {
  local src=$1 name=$2 shape=$3 grade=$4 c264=$5 cvp9=$6
  local X=${7:-$X}
  local D; D=$(dur "$src")
  local OFF; OFF=$(python3 -c "print(round($D - 2*$X, 3))")
  local tmp; tmp=$(mktemp -d)
  ffmpeg -loglevel error -y -i "$src" -filter_complex "
    [0:v]fps=${FPS},${shape},${grade},format=yuv420p,split[a][b];
    [a]trim=start=${X},setpts=PTS-STARTPTS[main];
    [b]trim=duration=${X},setpts=PTS-STARTPTS[head];
    [main][head]xfade=transition=fade:duration=${X}:offset=${OFF},format=yuv420p[v]" \
    -map "[v]" -an -c:v libx264 -preset fast -crf 8 "$tmp/loop.mkv"
  ffmpeg -loglevel error -y -i "$tmp/loop.mkv" -an -c:v libx264 -preset slow -crf "$c264" -pix_fmt yuv420p -profile:v high -g $((FPS * 2)) -movflags +faststart "$OUT/$name.mp4"
  ffmpeg -loglevel error -y -i "$tmp/loop.mkv" -an -c:v libvpx-vp9 -crf "$cvp9" -b:v 0 -row-mt 1 -pix_fmt yuv420p "$OUT/$name.webm"
  ffmpeg -loglevel error -y -i "$OUT/$name.mp4" -frames:v 1 -q:v 4 "$tmp/poster.jpg"
  cwebp -quiet -q 66 "$tmp/poster.jpg" -o "$OUT/$name-poster.webp"
  rm -rf "$tmp"
  echo "$name: $(du -h "$OUT/$name.mp4" | cut -f1) mp4, $(du -h "$OUT/$name.webm" | cut -f1) webm"
}

WIDE="scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720"
TALL="crop=ih*3/4:ih,scale=720:960"

# Grades pull the clean AI look towards the film photos: crushed blacks, darker mids, vignette.
SMOKE="eq=contrast=1.12:gamma=1.12:saturation=1.1"
COND="eq=contrast=1.22:brightness=-0.045:gamma=0.86:saturation=0.9,vignette=angle=PI/4"
RUBY="eq=contrast=1.12:brightness=-0.03:gamma=0.9,vignette=angle=PI/4.5"

loop "$SRC/smoke.mp4"        ai-smoke        "$WIDE" "$SMOKE" 27 38
loop "$SRC/smoke.mp4"        ai-smoke-tall   "$TALL" "$SMOKE" 27 38
loop "$SRC/condensation.mp4" ai-condensation "$TALL" "$COND"  26 37
loop "$SRC/ruby.mp4"         ai-ruby         "$TALL" "$RUBY"  26 37

# Runway clips. The hover clips are left ungraded so their first frame matches the photo they replace.
CARD="scale=720:900:force_original_aspect_ratio=increase,crop=720:900"
BEER="crop=iw:ih-100:0:100,scale=720:900:force_original_aspect_ratio=increase,crop=720:900"   # trims the bottle label off the top
loop "$SRC/beer.mp4"          ai-beer          "$BEER" "eq=contrast=1.06:gamma=0.95" 27 38 0.9
loop "$SRC/hover-slick.mp4"   ai-hover-slick   "$CARD" "null" 27 38 0.35
loop "$SRC/hover-redflag.mp4" ai-hover-redflag "$CARD" "null" 27 38 0.35
