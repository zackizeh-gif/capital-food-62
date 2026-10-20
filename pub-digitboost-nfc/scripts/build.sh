#!/usr/bin/env bash
# Rendu complet d'une version : images (60 i/s) → bruitages → MP4 (30 i/s, H.264 + AAC)
set -euo pipefail
V="${1:-30}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/build"; FR="${FRAMES_DIR:-$OUT/frames$V}"
mkdir -p "$OUT" "$FR"
cd "$ROOT"
node render/render.mjs --v="$V" --cues="$OUT/cues$V.json"
[ "${SKIP_FRAMES:-0}" = "1" ] || node render/render.mjs --v="$V" --fps=60 --workers="${WORKERS:-4}" --out="$FR"
python3 -I audio/sfx.py "$OUT/cues$V.json" "$OUT/sfx$V.wav"
# Fusion des images par paires (flou de mouvement à 180°) puis encodage 30 i/s
ffmpeg -v error -y -framerate 60 -i "$FR/f_%05d.jpg" -i "$OUT/sfx$V.wav" \
  -filter_complex "[0:v]tmix=frames=2,select='mod(n\,2)',setpts=N/30/TB,format=yuv420p[v]" \
  -map "[v]" -map 1:a -r 30 -c:v libx264 -profile:v high -level 4.2 -preset slow -crf 20 -maxrate 10M -bufsize 20M \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -map_metadata -1 -shortest \
  "$OUT/digitboost-nfc-${V}s.mp4"
echo "→ $OUT/digitboost-nfc-${V}s.mp4"
