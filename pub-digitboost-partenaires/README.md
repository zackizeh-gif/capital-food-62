# Pub DigitBoost : nos restaurants partenaires

Vidéo de marque verticale (9:16) de 25 s, en 4K et en 1080p. Elle est générée par du code : carte 3D animée dans une page web, capturée image par image, avec une musique originale synthétisée.

Voir `storyboard.md` pour le minutage.

## Modifier

Tout se règle dans **`src/config.js`** :

- `partners` : nom, ordre et position de chaque partenaire. La position correspond aux coordonnées de la pointe du repère sur `assets/carte-reference.png` ;
- `t` : minutage de chaque moment (logo, carte, partenaires, slogan…) ;
- `text` : tous les textes affichés.

Ajouter un partenaire : ajoutez une ligne dans `partners`, puis relancez le rendu. La musique se recale automatiquement sur les nouveaux repères.

## Aperçu et rendu

```bash
npx serve .                          # puis ouvrir src/index.html?play=1 (lecture) ou ?t=12.5 (image fixe)
bash scripts/build.sh 1080           # → build/digitboost-partenaires-1080p.mp4
bash scripts/build.sh 4k             # → build/digitboost-partenaires-4k.mp4
```

Prérequis : Node 18+, Playwright (Chromium), Python 3 avec numpy et Pillow, ffmpeg.

## Préparation de la carte (déjà faite)

```bash
python3 scripts/map_clean.py assets/carte-reference.png assets/map-clean.png   # efface anciens pins et textes
python3 scripts/map_style.py assets/map-clean.png assets/map-night.jpg 3        # version nuit ×3
```
