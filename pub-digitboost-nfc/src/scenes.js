// ─────────────────────────────────────────────────────────────
// SCENES — chaque scène : create(root, opts) → { update(lt, dur), cues(dur) }
// lt = temps local de la scène (s). Les cues alimentent le design sonore.
// ─────────────────────────────────────────────────────────────
const T = CFG.text;
const A = (p) => '../assets/' + p;
const SCENES = {};

const CHECK_SVG = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ── Composants partagés ─────────────────────────────────────
function makeCard(parent, width) {
  const el = h('div', 'card3d', parent, null, { width: width + 'px', height: width + 'px' });
  const layers = [];
  for (let i = 6; i >= 1; i--) {
    const L = h('div', 'layer', el, null, { backgroundImage: `url(${A('card.png')})`, filter: `brightness(${0.32 + i * 0.02})` });
    L.style.transform = `translateZ(${-i * 1.6}px)`;
    layers.push(L);
  }
  const face = h('div', 'face', el);
  h('img', '', face).src = A('card.png');
  h('div', 'gloss', face);
  const sheen = h('div', 'sheen', face);
  return { el, face, sheen, width };
}
function setCard(c, p) {
  setT(c.el, { x: p.x - c.width / 2, y: p.y - c.width / 2, rx: p.rx || 0, ry: p.ry || 0, r: p.r || 0, s: p.s ?? 1, o: p.o, blur: p.blur });
  c.sheen.style.left = (p.sheen ?? -60) + '%';
}

function makeRing(parent, cx, cy, rx, ry) {
  const svg = s('svg', { width: 1080, height: 1920, viewBox: '0 0 1080 1920', class: 'full' }, parent);
  svg.style.position = 'absolute';
  const defs = s('defs', {}, svg);
  const f = s('filter', { id: 'rg' + cx + cy, x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
  s('feGaussianBlur', { stdDeviation: 14 }, f);
  const grad = s('radialGradient', { id: 'pool' + cx + cy, cx: '50%', cy: '50%', r: '50%' }, defs);
  s('stop', { offset: '0%', 'stop-color': '#f04c1e', 'stop-opacity': 0.42 }, grad);
  s('stop', { offset: '100%', 'stop-color': '#f04c1e', 'stop-opacity': 0 }, grad);
  const pool = s('ellipse', { cx, cy, rx: rx * 1.25, ry: ry * 1.6, fill: `url(#pool${cx}${cy})` }, svg);
  const glow = s('ellipse', { cx, cy, rx, ry, fill: 'none', stroke: '#f04c1e', 'stroke-width': 26, filter: `url(#rg${cx}${cy})`, opacity: 0.85 }, svg);
  const core = s('ellipse', { cx, cy, rx, ry, fill: 'none', stroke: '#ff7a4d', 'stroke-width': 5 }, svg);
  const dash = s('ellipse', { cx, cy, rx: rx * 0.78, ry: ry * 0.78, fill: 'none', stroke: 'rgba(255,170,140,0.55)', 'stroke-width': 2.5, 'stroke-dasharray': '6 22' }, svg);
  const outer = s('ellipse', { cx, cy, rx: rx * 1.18, ry: ry * 1.18, fill: 'none', stroke: 'rgba(240,76,30,0.35)', 'stroke-width': 2 }, svg);
  return { svg, pool, glow, core, dash, outer, rx, ry };
}
function setRing(R, p) {
  // p.k : progression d'apparition 0..1, p.t : temps (rotation des pointillés)
  const k = p.k ?? 1;
  R.svg.style.opacity = (p.o ?? 1) * k;
  const sc = lerp(0.6, 1, Ease.outCubic(k));
  R.svg.style.transformOrigin = `${R.core.getAttribute('cx')}px ${R.core.getAttribute('cy')}px`;
  R.svg.style.transform = `scale(${sc})`;
  R.dash.setAttribute('stroke-dashoffset', (-p.t * 60).toFixed(1));
  R.glow.setAttribute('opacity', (0.7 + 0.25 * Math.sin(p.t * 5)).toFixed(3));
}

function chipHTML(text, num) {
  return num ? `<span class="chip num">${text}</span>` : `<span class="chip"><span class="dot"></span>${text}</span>`;
}

// Odomètre : colonne de chiffres qui défile.
function makeOdo(parent, digits = 10, reps = 3) {
  const o = h('span', 'odo', parent);
  const strip = h('span', 'strip', o);
  for (let r = 0; r < reps; r++) for (let d = 0; d < digits; d++) h('span', '', strip, String(d));
  return { o, strip };
}
function setOdo(od, pos, blur = 0) {
  od.strip.style.transform = `translateY(${(-pos).toFixed(4)}em)`;
  od.strip.style.filter = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : 'none';
}

// ─────────────────────────────────────────────────────────────
// 1. HOOK — « Vos clients sont satisfaits. Mais laissent-ils un avis ? »
// ─────────────────────────────────────────────────────────────
SCENES.hook = {
  create(root, o) {
    const k = o.dur / 2.6;
    const g = h('div', 'full', root);
    const big = { fontSize: '118px' };
    const A1 = h('div', 'line t-xl', g, null, { top: '536px', ...big });
    const A2 = h('div', 'line t-xl', g, null, { top: '662px', ...big });
    const a = [...words(A1, T.hookA[0]), ...words(A2, T.hookA[1])];
    const B1 = h('div', 'line t-xl', g, null, { top: '536px', ...big });
    const B2 = h('div', 'line t-xl', g, null, { top: '662px', ...big });
    const b = [...words(B1, T.hookB[0]), ...words(B2, T.hookB[1])];
    b.slice(-2).forEach((sp) => sp.classList.add('orange', 'glow-o'));

    const svg = s('svg', { width: 1080, height: 220, viewBox: '0 0 1080 220' }, g);
    Object.assign(svg.style, { position: 'absolute', left: 0, top: '900px', overflow: 'visible' });
    const stars = [];
    for (let i = 0; i < 5; i++) {
      const cx = 540 + (i - 2) * 150, cy = 110;
      const grp = s('g', {}, svg);
      const out = s('path', { d: starPath(cx, cy, 58, 25), fill: 'none', stroke: 'rgba(255,255,255,0.22)', 'stroke-width': 4, 'stroke-linejoin': 'round' }, grp);
      const glow = s('path', { d: starPath(cx, cy, 58, 25), fill: '#f04c1e', 'stroke-linejoin': 'round', opacity: 0 }, grp);
      glow.style.filter = 'blur(14px)';
      const fill = s('path', { d: starPath(cx, cy, 58, 25), fill: '#ff6a3d', stroke: '#ff6a3d', 'stroke-width': 6, 'stroke-linejoin': 'round' }, grp);
      grp.style.transformOrigin = `${cx}px ${cy}px`;
      stars.push({ grp, out, fill, glow });
    }
    const tStar = (i) => (0.55 + i * 0.11) * k;
    const tDrain = (i) => (1.6 + (4 - i) * 0.07) * k;

    return {
      update(lt, dur) {
        revealWords(a, lt, 0.04 * k, 0.07 * k, 0.42 * k, { s0: 1.22, blur: 16, dy: 10, e: Ease.outQuart, out: [1.3 * k, 1.5 * k, 0.03 * k], outDy: 70 });
        revealWords(b, lt, 1.42 * k, 0.07 * k, 0.4 * k, { s0: 1.22, blur: 16, dy: 10, e: Ease.outQuart });
        stars.forEach((st, i) => {
          const p = prog(lt, tStar(i), tStar(i) + 0.3 * k);
          const d = Ease.inOutCubic(prog(lt, tDrain(i), tDrain(i) + 0.25 * k));
          const fillK = Ease.outCubic(p) * (1 - d);
          const sc = lt < tStar(i) ? 0.5 : lerp(0.5, 1, Ease.outBack(p, 2.4)) * lerp(1, 0.9, d);
          st.grp.style.transform = `scale(${sc.toFixed(4)})`;
          st.grp.style.opacity = clamp(prog(lt, tStar(i) - 0.25 * k, tStar(i))).toFixed(3);
          st.fill.setAttribute('opacity', fillK.toFixed(3));
          st.glow.setAttribute('opacity', (fillK * 0.9).toFixed(3));
        });
        const ex = Ease.inCubic(prog(lt, dur - 0.32, dur));
        setT(g, { s: 1 + ex * 0.45, o: 1 - ex, blur: ex * 18 });
      },
      cues(dur) {
        const c = [[0.02, 'impact', 1]];
        for (let i = 0; i < 5; i++) c.push([tStar(i) + 0.04, 'tick', 0.85, { pitch: 1 + i * 0.12 }]);
        c.push([1.3 * k, 'whoosh', 0.45, { len: 0.35 }]);
        for (let i = 0; i < 5; i++) c.push([tDrain(i), 'tick', 0.45, { pitch: 0.75 - i * 0.05 }]);
        c.push([dur - 0.34, 'whoosh', 0.85, { len: 0.42 }]);
        return c;
      },
    };
  },
};

// ─────────────────────────────────────────────────────────────
// 2. SALON — la gêne de demander
// ─────────────────────────────────────────────────────────────
SCENES.salon = {
  create(root, o) {
    const g = h('div', 'full', root);
    const ghost = h('div', 'abs mono', g, '?', { fontWeight: 800, fontSize: '1100px', lineHeight: 1, color: 'rgba(255,255,255,0.035)', left: '420px', top: '420px' });
    const tag = h('div', 'line', g, chipHTML(T.salonTag), { top: '300px' });
    const bub = h('div', 'abs glass', g, null, { left: '110px', top: '600px', width: '860px', padding: '58px 62px 64px', boxSizing: 'border-box', borderRadius: '44px 44px 44px 12px' });
    const who = h('div', 'mono gray', bub, 'VOUS, À LA CAISSE :', { fontSize: '26px', fontWeight: 700, letterSpacing: '0.14em', marginBottom: '22px' });
    const txt = h('div', '', bub, null, { fontSize: '56px', fontWeight: 500, lineHeight: 1.28, minHeight: '144px' });
    const span = h('span', '', txt);
    const cur = h('span', 'cursor', txt);
    const L1 = h('div', 'line t-l', g, null, { top: '1110px' });
    const L2 = h('div', 'line t-l gray', g, null, { top: '1212px' });
    const hw = [...words(L1, T.salonA), ...words(L2, T.salonB)];
    const full = T.salonTyped;
    const N = full.length;
    const tType0 = 0.32, tType1 = 1.62, tDel0 = 1.92, tDel1 = 2.2;
    const charT = (i) => lerp(tType0, tType1, i / N);
    const delT = (i) => lerp(tDel0, tDel1, i / N);

    return {
      update(lt, dur) {
        const inK = Ease.outCubic(prog(lt, 0, 0.22));
        let n = Math.floor(prog(lt, tType0, tType1) * N);
        if (lt > tDel0) n = Math.ceil(N * (1 - prog(lt, tDel0, tDel1)));
        span.textContent = full.slice(0, n);
        const typing = (lt > tType0 && lt < tType1) || (lt > tDel0 && lt < tDel1);
        cur.style.opacity = typing || Math.floor(lt * 3.6) % 2 === 0 ? 1 : 0;
        setT(tag, { y: (1 - Ease.outCubic(prog(lt, 0.08, 0.4))) * 20, o: prog(lt, 0.08, 0.35) });
        const bk = Ease.outQuart(prog(lt, 0.12, 0.5));
        const bOut = Ease.inCubic(prog(lt, 2.2, 2.45));
        setT(bub, { y: (1 - bk) * 50 - bOut * 30, s: lerp(0.94, 1, bk) * lerp(1, 0.96, bOut), o: bk * (1 - bOut * 0.65), blur: bOut * 3 });
        revealWords(hw, lt, 2.15, 0.06, 0.42, { dy: 36, blur: 12 });
        setT(ghost, { x: -lt * 22, y: lt * 6, o: 1 });
        const wp = Ease.inCubic(prog(lt, dur - 0.24, dur));
        setT(g, { x: -wp * 1080, s: lerp(1.08, 1, inK), o: inK, blur: wp * 14 });
      },
      cues(dur) {
        const c = [[0.1, 'tac', 0.35]];
        const r = rng(11);
        for (let i = 1; i <= N; i++) if (full[i - 1] !== ' ') c.push([charT(i) - 0.01, 'key', 0.5 + r() * 0.25, { pitch: 0.9 + r() * 0.3 }]);
        for (let i = 0; i < N; i += 2) c.push([delT(i), 'key', 0.35, { pitch: 1.3 }]);
        c.push([2.14, 'thud', 0.55]);
        c.push([dur - 0.26, 'whoosh', 0.9, { len: 0.36, pan: -1 }]);
        return c;
      },
    };
  },
};

// ─────────────────────────────────────────────────────────────
// 3. RESTAURANT — trop d'étapes
// ─────────────────────────────────────────────────────────────
SCENES.resto = {
  create(root, o) {
    const g = h('div', 'full', root);
    const photo = h('img', 'abs', g, null, { left: 0, top: 0, width: '1080px', height: '1920px', objectFit: 'cover' });
    photo.src = A('decor-starfood.jpg');
    h('div', 'full', g, null, { background: 'linear-gradient(180deg, rgba(11,11,12,0.94) 0%, rgba(11,11,12,0.45) 26%, rgba(11,11,12,0.5) 58%, rgba(11,11,12,0.96) 82%)' });
    const tag = h('div', 'line', g, chipHTML(T.restoTag), { top: '300px' });
    const ctr = h('div', 'line mono', g, null, { top: '410px', fontWeight: 800, fontSize: '72px', letterSpacing: '0.02em', display: 'flex', justifyContent: 'center', alignItems: 'center', lineHeight: 1 });
    h('span', 'gray', ctr, 'ÉTAPE', { fontSize: '40px', letterSpacing: '0.14em', fontWeight: 700, marginRight: '22px' });
    const od = makeOdo(ctr, 10, 1);
    h('span', 'gray', ctr, '/4');

    const persp = h('div', 'abs', g, null, { left: '130px', top: '560px', width: '820px', height: '620px', perspective: '1500px' });
    const plane = h('div', 'full', persp, null, { transformStyle: 'preserve-3d' });
    const cards = T.restoSteps.map((lbl, i) => {
      const c = h('div', 'step-card glass', plane, null, { top: i * 150 + 'px' });
      h('div', 'n', c, String(i + 1));
      h('div', 'lbl', c, lbl);
      const x = h('div', 'x', c, '✕');
      return { c, x };
    });
    const L1 = h('div', 'line t-l', g, null, { top: '1290px' });
    const L2 = h('div', 'line t-l gray', g, null, { top: '1392px' });
    const hw = [...words(L1, T.restoA), ...words(L2, T.restoB)];
    const tCard = (i) => 0.5 + i * 0.4;
    const tFail = 2.3;

    return {
      update(lt, dur) {
        const wi = Ease.outCubic(prog(lt, 0, 0.24));
        setT(photo, { s: 1.14 + lt * 0.02, x: -lt * 8, f: 'brightness(0.62) saturate(0.95) contrast(1.06) blur(1.5px)' });
        setT(tag, { o: prog(lt, 0.15, 0.4), y: (1 - Ease.outCubic(prog(lt, 0.15, 0.45))) * 20 });
        let step = 0;
        for (let i = 0; i < 4; i++) step += Ease.inOutCubic(prog(lt, tCard(i), tCard(i) + 0.22));
        setOdo(od, step, 0);
        setT(ctr, { o: prog(lt, 0.35, 0.55) });
        const fail = Ease.outCubic(prog(lt, tFail, tFail + 0.3));
        cards.forEach(({ c, x }, i) => {
          const p = Ease.outQuart(prog(lt, tCard(i), tCard(i) + 0.34));
          const shake = lt > tFail ? Math.sin((lt - tFail) * 70 + i) * 10 * Math.exp(-(lt - tFail) * 7) : 0;
          setT(c, { x: (1 - p) * 120 + shake, z: (1 - p) * -260, o: p * lerp(1, 0.5, fail), blur: (1 - p) * 8 });
          c.style.borderColor = fail > 0 ? `rgba(240,76,30,${(0.12 + fail * 0.5).toFixed(3)})` : '';
          x.style.opacity = Ease.outCubic(prog(lt, tFail + i * 0.06, tFail + 0.2 + i * 0.06));
        });
        setT(plane, { rx: 16, ry: -18 + lt * 2.2, r: -2 });
        revealWords(hw, lt, tFail + 0.12, 0.06, 0.42, { dy: 36, blur: 12 });
        const ex = Ease.inCubic(prog(lt, dur - 0.34, dur));
        setT(g, { x: (1 - wi) * 1080, o: 1 - ex, blur: (1 - wi) * 14 });
      },
      cues(dur) {
        const c = [[0.12, 'tac', 0.35]];
        for (let i = 0; i < 4; i++) { c.push([tCard(i) + 0.02, 'tac', 0.75, { pitch: 1 + i * 0.06 }]); c.push([tCard(i) + 0.08, 'tick', 0.55, { pitch: 1.1 }]); }
        c.push([tFail, 'thud', 0.9]);
        return c;
      },
    };
  },
};

// ─────────────────────────────────────────────────────────────
// 4. PRISE DE CONSCIENCE — « Et si laisser un avis devenait plus simple ? »
// ─────────────────────────────────────────────────────────────
SCENES.aware = {
  create(root, o) {
    const g = h('div', 'full', root);
    const L1 = h('div', 'line', g, null, { top: '820px', fontSize: '74px', fontWeight: 600, letterSpacing: '-0.015em' });
    const L2 = h('div', 'line', g, null, { top: '918px', fontSize: '74px', fontWeight: 600, letterSpacing: '-0.015em' });
    const w1 = words(L1, T.aware[0]);
    const w2 = words(L2, T.aware[1]);
    const acc = w2.find((sp) => sp.textContent === T.awareAccent);
    acc.classList.add('orange');
    const streak = h('div', 'abs', g, null, { left: '-300px', width: '1680px', height: '8px', top: '1060px', opacity: 0,
      background: 'linear-gradient(90deg, transparent 0%, rgba(255,122,77,0.0) 20%, rgba(255,150,110,0.95) 49%, #fff 50%, rgba(255,150,110,0.95) 51%, transparent 80%)',
      boxShadow: '0 0 50px 16px rgba(240,76,30,0.35)', borderRadius: '8px' });
    return {
      update(lt, dur) {
        revealWords([...w1, ...w2], lt, 0.12, 0.085, 0.55, { dy: 34, blur: 16, e: Ease.outQuart });
        const gl = Ease.inOutSine(prog(lt, 1.15, 1.9));
        acc.style.textShadow = `0 0 ${(10 + gl * 40).toFixed(1)}px rgba(240,76,30,${(0.25 + gl * 0.6).toFixed(3)})`;
        const sp = prog(lt, dur - 0.42, dur);
        streak.style.opacity = (Math.sin(sp * Math.PI) * 1).toFixed(3);
        setT(streak, { x: lerp(-900, 900, Ease.inOutCubic(sp)), sy: 1 + sp * 2 });
        const ex = Ease.inCubic(prog(lt, dur - 0.2, dur));
        setT(g, { s: 1 + lt * 0.018 + ex * 0.06, o: 1 - ex * 0.6 });
      },
      cues(dur) {
        return [[0.0, 'riser', 0.8, { len: dur }], [dur - 0.42, 'whoosh', 0.6, { len: 0.45, bright: 1 }]];
      },
    };
  },
};

// ─────────────────────────────────────────────────────────────
// 5. HERO — la carte NFC DigitBoost, plan produit
// ─────────────────────────────────────────────────────────────
SCENES.hero = {
  create(root, o) {
    const sh = !!o.short;
    const g = h('div', 'full', root);
    const ring = makeRing(g, 540, 1405, 380, 86);
    const persp = h('div', 'full', g, null, { perspective: '1800px' });
    const card = makeCard(persp, 620);
    const tag = h('div', 'line', g, chipHTML(T.heroTag), { top: '250px' });
    const L1 = h('div', 'line t-xl', g, null, { top: '350px' });
    const L2 = h('div', 'line t-xl', g, null, { top: '462px' });
    const hw = words(L1, T.heroA);
    const wb = h('span', 'w', L2, `<span>Digit</span><span class="blue">Boost</span>`);
    const flash = h('div', 'full', g, null, { background: '#fff', opacity: 0 });
    const t0 = 0.18;
    return {
      update(lt, dur) {
        flash.style.opacity = kf(lt, [[0, 0], [t0, 1, Ease.inQuad], [0.55, 0, Ease.outCubic]]).toFixed(3);
        const p = Ease.outCubic(prog(lt, t0, dur));
        const ex = Ease.inExpo(prog(lt, dur - 0.36, dur));
        const S = lerp(0.84, 1, p) * (1 + ex * 4.6);
        // zoom raccordé vers le pictogramme NFC (−62, +105 px du centre de la carte)
        const cx = lerp(540, 540 + 62 * S, ex), cy = lerp(1010 - (1 - p) * 40, 960 - 105 * S, ex);
        setCard(card, {
          x: cx, y: cy + Math.sin(lt * 2.2) * 6 * (1 - ex),
          rx: lerp(22, 11, p) * (1 - ex), ry: lerp(-34, -11, p) * (1 - ex), r: lerp(-7, -2, p) * (1 - ex),
          s: S, o: prog(lt, t0 - 0.05, t0 + 0.12), blur: ex * 7,
          sheen: lerp(-60, 150, Ease.inOutCubic(prog(lt, 0.55, 1.55))),
        });
        setRing(ring, { k: Ease.outCubic(prog(lt, t0 + 0.05, t0 + 0.6)), t: lt, o: 1 - ex });
        setT(tag, { o: prog(lt, 0.32, 0.55) * (1 - ex), y: (1 - Ease.outCubic(prog(lt, 0.32, 0.6))) * 20 });
        revealWords([...hw, wb], lt, 0.4, 0.08, 0.45, { s0: 1.18, dy: 10, blur: 14, e: Ease.outQuart });
        L1.style.opacity = L2.style.opacity = (1 - Ease.inCubic(prog(lt, dur - 0.4, dur - 0.2))).toFixed(3);
        tag.style.opacity = (prog(lt, 0.32, 0.55) * (1 - Ease.inCubic(prog(lt, dur - 0.4, dur - 0.2)))).toFixed(3);
      },
      cues(dur) {
        return [
          [t0 - 0.02, 'impact', 0.9, { low: 1 }], [t0, 'shimmer', 0.75, { len: 1.6 }],
          [0.34, 'tac', 0.35], [0.6, 'swish', 0.3],
          [dur - 0.4, 'whoosh', 0.95, { len: 0.5, bright: 1 }],
        ];
      },
    };
  },
};

// ─────────────────────────────────────────────────────────────
// 6. DÉMO — vraie vidéo, ralenti au contact, HUD, speed ramps
// ─────────────────────────────────────────────────────────────
SCENES.demo = {
  create(root, o) {
    const segs = o.segments;
    let acc = 0;
    segs.forEach((sg) => { sg.t0 = acc; sg.d = (sg.f1 - sg.f0) / 60 / sg.rate; acc += sg.d; sg.t1 = acc; });
    const tAtFrame = (f) => { for (const sg of segs) if (f >= sg.f0 && f <= sg.f1) return sg.t0 + (f - sg.f0) / 60 / sg.rate; return 0; };
    const stepStart = (st) => segs.find((sg) => sg.step === st).t0;

    const g = h('div', 'full', root);
    const cam = h('div', 'abs', g, null, { left: 0, top: 0, width: '1080px', height: '1920px', transformOrigin: '0 0' });
    const img = h('img', 'abs', cam, null, { left: 0, top: 0, width: '1080px', height: '1920px' });
    const hud = s('svg', { width: 1080, height: 1920, viewBox: '0 0 1080 1920' }, cam);
    Object.assign(hud.style, { position: 'absolute', left: 0, top: 0, overflow: 'visible' });
    // HUD : cible NFC
    const CX = 520, CY = 862;
    const tgt = s('g', {}, hud);
    const tRing = s('circle', { cx: CX, cy: CY, r: 150, fill: 'none', stroke: '#ff6a3d', 'stroke-width': 4, 'stroke-dasharray': '14 18' }, tgt);
    const tRing2 = s('circle', { cx: CX, cy: CY, r: 182, fill: 'none', stroke: 'rgba(255,106,61,0.45)', 'stroke-width': 2 }, tgt);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      s('line', { x1: CX + Math.cos(a) * 196, y1: CY + Math.sin(a) * 196, x2: CX + Math.cos(a) * 226, y2: CY + Math.sin(a) * 226, stroke: '#ff6a3d', 'stroke-width': 4, 'stroke-linecap': 'round' }, tgt);
    }
    const nfcTxt = s('text', { x: CX + 240, y: CY - 170, fill: '#ff6a3d', 'font-family': 'JBM', 'font-weight': 700, 'font-size': 30, 'letter-spacing': '4' }, tgt);
    nfcTxt.textContent = 'NFC';
    const pulses = [0, 1, 2].map(() => s('circle', { cx: CX, cy: CY, r: 60, fill: 'none', stroke: '#ff7a4d', 'stroke-width': 6, opacity: 0 }, hud));
    // HUD : cadre de la notification
    const nb = s('g', { opacity: 0 }, hud);
    const bw = 330, bh = 128, br = 12, bl = 44;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      const x = (sx * bw) / 2, y = (sy * bh) / 2;
      s('path', { d: `M${x} ${y - sy * bl} L${x} ${y - sy * br} Q${x} ${y} ${x - sx * br} ${y} L${x - sx * bl} ${y}`, fill: 'none', stroke: '#ff6a3d', 'stroke-width': 5, 'stroke-linecap': 'round' }, nb);
    });
    const tap = s('circle', { cx: 0, cy: 0, r: 20, fill: 'rgba(255,255,255,0.35)', stroke: '#fff', 'stroke-width': 4, opacity: 0 }, hud);
    // Confettis du succès
    const burst = s('g', {}, hud);
    const R = rng(5);
    const parts = Array.from({ length: 30 }, () => {
      const a = R() * Math.PI * 2, sp = 380 + R() * 620, sz = 8 + R() * 16;
      const col = ['#ff6a3d', '#f04c1e', '#ffffff', '#fdd22a', '#2f66f5'][Math.floor(R() * 5)];
      const el = s('rect', { x: -sz / 2, y: -sz / 4, width: sz, height: sz / 2, rx: sz / 5, fill: col, opacity: 0 }, burst);
      return { el, a, sp, rot: R() * 720 - 360 };
    });

    // Habillage
    h('div', 'full', g, null, { background: 'radial-gradient(70% 48% at 48% 44%, transparent 35%, rgba(8,8,9,0.72) 100%)' });
    h('div', 'full', g, null, { background: 'linear-gradient(180deg, rgba(11,11,12,0.94) 0%, rgba(11,11,12,0.6) 18%, transparent 30%, transparent 70%, rgba(11,11,12,0.85) 86%, rgba(11,11,12,0.96) 100%)' });
    const topLine = h('div', 'line', g, null, { top: '235px' });
    const steps = [T.demo1, T.demo2, T.demo3].map((txt, i) => {
      const L = h('div', 'line t-xl', topLine, null, { top: 0 });
      const ch = h('span', 'w', L, `<span class="chip num" style="vertical-align: 0.28em; margin-right: 26px">0${i + 1}</span>`);
      const wd = h('span', 'w', L, txt);
      return { L, parts: [ch, wd] };
    });
    const done = h('div', 'line', topLine, `<span class="pill-ok"><span class="ic">${CHECK_SVG}</span>${T.demoDone}</span>`, { top: '10px' });
    const note = h('div', 'line', g, T.demoNote, { top: '1462px', fontSize: '44px', fontWeight: 600, color: 'rgba(245,245,247,0.92)' });

    const tNfc = tAtFrame(62), tNotif = tAtFrame(67), tTap = tAtFrame(142), tMerci = tAtFrame(446);
    const nbKeys = [[100, 280, 873], [112, 300, 873], [124, 318, 832], [140, 347, 833], [150, 350, 833]];
    const S = [1, 2, 3, 4].map(stepStart);

    // Caméra (point visé fx, fy dans l'image source + zoom z), par temps local.
    const camKeys = [
      [0, 530, 860, 1.30], [S[1] - 0.05, 520, 860, 1.44],
      [S[1] + 0.25, 420, 840, 1.46], [S[2] - 0.02, 360, 820, 1.58],
      [S[2] + 0.2, 470, 760, 1.40], [S[3] - 0.05, 470, 740, 1.48],
      [S[3] + 0.2, 455, 790, 1.30], [acc, 455, 800, 1.40],
    ];
    const camAt = (t) => [1, 2, 3].map((j) => kf(t, camKeys.map((k) => [k[0], k[j]]), Ease.inOutSine));

    let cur = -1;
    return {
      async update(lt, dur) {
        // segment & image source
        const sg = segs.find((x) => lt < x.t1) || segs[segs.length - 1];
        const f = clamp(Math.round(sg.f0 + (lt - sg.t0) * 60 * sg.rate), 1, 508);
        let [fx, fy, z] = camAt(lt);
        let blur = 0;
        if (sg.ramp) { const q = Math.sin(prog(lt, sg.t0, sg.t1) * Math.PI); z *= 1 + q * 0.08; blur = q * 5; }
        const inK = Ease.outCubic(prog(lt, 0, 0.36));
        z *= lerp(2.1, 1, inK); blur += (1 - inK) * 8;
        const wp = Ease.inCubic(prog(lt, dur - 0.22, dur));
        cam.style.transform = `translate(${(540 - fx * z).toFixed(2)}px, ${(960 - fy * z).toFixed(2)}px) scale(${z.toFixed(4)})`;
        img.style.filter = `brightness(0.8) contrast(1.13) saturate(0.92)${blur > 0.1 ? ` blur(${blur.toFixed(1)}px)` : ''}`;
        setT(g, { x: -wp * 1080, o: inK, blur: wp * 12 });

        // HUD cible
        const tk = Ease.outCubic(prog(lt, 0.25, 0.6)) * (1 - Ease.inCubic(prog(lt, S[1] - 0.05, S[1] + 0.18)));
        tgt.setAttribute('opacity', tk.toFixed(3));
        tgt.setAttribute('transform', `rotate(${(lt * 40).toFixed(2)} ${CX} ${CY})`);
        tRing.setAttribute('r', (150 + 8 * Math.sin(lt * 6)).toFixed(1));
        tRing2.setAttribute('stroke-opacity', (0.5 + 0.5 * prog(lt, tNfc, tNfc + 0.2)).toFixed(3));
        pulses.forEach((pc, i) => {
          const q = prog(lt, tNfc + i * 0.16, tNfc + i * 0.16 + 0.75);
          pc.setAttribute('r', (60 + Ease.outCubic(q) * 330).toFixed(1));
          pc.setAttribute('opacity', (q > 0 && q < 1 ? (1 - q) : 0).toFixed(3));
          pc.setAttribute('stroke-width', (8 * (1 - q) + 1).toFixed(2));
        });
        // HUD notification
        const nk = Ease.outCubic(prog(lt, S[1] + 0.05, S[1] + 0.35)) * (1 - Ease.inCubic(prog(lt, tTap, tTap + 0.1)));
        const nx = kf(f, nbKeys.map((k) => [k[0], k[1]]), Ease.linear), ny = kf(f, nbKeys.map((k) => [k[0], k[2]]), Ease.linear);
        nb.setAttribute('opacity', nk.toFixed(3));
        nb.setAttribute('transform', `translate(${nx.toFixed(1)} ${ny.toFixed(1)}) rotate(38) scale(${(1.15 - 0.15 * nk).toFixed(3)})`);
        const tq = prog(lt, tTap, tTap + 0.45);
        tap.setAttribute('transform', `translate(${nx} ${ny})`);
        tap.setAttribute('r', (20 + Ease.outCubic(tq) * 90).toFixed(1));
        tap.setAttribute('opacity', (tq > 0 && tq < 1 ? 1 - tq : 0).toFixed(3));
        // Confettis
        parts.forEach((pt) => {
          const q = prog(lt, tMerci, tMerci + 1.1);
          if (q <= 0 || q >= 1) { pt.el.setAttribute('opacity', 0); return; }
          const e = Ease.outCubic(q), d = pt.sp * e;
          const x = 455 + Math.cos(pt.a) * d, y = 700 + Math.sin(pt.a) * d * 0.8 + q * q * 260;
          pt.el.setAttribute('opacity', (1 - Ease.inCubic(q)).toFixed(3));
          pt.el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(pt.rot * q).toFixed(1)})`);
        });

        // Titres d'étapes
        steps.forEach((st, i) => {
          const a0 = S[i], a1 = i < 2 ? S[i + 1] : S[3];
          const isIn = lt >= a0 - 0.01;
          revealWords(st.parts, lt, a0 + (i === 0 ? 0.22 : 0.02), 0.06, 0.36, { s0: 1.15, dy: 12, blur: 14, e: Ease.outQuart, out: [a1 - 0.18, a1 + 0.02, 0.03], outDy: 60 });
          st.L.style.display = isIn && lt < a1 + 0.1 ? '' : 'none';
        });
        const dk = Ease.outBack(prog(lt, tMerci + 0.15, tMerci + 0.55), 2.2);
        setT(done, { s: lerp(0.4, 1, dk), o: prog(lt, tMerci + 0.15, tMerci + 0.3) });
        const nk2 = Ease.outCubic(prog(lt, S[2] + 0.2, S[2] + 0.55)) * (1 - Ease.inCubic(prog(lt, S[3] - 0.1, S[3] + 0.15)));
        setT(note, { o: nk2, y: (1 - nk2) * 20 });

        if (f !== cur) { cur = f; img.src = A('footage/demo/f_' + String(f).padStart(4, '0') + '.jpg'); try { await img.decode(); } catch (e) {} }
      },
      cues(dur) {
        const c = [
          [0.22, 'tac', 0.5], [0.3, 'scan', 0.45, { len: Math.max(0.3, tNfc - 0.3) }],
          [tNfc, 'nfc', 1], [tNotif, 'notif', 0.9],
          [S[1] + 0.02, 'tac', 0.5], [tTap, 'tap', 0.9],
          [S[2] + 0.02, 'tac', 0.5], [S[3] + 0.02, 'tac', 0.3],
          [tMerci, 'success', 0.9], [tMerci + 0.15, 'pop', 0.6],
          [dur - 0.25, 'whoosh', 0.85, { len: 0.36, pan: -1 }],
        ];
        segs.filter((x) => x.ramp).forEach((x) => c.push([x.t0 - 0.03, 'whoosh', 0.55, { len: x.d + 0.1 }]));
        return c;
      },
    };
  },
};

// ─────────────────────────────────────────────────────────────
// 7. ARGUMENT — flèches montantes
// ─────────────────────────────────────────────────────────────
function arrowSVG(parent, w = 96, hgt = 128) {
  const svg = s('svg', { width: w, height: hgt * 2, viewBox: `0 0 ${w} ${hgt * 2}` }, parent);
  svg.style.overflow = 'visible';
  const defs = s('defs', {}, svg);
  const id = 'ag' + Math.floor(Math.random() * 1e9);
  const gr = s('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  s('stop', { offset: '0%', 'stop-color': '#ff6a3d', 'stop-opacity': 0.9 }, gr);
  s('stop', { offset: '100%', 'stop-color': '#f04c1e', 'stop-opacity': 0 }, gr);
  const trail = s('rect', { x: w / 2 - 9, y: hgt * 0.5, width: 18, height: hgt * 1.5, rx: 9, fill: `url(#${id})` }, svg);
  const head = s('path', { d: `M${w / 2} 4 L${w - 6} ${hgt * 0.52} L${w * 0.64} ${hgt * 0.52} L${w * 0.64} ${hgt} L${w * 0.36} ${hgt} L${w * 0.36} ${hgt * 0.52} L6 ${hgt * 0.52} Z`, fill: '#ff6a3d', 'stroke-linejoin': 'round', stroke: '#ff6a3d', 'stroke-width': 6 }, svg);
  head.style.filter = 'drop-shadow(0 0 18px rgba(240,76,30,0.85))';
  return { svg, trail, head, hgt };
}

SCENES.arrows = {
  create(root, o) {
    const g = h('div', 'full', root);
    const R = rng(3);
    const lines = Array.from({ length: 16 }, () => {
      const el = h('div', 'abs', g, null, { left: Math.floor(60 + R() * 960) + 'px', width: '3px', height: Math.floor(120 + R() * 260) + 'px', borderRadius: '3px',
        background: 'linear-gradient(180deg, rgba(255,106,61,0), rgba(255,106,61,0.5), rgba(255,106,61,0))' });
      return { el, y0: R() * 2200, sp: 500 + R() * 900 };
    });
    const X = 104;
    const row = (top, size, cls) => h('div', 'abs ' + cls, g, null, { left: X + 132 + 'px', top: top + 'px', fontSize: size + 'px', fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap', lineHeight: 1.05 });
    const r1 = row(650, 116, ''), r2 = row(888, 88, ''), r3 = row(984, 88, 'gray');
    const w1 = words(r1, T.arrowsA), w2 = words(r2, T.arrowsB), w3 = words(r3, T.arrowsC);
    const a1w = h('div', 'abs', g, null, { left: X + 'px', top: '648px', width: '100px', height: '130px' });
    const a2w = h('div', 'abs', g, null, { left: X + 'px', top: '872px', width: '100px', height: '130px' });
    const ar1 = arrowSVG(a1w, 100, 124), ar2 = arrowSVG(a2w, 100, 124);
    const eq = h('div', 'abs mono orange', g, '=', { left: X + 136 + 'px', top: '790px', fontSize: '64px', fontWeight: 800 });
    const note = h('div', 'abs mono gray', g, T.arrowsNote.replace(', ', ',<br>'), { left: X + 'px', top: '1180px', fontSize: '31px', fontWeight: 500, lineHeight: 1.5, color: '#a3a3ad' });
    const tA1 = 0.3, tA2 = 0.95;
    const arrowAnim = (ar, lt, t0) => {
      const p = prog(lt, t0, t0 + 0.5);
      const y = (1 - Ease.outBack(p, 1.6)) * 200 + Math.sin(Math.max(0, lt - t0 - 0.5) * 5) * 5;
      setT(ar.svg, { y, o: Ease.outCubic(prog(lt, t0, t0 + 0.15)) });
      ar.trail.setAttribute('opacity', (0.35 + 0.65 * (1 - Ease.outCubic(p)) + 0.25 * Math.sin(lt * 7)).toFixed(3));
    };
    return {
      update(lt, dur) {
        const wi = Ease.outCubic(prog(lt, 0, 0.22));
        lines.forEach((l) => { const y = ((l.y0 - lt * l.sp) % 2300 + 2300) % 2300 - 300; setT(l.el, { y, o: 0.55 * wi }); });
        arrowAnim(ar1, lt, tA1); arrowAnim(ar2, lt, tA2);
        revealWords(w1, lt, tA1 + 0.1, 0.07, 0.4, { dy: 40, blur: 12 });
        setT(eq, { o: Ease.outCubic(prog(lt, 0.75, 0.95)), s: lerp(0.6, 1, Ease.outBack(prog(lt, 0.75, 1.0))) });
        revealWords([...w2, ...w3], lt, tA2 + 0.1, 0.06, 0.4, { dy: 40, blur: 12 });
        setT(note, { o: Ease.outCubic(prog(lt, 1.55, 1.85)), y: (1 - Ease.outCubic(prog(lt, 1.55, 1.85))) * 16 });
        const wp = Ease.inCubic(prog(lt, dur - 0.22, dur));
        setT(g, { x: (1 - wi) * 1080 - wp * 1080, blur: (1 - wi) * 12 + wp * 12 });
      },
      cues(dur) {
        return [[tA1, 'rise', 0.9], [tA1 + 0.42, 'tac', 0.4], [0.78, 'tick', 0.4, { pitch: 1.4 }], [tA2, 'rise', 1, { pitch: 1.25 }], [tA2 + 0.42, 'tac', 0.4],
          [dur - 0.24, 'whoosh', 0.8, { len: 0.34, pan: -1 }]];
      },
    };
  },
};

// ─────────────────────────────────────────────────────────────
// 8. PRIX — compteur « 20 € » + puces
// ─────────────────────────────────────────────────────────────
SCENES.price = {
  create(root, o) {
    const g = h('div', 'full', root);
    const tag = h('div', 'line', g, chipHTML(T.priceTag), { top: '400px' });
    const persp = h('div', 'abs', g, null, { left: 0, top: '520px', width: '1080px', height: '460px', perspective: '1400px' });
    const plane = h('div', 'line mono', persp, null, { top: '20px', fontWeight: 800, fontSize: '380px', lineHeight: '1', letterSpacing: '-0.04em', display: 'flex', justifyContent: 'center', alignItems: 'center' });
    const tens = makeOdo(plane, 10, 1), ones = makeOdo(plane, 10, 4);
    h('span', '', plane, T.priceCur, { display: 'inline-block', height: '1em', lineHeight: '1em', marginLeft: '0.32em', color: 'var(--orange-hi)', textShadow: '0 0 40px rgba(240,76,30,0.45)' });
    const bar = h('div', 'abs', g, null, { left: '190px', width: '700px', height: '6px', top: '960px', borderRadius: '6px',
      background: 'linear-gradient(90deg, transparent, #ff6a3d 30%, #fff 50%, #ff6a3d 70%, transparent)', boxShadow: '0 0 40px 8px rgba(240,76,30,0.45)', opacity: 0 });
    const chips = T.priceChips.map((txt, i) => {
      const c = h('div', 'check-chip', g, null, { top: 1080 + i * 132 + 'px' });
      const fill = h('div', 'fill', c);
      h('div', 'ic', c, CHECK_SVG);
      h('span', 't', c, txt);
      return { c, fill };
    });
    const sh = !!o.short;
    const c0 = 0.18, c1 = sh ? 0.95 : 1.12;
    const val = (lt) => T.price * Ease.outExpo(prog(lt, c0, c1));
    const tChip = (i) => c1 + 0.2 + i * 0.24;
    return {
      update(lt, dur) {
        const wi = Ease.outCubic(prog(lt, 0, 0.22));
        setT(tag, { o: prog(lt, 0.1, 0.3), y: (1 - Ease.outCubic(prog(lt, 0.1, 0.35))) * 18 });
        const v = val(lt), vel = (val(lt + 1 / 120) - v) * 120;
        setOdo(ones, v, Math.min(10, vel * 0.25));
        const tensPos = Math.floor(v / 10) + Math.max(0, (v % 10) - 9);
        setOdo(tens, tensPos, (v % 10) > 9 ? Math.min(6, vel * 0.08) : 0);
        const land = prog(lt, c1 - 0.05, c1 + 0.35);
        setT(plane, { rx: 10, ry: lerp(-24, -12, Ease.outCubic(prog(lt, 0, dur))), r: -3, z: lerp(-500, 0, Ease.outCubic(prog(lt, 0, 0.45))), s: 1 + Math.sin(land * Math.PI) * 0.04, o: prog(lt, 0.02, 0.2) });
        bar.style.opacity = (Math.sin(prog(lt, c1 - 0.05, c1 + 0.6) * Math.PI)).toFixed(3);
        setT(bar, { sx: lerp(0.2, 1.2, Ease.outCubic(land)) });
        chips.forEach(({ c, fill }, i) => {
          const p = Ease.outCubic(prog(lt, tChip(i), tChip(i) + 0.35));
          c.style.left = (540 - c.offsetWidth / 2) + 'px';
          setT(c, { y: (1 - p) * 40, o: prog(lt, tChip(i), tChip(i) + 0.15), s: lerp(0.9, 1, p) });
          fill.style.clipPath = `inset(0 ${(100 - Ease.inOutCubic(prog(lt, tChip(i) + 0.08, tChip(i) + 0.42)) * 100).toFixed(2)}% 0 0)`;
        });
        const ex = Ease.inCubic(prog(lt, dur - 0.28, dur));
        setT(g, { x: (1 - wi) * 1080, s: 1 + ex * 0.6, o: 1 - ex, blur: (1 - wi) * 12 + ex * 16 });
      },
      cues(dur) {
        const c = [[0.08, 'tac', 0.4]];
        let last = 0;
        for (let t = c0; t <= c1 + 0.2; t += 1 / 480) {
          const n = Math.floor(val(t) + 1e-6);
          if (n > last) { c.push([t, 'tick', 0.55 + 0.02 * n, { pitch: 0.9 + n * 0.025 }]); last = n; }
        }
        c.push([c1 - 0.02, 'impact', 0.75, { low: 1 }]);
        T.priceChips.forEach((_, i) => c.push([tChip(i) + 0.06, 'tac', 0.8, { pitch: 1 + i * 0.1 }]));
        c.push([dur - 0.3, 'whoosh', 0.7, { len: 0.38 }]);
        return c;
      },
    };
  },
};

// ─────────────────────────────────────────────────────────────
// 9. CTA — logo, carte, « Commentez AVIS »
// ─────────────────────────────────────────────────────────────
SCENES.cta = {
  create(root, o) {
    const g = h('div', 'full', root);
    const ring = makeRing(g, 540, 1012, 270, 58);
    const persp = h('div', 'full', g, null, { perspective: '1600px' });
    const card = makeCard(persp, 400);
    const lock = h('div', 'abs', g, null, { left: 0, top: '236px', width: '1080px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px' });
    const iconWrap = h('div', '', lock, null, { position: 'relative', width: '136px', height: '136px' });
    const bolt = h('div', 'abs', iconWrap, null, { left: '-70px', top: '-70px', width: '276px', height: '276px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(253,210,42,0.55), rgba(253,210,42,0) 70%)', opacity: 0 });
    const icon = h('img', 'abs', iconWrap, null, { left: 0, top: 0, width: '136px', height: '136px', filter: 'drop-shadow(0 16px 40px rgba(20,85,236,0.55))' });
    icon.src = A('logo-icon.png');
    const wm = h('div', '', lock, null, { fontWeight: 700, fontSize: '104px', letterSpacing: '-0.03em', lineHeight: 1 });
    const cs = [...chars(wm, 'Digit'), ...chars(wm, 'Boost')];
    cs.slice(5).forEach((c) => c.classList.add('blue'));
    const sig = h('div', 'line', g, T.ctaSignature, { top: '408px', fontSize: '25px', fontWeight: 600, color: '#9aa3b5' });
    const L1 = h('div', 'line', g, null, { top: '1104px', fontSize: '60px', fontWeight: 600, letterSpacing: '-0.015em' });
    const L2 = h('div', 'line', g, null, { top: '1176px', fontSize: '60px', fontWeight: 600, letterSpacing: '-0.015em' });
    const hw = [...words(L1, T.ctaLine[0]), ...words(L2, T.ctaLine[1])];
    const cta = h('div', 'line', g, `${T.ctaVerb}<span class="kw">${T.ctaKeyword}</span>`, { top: '1300px', fontSize: '88px', fontWeight: 700, letterSpacing: '-0.02em' });
    const kw = cta.querySelector('.kw');
    const offer = h('div', 'line mono gray', g, T.ctaOffer, { top: '1452px', fontSize: '28px', fontWeight: 700, letterSpacing: '0.02em' });
    const tL = 0.12, tCta = 1.35;
    return {
      update(lt, dur) {
        const inK = Ease.outCubic(prog(lt, 0, 0.3));
        setT(g, { s: lerp(0.94, 1, inK), o: inK });
        const ck = Ease.outCubic(prog(lt, 0.05, 0.9));
        setCard(card, { x: 540, y: 790 + Math.sin(lt * 1.8) * 6, rx: lerp(16, 12, ck), ry: lerp(-30, -14, ck) + Math.sin(lt * 0.9) * 3, r: -2, s: lerp(0.8, 1, ck), o: prog(lt, 0.05, 0.3), sheen: lerp(-60, 150, Ease.inOutCubic(prog(lt, 1.0, 2.0))) });
        setRing(ring, { k: Ease.outCubic(prog(lt, 0.15, 0.7)), t: lt });
        const ik = prog(lt, tL, tL + 0.5);
        setT(icon, { s: lerp(0.2, 1, Ease.outBack(ik, 2.0)), r: lerp(-14, 0, Ease.outCubic(ik)), o: prog(lt, tL, tL + 0.12) });
        bolt.style.opacity = (Math.sin(prog(lt, tL + 0.3, tL + 0.9) * Math.PI) * 0.9).toFixed(3);
        cs.forEach((c, i) => {
          const p = Ease.outQuart(prog(lt, tL + 0.18 + i * 0.03, tL + 0.55 + i * 0.03));
          setT(c, { y: (1 - p) * 50, o: p, blur: (1 - p) * 10 });
        });
        const sp = Ease.outCubic(prog(lt, 0.55, 1.2));
        sig.style.letterSpacing = lerp(0.62, 0.32, sp).toFixed(3) + 'em';
        sig.style.opacity = sp.toFixed(3);
        revealWords(hw, lt, 0.85, 0.06, 0.42, { dy: 34, blur: 12 });
        const pk = prog(lt, tCta, tCta + 0.5);
        setT(cta, { s: lerp(0.6, 1, Ease.outBack(pk, 1.8)), o: prog(lt, tCta, tCta + 0.15) });
        const pulse = lt > tCta + 0.6 ? Math.sin((lt - tCta - 0.6) * 4.2) : 0;
        setT(kw, { s: 1 + Math.max(0, pulse) * 0.045 });
        kw.style.boxShadow = `0 18px ${60 + Math.max(0, pulse) * 40}px rgba(20,85,236,${(0.5 + Math.max(0, pulse) * 0.3).toFixed(3)})`;
        setT(offer, { o: Ease.outCubic(prog(lt, 1.8, 2.1)), y: (1 - Ease.outCubic(prog(lt, 1.8, 2.1))) * 14 });
      },
      cues(dur) {
        return [[tL, 'logo', 1], [tL + 0.3, 'shimmer', 0.6, { len: 1.4 }], [0.85, 'tac', 0.35], [tCta, 'pop', 0.95], [tCta + 0.04, 'tac', 0.5],
          [1.8, 'tick', 0.35, { pitch: 1.3 }]];
      },
    };
  },
};

// ─────────────────────────────────────────────────────────────
// Global : fond, grain, vignette
// ─────────────────────────────────────────────────────────────
const Global = {
  init() {
    const stage = document.getElementById('stage');
    const bg = h('div', '', stage); bg.id = 'bg';
    const fw = h('div', 'floor-wrap', bg);
    this.floor = h('div', 'floor', fw);
    this.floor.style.transform = 'rotateX(78deg)';
    const R = rng(21);
    this.bokeh = Array.from({ length: 22 }, () => {
      const sz = 6 + R() * 46, warm = R() > 0.35;
      const el = h('div', 'bokeh', bg, null, {
        width: sz + 'px', height: sz + 'px',
        background: `radial-gradient(closest-side, ${warm ? 'rgba(255,106,61,0.55)' : 'rgba(255,255,255,0.35)'}, transparent)`,
        filter: `blur(${(sz / 10).toFixed(1)}px)`,
      });
      return { el, x: R() * 1080, y: R() * 1920, sp: 10 + R() * 40, ph: R() * 6, sz };
    });
    const fx = h('div', '', stage); fx.id = 'fx';
    h('div', 'vig', fx);
    this.grain = h('div', 'grain', fx);
  },
  update(t) {
    this.floor.style.backgroundPosition = `0px ${(t * 40).toFixed(1)}px`;
    this.bokeh.forEach((b) => {
      const y = ((b.y - t * b.sp) % 2000 + 2000) % 2000 - 40;
      setT(b.el, { x: b.x + Math.sin(t * 0.5 + b.ph) * 20, y, o: 0.35 + 0.35 * Math.sin(t * 0.8 + b.ph) });
    });
    const f = Math.floor(t * 30);
    const R = rng(1000 + f);
    this.grain.style.transform = `translate(${Math.floor(R() * 256)}px, ${Math.floor(R() * 256)}px)`;
  },
};
