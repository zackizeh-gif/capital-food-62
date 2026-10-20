import sys, numpy as np
from PIL import Image
from collections import deque
def clusters(path, f=3):
    a=np.asarray(Image.open(path).convert('RGB')).astype(int)
    r,g,b=a[...,0],a[...,1],a[...,2]
    m=(r>170)&(g<110)&(b<110)&(r-g>90)
    H,W=m.shape; m=m[:H//f*f,:W//f*f].reshape(H//f,f,W//f,f).any((1,3))
    seen=np.zeros_like(m); out=[]
    for y,x in zip(*np.nonzero(m)):
        if seen[y,x]: continue
        q=deque([(y,x)]); seen[y,x]=1; pts=[]
        while q:
            cy,cx=q.popleft(); pts.append((cy,cx))
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx=cy+dy,cx+dx
                if 0<=ny<m.shape[0] and 0<=nx<m.shape[1] and m[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=1; q.append((ny,nx))
        if len(pts)>=4:
            p=np.array(pts)*f; out.append((len(pts), int(p[:,1].mean()), int(p[:,0].mean()), int(np.ptp(p[:,1])), int(np.ptp(p[:,0]))))
    return sorted(out, reverse=True)[:5]
if __name__=='__main__':
    for fr in sys.argv[2:]:
        print(fr, clusters('%s/f_%04d.jpg'%(sys.argv[1],int(fr))))
