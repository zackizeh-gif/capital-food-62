import sys, numpy as np
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int)
mx, mn = a.max(2), a.min(2)
mask = ((a[...,2]-a[...,0]) > 25) | (mn > 190)
def first(arr, k=12):
    for i in range(len(arr)-k):
        if arr[i:i+k].all(): return i
    return None
L=[];R=[];T=[];B=[]
for y in range(650, 1250, 4):
    row = mask[y, 200:1200]
    L.append((200+first(row), y)); R.append((1199-first(row[::-1]), y))
for x in range(420, 960, 4):
    col = mask[450:1450, x]
    T.append((x, 450+first(col))); B.append((x, 1449-first(col[::-1])))
def fit(pts, inv):
    p=np.array(pts,float)
    X,Y = (p[:,1],p[:,0]) if inv else (p[:,0],p[:,1])
    keep = np.ones(len(X),bool)
    for _ in range(5):
        f = np.polyfit(X[keep],Y[keep],1)
        r = np.abs(np.polyval(f,X)-Y); med = np.median(r[keep])
        keep = r < max(2.0, 3*med)
    print('kept', keep.sum(), '/', len(X))
    return f
lx, rx, ty, by = fit(L,1), fit(R,1), fit(T,0), fit(B,0)
def resid(pts, f, inv):
    p=np.array(pts,float); 
    return np.abs((np.polyval(f,p[:,1])-p[:,0]) if inv else (np.polyval(f,p[:,0])-p[:,1])).max()
#print('max resid L R T B', resid(L,lx,1), resid(R,rx,1), resid(T,ty,0), resid(B,by,0))
def inter(xl, yl):
    a1,b1 = xl; a2,b2 = yl
    y = (a2*b1 + b2)/(1 - a2*a1); return (a1*y + b1, y)
TL, TR, BR, BL = inter(lx,ty), inter(rx,ty), inter(rx,by), inter(lx,by)
print('corners', [tuple(round(float(v),1) for v in c) for c in (TL,TR,BR,BL)])
S = 1200
dst = [(0,0),(S,0),(S,S),(0,S)]; srcp=[TL,TR,BR,BL]
A=[];bb=[]
for (u,v),(x,y) in zip(dst,srcp):
    A.append([u,v,1,0,0,0,-x*u,-x*v]); bb.append(x)
    A.append([0,0,0,u,v,1,-y*u,-y*v]); bb.append(y)
coef = np.linalg.solve(np.array(A,float), np.array(bb,float))
card = im.transform((S,S), Image.PERSPECTIVE, tuple(coef), Image.BICUBIC)
rad = int(S*float(sys.argv[3]) if len(sys.argv)>3 else S*0.05)
m = Image.new('L',(S*4,S*4),0); ImageDraw.Draw(m).rounded_rectangle((0,0,S*4-1,S*4-1), rad*4, fill=255)
m = m.resize((S,S), Image.LANCZOS)
card.putalpha(m); card.save(out); print('saved')
