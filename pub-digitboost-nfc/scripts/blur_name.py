import sys, os, math, shutil, numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from redclusters import clusters
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
N = len([f for f in os.listdir(src) if f.endswith('.jpg')])
# phone tilt keyframes (degrees, text direction), interpolated
ANG = {225:33, 300:33, 360:33, 436:22, 455:18, 470:8, 490:5, 508:4}
def ang(f):
    ks=sorted(ANG); 
    if f<=ks[0]: return ANG[ks[0]]
    for a,b in zip(ks,ks[1:]):
        if a<=f<=b: return ANG[a]+(ANG[b]-ANG[a])*(f-a)/(b-a)
    return ANG[ks[-1]]
ranges=[(225,362),(436,N)]
SEED={225:(441,569),436:(376,609)}
det={}
for lo,hi in ranges:
    prev=SEED[lo]
    for f in range(lo,hi+1):
        cs=[c for c in clusters('%s/f_%04d.jpg'%(src,f)) if c[1]<560 and 9<=c[3]<=40 and 9<=c[4]<=45]
        if prev: cs=[c for c in cs if math.hypot(c[1]-prev[0],c[2]-prev[1])<45]
        if cs:
            # in Merci screens prefer the cluster nearest previous / leftmost-lower one
            c=min(cs,key=lambda c:(math.hypot(c[1]-prev[0],c[2]-prev[1]) if prev else -c[0]))
            det[f]=(c[1],c[2]); prev=det[f]
# fill gaps by interpolation / hold
def pos(f):
    if f in det: return det[f]
    ks=sorted(det); lo=[k for k in ks if k<f]; hi=[k for k in ks if k>f]
    rng=[r for r in ranges if r[0]<=f<=r[1]][0]
    lo=[k for k in lo if k>=rng[0]]; hi=[k for k in hi if k<=rng[1]]
    if lo and hi:
        a,b=lo[-1],hi[0]; t=(f-a)/(b-a); return tuple(det[a][i]+(det[b][i]-det[a][i])*t for i in (0,1))
    return det[(lo or hi)[-1 if lo else 0]]
missing=[f for lo,hi in ranges for f in range(lo,hi+1) if f not in det]
print('detected', len(det), 'missing', len(missing), missing[:40])
for f in range(1,N+1):
    s='%s/f_%04d.jpg'%(src,f); d='%s/f_%04d.jpg'%(dst,f)
    if not any(lo<=f<=hi for lo,hi in ranges): shutil.copy(s,d); continue
    im=Image.open(s).convert('RGB'); x,y=pos(f); th=math.radians(ang(f))
    ux,uy=math.cos(th),math.sin(th); vx,vy=-uy,ux
    L0,L1,h=-6,205,24
    poly=[(x+ux*L0+vx*-h, y+uy*L0+vy*-h),(x+ux*L1+vx*-h, y+uy*L1+vy*-h),(x+ux*L1+vx*h, y+uy*L1+vy*h),(x+ux*L0+vx*h, y+uy*L0+vy*h)]
    # start after avatar (avatar radius ~18)
    poly=[(px+ux*20,py+uy*20) for px,py in poly]
    m=Image.new('L',im.size,0); ImageDraw.Draw(m).polygon(poly,fill=255); m=m.filter(ImageFilter.GaussianBlur(5))
    bl=im.filter(ImageFilter.GaussianBlur(14))
    im=Image.composite(bl,im,m); im.save(d,quality=93)
print('done')
