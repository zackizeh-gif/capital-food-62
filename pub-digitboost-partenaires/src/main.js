// ─────────────────────────────────────────────────────────────
// PUB « DIGITBOOST EST PRÉSENT » — réseau de restaurants partenaires
// Une seule fonction pure du temps : render(t). Les couches :
//   fond + lumière volumétrique → monde 3D (carte, pins, réseau) → textes → effets.
// ─────────────────────────────────────────────────────────────
const C = CFG, TT = C.t, TX = C.text;
const stage = document.getElementById('stage');
const A = (p) => '../assets/' + p;
const MK = C.map.k;
const toPlane = (x, y) => [x * MK, (y - C.map.cropTop) * MK];
const pinT = (i) => TT.pin0 + i * TT.pinStep;

// ── Fond : rayons de lumière + poussières ──────────────────
const bgLayer = h('div', 'full', stage);
const rays = [[-160, -28, 0.9], [120, -24, 0.6], [420, -31, 0.5], [760, -26, 0.35]].map(([x, r, o]) => {
  const el = h('div', 'ray', bgLayer); return { el, x, r, o };
});

// ── Monde 3D ──────────────────────────────────────────────
const world = h('div', '', stage); world.id = 'world';
const plane = h('div', '', world, null, { width: C.map.w + 'px', height: C.map.h + 'px' }); plane.id = 'plane';
const mapImg = h('img', '', plane, null, { width: C.map.w + 'px', height: C.map.h + 'px' });
mapImg.src = C.map.src;
const surf = s('svg', { width: C.map.w, height: C.map.h, viewBox: `0 0 ${C.map.w} ${C.map.h}` }, plane);
const defs = s('defs', {}, surf);
const gGlow = s('radialGradient', { id: 'gglow' }, defs);
s('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': 1 }, gGlow);
s('stop', { offset: '18%', 'stop-color': '#7fe3ff', 'stop-opacity': 0.9 }, gGlow);
s('stop', { offset: '55%', 'stop-color': '#2f6bff', 'stop-opacity': 0.35 }, gGlow);
s('stop', { offset: '100%', 'stop-color': '#2f6bff', 'stop-opacity': 0 }, gGlow);
// libellés de la carte (à plat sur la carte)
const mapLabels = C.mapLabels.map((L) => {
  const [x, y] = toPlane(L.x, L.y);
  if (L.cls === 'road') {
    const g = s('g', { transform: `translate(${x} ${y})` }, surf);
    s('rect', { x: -L.size * 2.1, y: -L.size * 1.1, width: L.size * 4.2, height: L.size * 2.2, rx: 6, fill: 'rgba(8,18,44,0.8)', stroke: 'rgba(110,160,255,0.55)', 'stroke-width': 2 }, g);
    const t = s('text', { x: 0, y: L.size * 0.55, 'text-anchor': 'middle', 'font-size': L.size * 1.6, class: 'maplbl road' }, g);
    t.textContent = L.text; return g;
  }
  const t = s('text', { x, y, 'text-anchor': 'middle', 'font-size': L.size * MK, class: 'maplbl ' + L.cls }, surf);
  t.textContent = L.text; return t;
});
// réseau (arbre couvrant minimal entre les partenaires)
const P = C.partners.map((p) => toPlane(p.x, p.y));
const edges = (() => {
  const inT = [0], out = [];
  while (inT.length < P.length) {
    let best = null;
    for (const a of inT) for (let b = 0; b < P.length; b++) if (!inT.includes(b)) {
      const d = Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]);
      if (!best || d < best[2]) best = [a, b, d];
    }
    out.push(best); inT.push(best[1]);
  }
  return out;
})();
const netG = s('g', {}, surf);
const net = edges.map(([a, b, d], k) => {
  const glow = s('line', { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], stroke: 'rgba(47,107,255,0.35)', 'stroke-width': 14, 'stroke-linecap': 'round' }, netG);
  const core = s('line', { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], stroke: '#8fe6ff', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, netG);
  const spark = s('circle', { r: 7, fill: '#ffffff', opacity: 0 }, netG);
  [glow, core].forEach((l) => { l.setAttribute('stroke-dasharray', `${d} ${d}`); l.setAttribute('stroke-dashoffset', d); });
  return { glow, core, spark, a, b, d, k };
});
// sol de chaque repère : point lumineux + impulsions
const grounds = P.map(([x, y]) => {
  const g = s('g', {}, surf);
  const halo = s('circle', { cx: x, cy: y, r: 70, fill: 'url(#gglow)', opacity: 0 }, g);
  const rings = [0, 1].map(() => s('circle', { cx: x, cy: y, r: 20, fill: 'none', stroke: '#7fe3ff', 'stroke-width': 4, opacity: 0 }, g));
  return { halo, rings };
});
// repères (billboards debout, face caméra)
const PIN_SVG = `<svg width="92" height="120" viewBox="0 0 72 94">
  <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f8cff"/><stop offset="1" stop-color="#0d3fd6"/></linearGradient></defs>
  <path d="M36 92 C25 74 3 58 3 35 A33 33 0 1 1 69 35 C69 58 47 74 36 92 Z" fill="url(#pg)" stroke="rgba(190,225,255,0.85)" stroke-width="2"/>
  <circle cx="36" cy="35" r="19" fill="#fff"/>
  <path d="M39.5 21 L28 38.5 L35.2 38.5 L31.8 50 L44.2 31.6 L37 31.6 Z" fill="#fdd22a" stroke="#f4b400" stroke-width="0.8" stroke-linejoin="round"/>
</svg>`;
const pins = C.partners.map((p, i) => {
  const [x, y] = P[i];
  const el = h('div', 'pin', plane, null, { left: x + 'px', top: y + 'px' });
  const stem = h('div', 'stem', el);
  const head = h('div', 'head', el, PIN_SVG);
  const label = h('div', 'label', el);
  h('span', 'idx', label, String(i + 1).padStart(2, '0'));
  const txt = h('span', '', label);
  h('span', 'nm', txt, p.name);
  if (p.sub) h('span', 'sub', txt, p.sub.toUpperCase());
  return { el, stem, head, label, p };
});

// ── Couches de texte ──────────────────────────────────────
const shade = h('div', 'full', stage, null, { background: 'linear-gradient(180deg, rgba(2,6,15,0.92) 0%, rgba(2,6,15,0.55) 22%, rgba(2,6,15,0) 36%, rgba(2,6,15,0) 70%, rgba(2,6,15,0.75) 86%, rgba(2,6,15,0.95) 100%)' });
const dim = h('div', 'full', stage, null, { background: 'radial-gradient(80% 50% at 50% 50%, rgba(2,6,15,0.55), rgba(2,6,15,0.9))', opacity: 0 });
const dustLayer = h('div', 'full', stage);
const R = rng(9);
const dust = Array.from({ length: 46 }, () => {
  const sz = 3 + R() * 9, far = R();
  const el = h('div', 'dust', dustLayer, null, { width: sz + 'px', height: sz + 'px',
    background: `radial-gradient(closest-side, rgba(${far > 0.5 ? '160,220,255' : '255,255,255'},0.9), transparent)` });
  return { el, x: R() * 1080, y: R() * 1920, sp: 8 + far * 30, ph: R() * 6, sz, far };
});

// Intro : logo révélé par la lumière
const intro = h('div', 'full', stage);
const sweep = h('div', 'beam-sweep', intro);
const iconWrap = h('div', 'abs', intro, null, { left: '410px', top: '600px', width: '260px', height: '260px' });
const iconGlow = h('div', 'abs', iconWrap, null, { left: '-170px', top: '-170px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(47,107,255,0.5), rgba(47,107,255,0) 70%)' });
const icon = h('img', 'abs', iconWrap, null, { left: 0, top: 0, width: '260px', height: '260px' });
icon.src = A('logo-icon.png');
const iconSheen = h('div', 'abs', iconWrap, null, { left: 0, top: 0, width: '260px', height: '260px', borderRadius: '19.3%', overflow: 'hidden' });
const sheenBar = h('div', 'abs', iconSheen, null, { top: '-50%', height: '200%', width: '40%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent)', mixBlendMode: 'screen' });
const brand = h('div', 'line brand', intro, null, { top: '935px', fontSize: '92px' });
const bA = h('span', 'grad-white', brand, TX.brand[0]);
const bB = h('span', 'grad-blue', brand, TX.brand[1]);
const tag = h('div', 'line', intro, TX.tagline, { top: '1068px', fontSize: '40px', fontWeight: 500, color: 'var(--mist)', letterSpacing: '0.04em' });
const reveal = h('div', 'full', stage, null, { mixBlendMode: 'screen' });

// Titre « DIGITBOOST EST PRÉSENT »
const title = h('div', 'full', stage);
const T1 = h('div', 'line brand', title, null, { top: '268px', fontSize: '96px', letterSpacing: '0.14em' });
const T2 = h('div', 'line brand', title, null, { top: '380px', fontSize: '96px', letterSpacing: '0.14em' });
const t1c = chars(T1, TX.present[0], 'c grad-blue');
const t2c = chars(T2, TX.present[1], 'c');
const dots = h('div', 'dots', stage);
const dotEls = C.partners.map(() => h('i', '', dots));

// Logo final + slogan
const lock = h('div', 'abs', stage, null, { left: 0, top: '210px', width: '1080px' });
const lockIn = h('div', '', lock, null, { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '26px' });
const lIconW = h('div', '', lockIn, null, { position: 'relative', width: '112px', height: '112px' });
const lGlow = h('div', 'abs', lIconW, null, { left: '-90px', top: '-90px', width: '292px', height: '292px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(47,107,255,0.55), transparent 70%)' });
const lIcon = h('img', 'abs', lIconW, null, { left: 0, top: 0, width: '112px', height: '112px' });
lIcon.src = A('logo-icon.png');
const lWord = h('div', '', lockIn, null, { fontWeight: 700, fontSize: '88px', letterSpacing: '-0.03em', lineHeight: 1 });
const lw = [...chars(lWord, 'Digit', 'c'), ...chars(lWord, 'Boost', 'c blue-glow')];
const flareH = h('div', 'abs', stage, null, { left: '-200px', width: '1480px', top: '262px', height: '8px', borderRadius: '8px', opacity: 0,
  background: 'linear-gradient(90deg, transparent, rgba(56,214,255,0.0) 15%, rgba(140,225,255,0.9) 47%, #fff 50%, rgba(140,225,255,0.9) 53%, transparent 85%)', boxShadow: '0 0 60px 18px rgba(47,107,255,0.45)' });
const flareR = h('div', 'abs', stage, null, { left: '128px', top: '62px', width: '400px', height: '400px', borderRadius: '50%', opacity: 0,
  background: 'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(120,200,255,0.5) 30%, transparent 70%)', mixBlendMode: 'screen' });
const ev = h('div', 'line brand', stage, null, { top: '650px', fontSize: '132px', letterSpacing: '0.08em' });
const evw = TX.etVous.map((w, i) => { const sp = h('span', 'w' + (TX.blueWords.includes(w) ? ' blue-glow' : ''), ev, w); if (i < TX.etVous.length - 1) ev.appendChild(document.createTextNode(' ')); return sp; });
const qLines = TX.question.map((parts, i) => {
  const L = h('div', 'line brand', stage, null, { top: 900 + i * 98 + 'px', fontSize: '76px', letterSpacing: '0.05em' });
  return parts.map((w, j) => { const sp = h('span', 'w' + (TX.blueWords.includes(w) ? ' blue-glow' : ''), L, w); if (j < parts.length - 1) L.appendChild(document.createTextNode(' ')); return sp; });
}).flat();
const fade = h('div', 'full', stage, null, { background: 'var(--night)', opacity: 0 });
const fx = h('div', '', stage); fx.id = 'fx';
h('div', 'vig', fx);
const grain = h('div', 'grain', fx);

// ── Caméra ────────────────────────────────────────────────
// [t, cible x, cible y (coordonnées carte), zoom, inclinaison, rotation]
const camKeys = (() => {
  const k = [[TT.mapIn, 1380, 640, 0.40, 64, -18], [TT.pin0 - 0.45, 1210, 470, 0.92, 47, -10]];
  P.forEach(([x, y], i) => {
    const t0 = pinT(i), z = 1.42 + (i % 2) * 0.06, rz = -8 + 3 * Math.sin(i * 1.7);
    if (i > 0) {
      const [px, py] = P[i - 1], d = Math.hypot(x - px, y - py);
      if (d > 900) k.push([t0 - 0.28, (x + px) / 2, (y + py) / 2 - 40, 0.78, 45, rz]);   // « saut » : la caméra prend de la hauteur
    }
    k.push([t0 + 0.2, x + 165, y - 110, z, 42, rz]);
    k.push([pinT(i) + TT.pinStep - 0.62, x + 180, y - 104, z * 1.03, 41.5, rz + 0.6]);
  });
  k.push([TT.overview + 1.35, 1104, 760, 0.64, 31, -3]);
  k.push([TT.etVous, 1104, 752, 0.62, 32, -2]);
  k.push([C.duration, 1104, 760, 0.66, 34, -1]);
  return k;
})();
const camAt = (t) => [1, 2, 3, 4, 5].map((j) => kf(t, camKeys.map((k) => [k[0], k[j]]), Ease.inOutSine));

// ── Rendu d'une image ─────────────────────────────────────
function render(t) {
  // fond
  rays.forEach((r, i) => setT(r.el, { x: r.x + Math.sin(t * 0.25 + i) * 30, r: r.r, o: r.o * (0.6 + 0.4 * Math.sin(t * 0.5 + i * 1.3)) }));
  dust.forEach((d) => {
    const y = ((d.y - t * d.sp) % 2000 + 2000) % 2000 - 40;
    setT(d.el, { x: d.x + Math.sin(t * 0.4 + d.ph) * 16 - t * d.far * 6, y, o: (0.25 + 0.45 * Math.sin(t * 0.7 + d.ph) ** 2) * (d.far > 0.5 ? 0.8 : 0.55) });
  });

  // INTRO (0 → 4,2 s)
  const inOn = t < 4.3;
  show(intro, inOn);
  if (inOn) {
    const sw = prog(t, -0.7, 3.0);
    setT(sweep, { x: lerp(-1300, 1500, Ease.inOutSine(sw)), r: 18, o: Math.sin(sw * Math.PI) });
    const push = lerp(0.92, 1.04, Ease.outCubic(prog(t, 0, 4.2)));
    const ex = Ease.inCubic(prog(t, 3.45, 4.25));
    setT(intro, { s: push * (1 + ex * 0.28), o: 1 - ex, blur: ex * 10 });
    const rv = Ease.inOutSine(prog(t, 0.3, TT.logoHit + 0.15));
    iconWrap.style.webkitMaskImage = `linear-gradient(105deg, #000 ${(rv * 150 - 30).toFixed(1)}%, transparent ${(rv * 150 + 10).toFixed(1)}%)`;
    setT(iconWrap, { s: lerp(0.94, 1, Ease.outCubic(prog(t, 0.5, 2.6))) });
    iconGlow.style.opacity = (Ease.outCubic(prog(t, TT.logoHit - 0.2, TT.logoHit + 0.6)) * (0.75 + 0.25 * Math.sin(t * 2))).toFixed(3);
    sheenBar.style.left = lerp(-60, 140, Ease.inOutSine(prog(t, TT.logoHit + 0.2, TT.logoHit + 1.4))) + '%';
    const bk = Ease.outCubic(prog(t, 2.15, 3.1));
    brand.style.letterSpacing = lerp(0.55, 0.2, bk).toFixed(3) + 'em';
    setT(brand, { o: bk, blur: (1 - bk) * 10 });
    const sh = (lerp(110, -10, Ease.inOutSine(prog(t, 2.3, 3.9)))).toFixed(1) + '% 0';
    bA.style.backgroundPosition = bB.style.backgroundPosition = sh;
    const tk = Ease.outCubic(prog(t, 2.75, 3.45));
    setT(tag, { o: tk, y: (1 - tk) * 16 });
  }

  // CARTE révélée sous une lumière bleue
  const mk = prog(t, TT.mapIn, TT.mapIn + 2.6);
  const rad = lerp(0, 2300, Ease.inOutSine(mk));
  const cx = lerp(300, 560, Ease.outCubic(mk)), cy = lerp(700, 1000, Ease.outCubic(mk));
  show(world, t >= TT.mapIn);
  world.style.webkitMaskImage = mk >= 1 ? 'none' : `radial-gradient(circle at ${cx}px ${cy}px, #000 ${Math.max(0, rad - 380)}px, transparent ${rad}px)`;
  reveal.style.background = mk > 0 && mk < 1 ? `radial-gradient(circle at ${cx}px ${cy}px, transparent ${Math.max(0, rad - 340)}px, rgba(56,214,255,0.13) ${Math.max(0, rad - 120)}px, transparent ${rad + 40}px)` : 'none';
  if (t >= TT.mapIn) {
    const [tx, ty, z, tilt, rz] = camAt(t);
    plane.style.transform = `translate3d(540px,1000px,0) rotateX(${tilt.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${z.toFixed(4)}) translate(${(-tx).toFixed(2)}px,${(-ty).toFixed(2)}px)`;
    mapImg.style.filter = `brightness(${(0.55 + 0.45 * Ease.inOutSine(mk)).toFixed(3)})`;
    // repères
    const ov = Ease.inOutCubic(prog(t, TT.overview, TT.overview + 1.2));
    pins.forEach((pn, i) => {
      const t0 = pinT(i);
      const on = t >= t0 - 0.05;
      show(pn.el, on);
      const gnd = grounds[i];
      const lp = prog(t, t0, t0 + 0.35);
      const breathe = t > TT.overview ? 0.75 + 0.25 * Math.sin((t - TT.overview) * 2.4 + i * 0.8) : 1;
      gnd.halo.setAttribute('opacity', (Ease.outCubic(lp) * breathe).toFixed(3));
      gnd.halo.setAttribute('r', (70 + 30 * Math.exp(-Math.max(0, t - t0 - 0.3) * 3) * lp).toFixed(1));
      gnd.rings.forEach((rg, j) => {
        const q = prog(t, t0 + 0.25 + j * 0.28, t0 + 1.25 + j * 0.28);
        const q2 = t > TT.overview ? ((t - TT.overview - i * 0.12 + j * 0.9) % 1.8) / 1.8 : -1;  // impulsions lentes en vue d'ensemble
        const qq = q > 0 && q < 1 ? q : q2 > 0 ? q2 : -1;
        rg.setAttribute('opacity', qq > 0 ? ((1 - qq) * (q > 0 && q < 1 ? 0.95 : 0.45)).toFixed(3) : 0);
        rg.setAttribute('r', qq > 0 ? (20 + Ease.outCubic(qq) * 150).toFixed(1) : 20);
      });
      if (!on) return;
      const [, , z, tilt, rz] = camAt(t);
      const pinScale = lerp(1, 0.8, ov);
      pn.el.style.transform = `rotateZ(${(-rz).toFixed(3)}deg) rotateX(${(-tilt).toFixed(3)}deg) scale(${(pinScale / z).toFixed(4)})`;
      const rise = Ease.outCubic(prog(t, t0 + 0.08, t0 + 0.9));
      const stemH = 30 + rise * 84;
      pn.stem.style.height = stemH + 'px';
      pn.stem.style.opacity = prog(t, t0 + 0.05, t0 + 0.3);
      const hs = Ease.outBack(prog(t, t0 + 0.12, t0 + 0.85), 1.4);
      pn.head.style.bottom = (stemH - 6) + 'px';
      setT(pn.head, { s: lerp(0.15, 1, hs) * (t > TT.overview ? 1 + 0.04 * Math.sin((t - TT.overview) * 2.4 + i * 0.8) : 1), o: prog(t, t0 + 0.12, t0 + 0.3) });
      // étiquette : côté droit en plan rapproché, côté prévu en vue d'ensemble
      const lk = Ease.outCubic(prog(t, t0 + 0.42, t0 + 1.0));
      const lw = pn.label.offsetWidth, lh = pn.label.offsetHeight;
      const headCy = -(stemH - 6) - 75;
      const side = pn.p.ov;
      const closeX = 58, closeY = headCy - lh / 2;
      const ovX = side === 'l' ? -58 - lw : side === 't' ? -lw / 2 : 58;
      const ovY = side === 't' ? headCy - 70 - lh : headCy - lh / 2;
      const lx = lerp(closeX, ovX, ov), ly = lerp(closeY, ovY, ov);
      pn.label.style.left = lx + 'px'; pn.label.style.top = ly + 'px';
      pn.label.style.clipPath = `inset(0 ${((1 - lk) * 100).toFixed(2)}% 0 0 round 20px)`;
      const lOut = 1 - Ease.inOutSine(prog(t, TT.etVous - 0.5, TT.etVous + 0.2));
      pn.label.style.transformOrigin = side === 'l' ? '100% 50%' : side === 't' ? '50% 100%' : '0% 50%';
      setT(pn.label, { x: (1 - lk) * -24, o: prog(t, t0 + 0.42, t0 + 0.6) * lOut, s: lerp(1, 0.78, ov) });
    });
    // réseau
    net.forEach((n) => {
      const q = Ease.inOutSine(prog(t, TT.overview + 0.5 + n.k * 0.16, TT.overview + 1.4 + n.k * 0.16));
      [n.glow, n.core].forEach((l) => l.setAttribute('stroke-dashoffset', (n.d * (1 - q)).toFixed(1)));
      n.core.setAttribute('opacity', (0.85 * (0.75 + 0.25 * Math.sin(t * 2 + n.k))).toFixed(3));
      const sp = q >= 1 ? ((t * 0.45 + n.k * 0.37) % 1) : -1;
      if (sp >= 0) {
        n.spark.setAttribute('cx', lerp(P[n.a][0], P[n.b][0], sp)); n.spark.setAttribute('cy', lerp(P[n.a][1], P[n.b][1], sp));
        n.spark.setAttribute('opacity', (Math.sin(sp * Math.PI) * 0.9).toFixed(3));
      } else n.spark.setAttribute('opacity', 0);
    });
    mapLabels.forEach((l) => l.setAttribute('opacity', (Ease.inOutSine(prog(t, TT.mapIn + 1.4, TT.mapIn + 3)) * (1 - 0.4 * ov)).toFixed(3)));
  }

  // Titre « DIGITBOOST EST PRÉSENT »
  const tOn = t > TT.title - 0.1 && t < TT.pin0 + 0.6;
  show(title, tOn);
  if (tOn) {
    const outq = Ease.inCubic(prog(t, TT.pin0 - 0.3, TT.pin0 + 0.4));
    [...t1c, ...t2c].forEach((c, i) => {
      const p = Ease.outQuart(prog(t, TT.title + i * 0.035, TT.title + 0.7 + i * 0.035));
      setT(c, { y: (1 - p) * 30 - outq * 40, o: p * (1 - outq), blur: (1 - p) * 12 + outq * 10 });
    });
    t1c.forEach((c) => (c.style.backgroundPosition = lerp(110, -10, Ease.inOutSine(prog(t, TT.title + 0.6, TT.title + 2.4))) + '% 0'));
  }
  // points de progression
  const dOn = t > TT.pin0 - 0.3 && t < TT.overview + 1;
  show(dots, dOn);
  if (dOn) {
    setT(dots, { o: prog(t, TT.pin0 - 0.3, TT.pin0) * (1 - prog(t, TT.overview, TT.overview + 0.8)) });
    dotEls.forEach((d, i) => {
      const a = Ease.outCubic(prog(t, pinT(i) + 0.1, pinT(i) + 0.5));
      d.style.background = `rgba(${lerp(160, 56, a)},${lerp(190, 214, a)},255,${lerp(0.22, 1, a)})`;
      d.style.boxShadow = a > 0 ? `0 0 ${(14 * a).toFixed(1)}px rgba(56,214,255,${(0.8 * a).toFixed(2)})` : 'none';
      setT(d, { s: 1 + 0.35 * Math.sin(prog(t, pinT(i) + 0.1, pinT(i) + 0.6) * Math.PI) });
    });
  }

  // Logo final
  const lOn = t > TT.logo2 - 0.1;
  show(lock, lOn); show(flareH, lOn); show(flareR, lOn);
  if (lOn) {
    const ik = prog(t, TT.logo2, TT.logo2 + 0.9);
    setT(lIconW, { s: lerp(0.6, 1, Ease.outBack(ik, 1.2)), o: Ease.outCubic(prog(t, TT.logo2, TT.logo2 + 0.4)) });
    lGlow.style.opacity = (Ease.outCubic(ik) * (0.7 + 0.3 * Math.sin(t * 2.2))).toFixed(3);
    lw.forEach((c, i) => {
      const p = Ease.outQuart(prog(t, TT.logo2 + 0.2 + i * 0.04, TT.logo2 + 0.8 + i * 0.04));
      setT(c, { y: (1 - p) * 30, o: p, blur: (1 - p) * 10 });
    });
    const fq = prog(t, TT.flare, TT.flare + 0.7);
    const fk = Math.sin(fq * Math.PI);
    flareH.style.opacity = (fk * 0.95).toFixed(3);
    setT(flareH, { sx: lerp(0.3, 1.2, Ease.outCubic(fq)) });
    flareR.style.opacity = (fk * 0.85).toFixed(3);
  }
  // Assombrissement + slogan
  dim.style.opacity = (Ease.inOutSine(prog(t, TT.etVous - 0.5, TT.etVous + 0.4)) * 0.85).toFixed(3);
  show(ev, t > TT.etVous - 0.1);
  revealWords(evw, t, TT.etVous, 0.22, 0.75, { dy: 40, blur: 18, s0: 1.08, e: Ease.outQuart });
  qLines.forEach((sp) => (sp.parentElement.style.display = t > TT.question - 0.1 ? '' : 'none'));
  revealWords(qLines, t, TT.question, 0.12, 0.7, { dy: 36, blur: 16, e: Ease.outQuart });
  const endK = Ease.inOutSine(prog(t, TT.fade, C.duration));
  fade.style.opacity = endK.toFixed(3);

  const fr = Math.floor(t * 30), RR = rng(500 + fr);
  grain.style.transform = `translate(${Math.floor(RR() * 256)}px, ${Math.floor(RR() * 256)}px)`;
}

// ── Repères sonores (pour la musique et les impacts) ──────
function cues() {
  const c = [{ t: 0, type: 'intro' }, { t: TT.logoHit, type: 'logo' }, { t: 2.15, type: 'brand' }, { t: TT.mapIn, type: 'map' },
    { t: TT.title, type: 'title' }];
  C.partners.forEach((p, i) => c.push({ t: +pinT(i).toFixed(4), type: 'pin', i }));
  c.push({ t: TT.overview, type: 'overview' }, { t: TT.logo2, type: 'logo2' }, { t: TT.etVous, type: 'etvous' },
    { t: TT.question, type: 'question' }, { t: TT.flare, type: 'flare' }, { t: TT.fade, type: 'fade' });
  return c;
}

// ── API ───────────────────────────────────────────────────
(async function () {
  await document.fonts.ready;
  await Promise.all([C.map.src, A('logo-icon.png'), A('grain.png')].map((src) => { const im = new Image(); im.src = src; return im.decode().catch(() => {}); }));
  await mapImg.decode().catch(() => {});
  window.renderAt = async (t) => render(t);
  window.getDuration = () => C.duration;
  window.getScenes = () => [];
  window.getCues = cues;
  const q = new URLSearchParams(location.search);
  render(q.has('t') ? parseFloat(q.get('t')) : 0);
  if (q.has('play')) {
    document.body.classList.add('preview');
    const fit = () => (stage.style.transform = `scale(${Math.min(innerWidth / 1080, innerHeight / 1920)})`);
    fit(); addEventListener('resize', fit);
    const t0 = performance.now();
    const loop = () => { render(((performance.now() - t0) / 1000) % C.duration); requestAnimationFrame(loop); };
    loop();
  }
  window.__ready = true;
})();
