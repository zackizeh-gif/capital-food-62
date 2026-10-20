#!/usr/bin/env bash
# Prépare les images de la démo à partir de la vidéo source (IMG_9548.mov, 60 i/s) :
# extraction 1080×1920 puis floutage du nom de la personne qui publie l'avis.
set -euo pipefail
SRC="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
mkdir -p "$ROOT/assets/footage"
ffmpeg -v error -y -i "$SRC" -vf "scale=1080:1920" -q:v 3 "$TMP/f_%04d.jpg"
python3 -I "$ROOT/scripts/blur_name.py" "$TMP" "$ROOT/assets/footage/demo"
rm -rf "$TMP"
echo "→ $ROOT/assets/footage/demo"
