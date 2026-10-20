# Pub DigitBoost : cartes NFC pour les avis Google

Vidéo publicitaire verticale (1080 × 1920) en deux versions, **30 s** et **15 s**. Elle est générée par du code : une page web animée image par image, des bruitages synthétisés et un montage avec ffmpeg.

Voir `storyboard.md` pour le minutage plan par plan.

## Modifier un texte, un prix ou une durée

Tout se trouve dans **`src/config.js`** :

- `text` : tous les textes affichés (accroche, étapes, prix, appel à l'action…) ;
- `demoPlan` : quelles images de la vidéo de démo sont utilisées, et à quelle vitesse (`rate: 0.5` = ralenti ×0,5) ;
- `versions` : l'ordre et la durée des scènes pour chaque version.

Les animations de chaque scène sont dans `src/scenes.js`, les couleurs dans `src/style.css` (variables `--orange`, `--blue`…).

## Aperçu dans un navigateur

Servez le dossier, par exemple avec `npx serve .`, puis ouvrez :

- `src/index.html?v=30&play=1` : lecture en temps réel ;
- `src/index.html?v=30&t=15.2` : image fixe à 15,2 s.

## Rendu complet

Prérequis : Node 18+, Playwright (Chromium), Python 3 avec numpy, ffmpeg.

```bash
# 1. Préparer les images de la démo (une seule fois)
bash scripts/prepare_assets.sh /chemin/IMG_9548.mov

# 2. Rendre la version 30 s (ou 15)
bash scripts/build.sh 30
bash scripts/build.sh 15
```

Les fichiers finaux arrivent dans `build/` : `digitboost-nfc-30s.mp4` et `digitboost-nfc-15s.mp4`.

## Organisation

| Dossier | Contenu |
|---|---|
| `src/` | page animée : `config.js` (paramètres), `engine.js` (timeline, courbes d'animation), `scenes.js` (les 9 scènes), `style.css` |
| `assets/` | carte détourée, logo, décor STAR FOOD, polices (Poppins, JetBrains Mono, licence OFL), grain |
| `render/render.mjs` | capture image par image avec Playwright (60 i/s, fusionnées par paires en 30 i/s pour le flou de mouvement) |
| `audio/sfx.py` | synthèse et mixage des bruitages à partir des repères exportés par l'animation |
| `scripts/` | préparation des images (détourage de la carte, floutage du nom) et montage final |
