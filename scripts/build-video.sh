#!/usr/bin/env bash
# Builds the looping background clips from the real photos in ./images.
# Nothing here is AI-generated: each clip is a still photo plus procedural motion
# (breathing zoom, drifting Perlin haze, liquid shimmer, lamp flicker), rendered so
# the last frame meets the first.  Run: npm run assets:video
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/media/video
mkdir -p "$OUT"
FPS=24
DUR=8                      # loop length, seconds
N=$((FPS * DUR))
X=2                        # crossfade used to make the noise layers loop

# looped_noise <w> <h> <seed> <xscale> <yscale> <tscale> <octaves>  -> filter chain producing a seamless DUR-second grey noise loop
looped_noise() {
  local w=$1 h=$2 seed=$3 xs=$4 ys=$5 ts=$6 oct=$7 tag=$8
  echo "perlin=s=${w}x${h}:r=${FPS}:octaves=${oct}:persistence=0.55:xscale=${xs}:yscale=${ys}:tscale=${ts}:random_mode=seed:seed=${seed},trim=duration=$((DUR + X)),format=gray,split[${tag}a][${tag}b];[${tag}a]trim=start=${X},setpts=PTS-STARTPTS[${tag}m];[${tag}b]trim=duration=${X},setpts=PTS-STARTPTS[${tag}h];[${tag}m][${tag}h]xfade=transition=fade:duration=${X}:offset=$((DUR - X))"
}

encode() { # <rawfile> <name> <crf264> <crfvp9>
  ffmpeg -loglevel error -y -i "$1" -an -c:v libx264 -preset slow -crf "$3" -pix_fmt yuv420p -profile:v high -g $((FPS * 2)) -movflags +faststart "$OUT/$2.mp4"
  ffmpeg -loglevel error -y -i "$1" -an -c:v libvpx-vp9 -crf "$4" -b:v 0 -row-mt 1 -pix_fmt yuv420p "$OUT/$2.webm"
  ffmpeg -loglevel error -y -i "$OUT/$2.mp4" -frames:v 1 -q:v 4 "$OUT/$2-poster.jpg"
  cwebp -quiet -q 68 "$OUT/$2-poster.jpg" -o "$OUT/$2-poster.webp"
  echo "$2: $(du -h "$OUT/$2.mp4" | cut -f1) mp4, $(du -h "$OUT/$2.webm" | cut -f1) webm"
}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# ---------------------------------------------------------------- hero: the fizz glass
# 3:4 portrait. Breathing push-in, shimmer inside the glass, green haze, soft light pulse.
W=720; H=960
ffmpeg -loglevel error -y -i images/Deew3uCjE8h-01.webp -filter_complex "
[0:v]scale=$((W*3)):$((H*3)):flags=lanczos,zoompan=z='1.045+0.03*sin(2*PI*on/${N})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+6*sin(2*PI*on/${N})':d=${N}:s=${W}x${H}:fps=${FPS},format=gbrp[base];
$(looped_noise 90 120 11 1.6 1.6 0.55 2 dx),scale=${W}:${H}:flags=bicubic,gblur=sigma=6,lutyuv=y='128+(val-128)*0.07',format=gbrp[mx];
$(looped_noise 90 120 23 1.6 1.6 0.55 2 dy),scale=${W}:${H}:flags=bicubic,gblur=sigma=6,lutyuv=y='128+(val-128)*0.09',format=gbrp[my];
[base][mx][my]displace=edge=smear[disp];
$(looped_noise 180 240 5 0.9 1.5 0.35 4 hz),scale=${W}:${H}:flags=bicubic,gblur=sigma=10,lutyuv=y='clip((val-118)*2.6,0,255)',format=gbrp,colorchannelmixer=rr=0.04:gg=0.85:bb=0.42[haze];
[disp][haze]blend=all_mode=screen:all_opacity=0.22[lit];
[lit]eq=brightness='0.012*sin(2*PI*t*3/${DUR})+0.008*sin(2*PI*t*7/${DUR})':eval=frame,format=yuv420p[v]
" -map "[v]" -frames:v ${N} -c:v libx264 -preset fast -crf 8 "$TMP/hero.mkv"
encode "$TMP/hero.mkv" hero-glass 25 37

# ---------------------------------------------------------------- room: the interior, landscape
# Haze hanging in the sodium light, the right-hand lamp buzzing.
W=1280; H=852
ffmpeg -loglevel error -y -i images/Deew3uCjE8h-07.webp -filter_complex "
[0:v]scale=$((W*2)):$((H*2)):flags=lanczos,zoompan=z='1.03+0.02*sin(2*PI*on/${N})':x='iw/2-(iw/zoom/2)+10*sin(2*PI*on/${N})':y='ih/2-(ih/zoom/2)':d=${N}:s=${W}x${H}:fps=${FPS},format=gbrp[base];
color=black:s=${W}x${H}:r=${FPS}:d=${DUR},format=gray,geq=lum='255*exp(-((X-752)*(X-752)+(Y-205)*(Y-205))/(2*130*130))',format=gbrp[mask];
[base][mask]blend=all_expr='A*(1-(B/255)*0.5*(pow(max(0,sin(2*PI*T*5/${DUR})),14)+0.6*pow(max(0,sin(2*PI*T*13/${DUR}+1)),20)))'[flick];
$(looped_noise 320 213 9 0.7 1.3 0.3 4 hz),scale=${W}:${H}:flags=bicubic,gblur=sigma=12,lutyuv=y='clip((val-112)*2.4,0,255)',format=gbrp,colorchannelmixer=rr=0.75:gg=0.8:bb=0.05[haze];
[flick][haze]blend=all_mode=screen:all_opacity=0.16,format=yuv420p[v]
" -map "[v]" -frames:v ${N} -c:v libx264 -preset fast -crf 8 "$TMP/room.mkv"
encode "$TMP/room.mkv" room-haze 27 38

# ---------------------------------------------------------------- lineup: all the drinks under green
W=1080; H=720
ffmpeg -loglevel error -y -i images/Deew3uCjE8h-08.webp -filter_complex "
[0:v]scale=$((W*2)):$((H*2)):flags=lanczos,zoompan=z='1.06+0.04*sin(2*PI*on/${N})':x='iw/2-(iw/zoom/2)-14*sin(2*PI*on/${N})':y='ih/2-(ih/zoom/2)':d=${N}:s=${W}x${H}:fps=${FPS},format=gbrp[base];
$(looped_noise 270 180 31 0.8 1.2 0.4 4 hz),scale=${W}:${H}:flags=bicubic,gblur=sigma=10,lutyuv=y='clip((val-116)*2.5,0,255)',format=gbrp,colorchannelmixer=rr=0.04:gg=0.85:bb=0.45[haze];
[base][haze]blend=all_mode=screen:all_opacity=0.2[lit];
[lit]eq=brightness='0.014*sin(2*PI*t*2/${DUR})+0.008*sin(2*PI*t*5/${DUR})':eval=frame,format=yuv420p[v]
" -map "[v]" -frames:v ${N} -c:v libx264 -preset fast -crf 8 "$TMP/lineup.mkv"
encode "$TMP/lineup.mkv" lineup-haze 27 38

ls -la "$OUT"
