"""Efface les repères, étiquettes et textes incrustés dans la carte de référence
(remplissage par recopie de texture voisine), et recadre la zone carte."""
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
CROP = (0, 225, 1254, 930)            # zone carte (sans titre ni bandeau d'adresses)
RECTS = [                              # éléments à effacer (coordonnées de l'image d'origine)
    (594, 252, 866, 320), (438, 318, 628, 390), (792, 322, 1028, 394),      # Dieyna, Paname, Chicken Naan
    (542, 470, 676, 542), (698, 484, 820, 556), (830, 482, 1026, 552),      # Milano, Pizza, Burger Street
    (600, 582, 778, 654), (868, 594, 922, 668), (916, 618, 1048, 658),      # Star Food, Big Bargui
    (182, 782, 236, 856), (224, 824, 400, 886),                              # Capital Food 62
    (54, 314, 186, 366), (130, 542, 272, 622), (1178, 672, 1216, 744),     # La Manche, Plage, boussole
    (1012, 776, 1192, 910),                                                  # texte manuscrit
    (852, 238, 914, 264), (530, 424, 850, 468), (1164, 520, 1216, 548),    # D940, Boulogne-sur-Mer, D96
    (552, 700, 616, 730), (248, 780, 366, 808), (460, 842, 520, 868),      # D901, Le Portel, D901
    (312, 225, 408, 242), (1186, 786, 1210, 818),                           # résidus (bandeau, « ! »)
]
im = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
H, W, _ = im.shape
mask = np.zeros((H, W), bool)
for x0, y0, x1, y1 in RECTS:
    mask[y0:y1, x0:x1] = True
mask[:CROP[1]] = True; mask[CROP[3]:] = True   # hors carte : jamais utilisé comme source
work = im.copy()
RING = 8
for (x0, y0, x1, y1) in sorted(RECTS, key=lambda r: (r[2] - r[0]) * (r[3] - r[1])):
    w, h = x1 - x0, y1 - y0
    best = None
    # recherche sur une grille de décalages, en privilégiant les sources proches
    cands = [(dx, dy) for dx in range(-640, 641, 16) for dy in range(-360, 361, 8)
             if abs(dx) > w * 0.5 or abs(dy) > h * 0.5]
    ty0, ty1, tx0, tx1 = y0 - RING, y1 + RING, x0 - RING, x1 + RING
    tgt = work[ty0:ty1, tx0:tx1]
    ring = np.ones((ty1 - ty0, tx1 - tx0), bool); ring[RING:-RING, RING:-RING] = False
    ring &= ~mask[ty0:ty1, tx0:tx1]
    for dx, dy in cands:
        sy0, sy1, sx0, sx1 = ty0 + dy, ty1 + dy, tx0 + dx, tx1 + dx
        if sy0 < CROP[1] or sx0 < 0 or sy1 > CROP[3] or sx1 > W: continue
        if mask[sy0:sy1, sx0:sx1].any(): continue
        src = im[sy0:sy1, sx0:sx1]
        cost = (((src - tgt) ** 2)[ring].mean() if ring.any() else 0) * (1 + 0.0015 * np.hypot(dx, dy))
        if best is None or cost < best[0]: best = (cost, dx, dy)
    if best is None:
        print('pas de source pour', (x0, y0, x1, y1)); continue
    _, dx, dy = best
    src = im[ty0 + dy:ty1 + dy, tx0 + dx:tx1 + dx]
    a = Image.new('L', (tx1 - tx0, ty1 - ty0), 0)
    ImageDraw.Draw(a).rectangle((RING - 2, RING - 2, tx1 - tx0 - RING + 1, ty1 - ty0 - RING + 1), fill=255)
    a = np.asarray(a.filter(ImageFilter.GaussianBlur(3)), float)[..., None] / 255
    work[ty0:ty1, tx0:tx1] = src * a + tgt * (1 - a)
out = Image.fromarray(work.clip(0, 255).astype('uint8')).crop(CROP)
out.save(OUT)
print('carte nettoyée :', out.size)
