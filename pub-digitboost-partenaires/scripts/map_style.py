"""Transforme la carte nettoyée en version « nuit » : bleu nuit, rues en bleu électrique
lumineux, littoral et rivière en cyan. Agrandissement ×3 pour les zooms."""
import sys
import numpy as np
from PIL import Image, ImageFilter

SRC, OUT, K = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 3
im = Image.open(SRC).convert('RGB')
W, H = im.size[0] * K, im.size[1] * K
up = im.resize((W, H), Image.LANCZOS)
a = np.asarray(up).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
L = 0.299 * r + 0.587 * g + 0.114 * b

def _box(x, r, axis):
    if r < 1: return x
    pad = [(0, 0)] * x.ndim; pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(x, pad, mode='edge'), axis=axis)
    n = x.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return (hi - lo) / (2 * r + 1)

def blur(x, sigma):
    """Flou gaussien approché (3 passes de flou en boîte, séparable)."""
    r = max(0, int(round((np.sqrt(12 * sigma * sigma / 3 + 1) - 1) / 2)))
    for _ in range(3):
        x = _box(_box(x, r, 0), r, 1)
    return x


def ss(x, a0, a1):
    t = np.clip((x - a0) / (a1 - a0), 0, 1); return t * t * (3 - 2 * t)

water = ss(b - r, 30, 70) * ss(b, 165, 200)
water = blur(water, 1.2 * K)
park = ss(g - r, 8, 20) * ss(g - b, -4, 6) * (1 - water)
hp1 = L - blur(L, 2.2 * K)
hp2 = L - blur(L, 8 * K)
street = np.maximum(ss(hp1, 1.0, 9.0), ss(hp2, 3.0, 14.0)) * (1 - water * 0.85)
street *= ss(L, 200, 245)

col = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)
land, sea, green = col('#071027'), col('#030816'), col('#08202e')
out = land[None, None] * (1 - water[..., None]) + sea[None, None] * water[..., None]
out = out * (1 - park[..., None] * 0.7) + green[None, None] * park[..., None] * 0.7
out *= (0.85 + 0.3 * ss(L, 215, 245))[..., None]
# reflets de la mer : léger dégradé cyan
yy, xx = np.mgrid[0:H, 0:W]
out += (col('#0a3a6b')[None, None] * 0.35) * (water * (1 - yy / H) * (1 - xx / W))[..., None]
# rues : cœur lumineux + halo
core = street ** 1.3
glow1 = blur(street, 2.5 * K)
glow2 = blur(street, 9 * K)
out += core[..., None] * col('#4d8dff')[None, None] * 0.75
out += glow1[..., None] * col('#1f5bff')[None, None] * 0.55
out += glow2[..., None] * col('#1238b8')[None, None] * 0.45
# littoral et rivière en cyan
edge = np.abs(np.gradient(blur(water, 0.8 * K))[0]) + np.abs(np.gradient(blur(water, 0.8 * K))[1])
edge = ss(edge * K, 0.02, 0.12)
out += edge[..., None] * col('#38d6ff')[None, None] * 0.85
out += blur(edge, 4 * K)[..., None] * col('#1aa9ff')[None, None] * 0.5
out = 255 * (1 - np.exp(-out / 255 * 1.15))     # compression douce des hautes lumières
# bords fondus vers le bleu nuit (la carte se dissout dans l'obscurité)
F = 260
d = np.minimum.reduce([xx, W - 1 - xx, yy, H - 1 - yy]).astype(float)
e = ss(d, 0, F)[..., None]
out = out * e + col('#050c20')[None, None] * (1 - e)
Image.fromarray(out.clip(0, 255).astype('uint8')).save(OUT, quality=92, subsampling=0)
print('carte nuit :', W, 'x', H)
