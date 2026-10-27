#!/usr/bin/env bash
# Rendu complet : images (30 i/s, nettes) → musique → MP4
#   bash scripts/build.sh 1080   → build/digitboost-partenaires-1080p.mp4
#   bash scripts/build.sh 4k     → build/digitboost-partenaires-4k.mp4 (2160×3840)
set -euo pipefail
Q="${1:-1080}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
OUT="$ROOT/build"; FR="${FRAMES_DIR:-$OUT/frames-$Q}"
mkdir -p "$OUT" "$FR"
DSF=1; LEVEL=4.2; NAME=1080p
if [ "$Q" = "4k" ]; then DSF=2; LEVEL=5.2; NAME=4k; fi
node render/render.mjs --cues="$OUT/cues.json"
python3 -I audio/music.py "$OUT/cues.json" "$OUT/music.wav"
[ "${SKIP_FRAMES:-0}" = "1" ] || node render/render.mjs --dsf=$DSF --fps=30 --workers="${WORKERS:-4}" --out="$FR"
ffmpeg -v error -y -framerate 30 -i "$FR/f_%05d.jpg" -i "$OUT/music.wav" \
  -filter_complex "[0:v]format=yuv420p[v]" \
  -map "[v]" -map 1:a -r 30 -c:v libx264 -profile:v high -level $LEVEL -preset slow -crf 19 -maxrate $([ "$Q" = "4k" ] && echo 40M || echo 12M) -bufsize $([ "$Q" = "4k" ] && echo 80M || echo 24M) \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -map_metadata -1 -shortest \
  "$OUT/digitboost-partenaires-$NAME.mp4"
echo "→ $OUT/digitboost-partenaires-$NAME.mp4"
