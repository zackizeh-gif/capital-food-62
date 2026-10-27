// ─────────────────────────────────────────────────────────────
// ENGINE — easing, keyframes, helpers DOM, timeline déterministe.
// Chaque image est une fonction pure du temps t : renderFrame(t).
// ─────────────────────────────────────────────────────────────
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));

const Ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

// Interpolation d'une valeur entre t0 et t1 avec easing.
const tw = (t, t0, t1, a, b, e = Ease.outCubic) => lerp(a, b, e(prog(t, t0, t1)));

// Keyframes : [[t, v], ...] — easing par segment (3e élément optionnel).
function kf(t, keys, e = Ease.inOutCubic) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1, ee] = keys[i + 1];
    if (t <= t1) return lerp(v0, v1, (ee || e)(prog(t, t0, t1)));
  }
  return keys[keys.length - 1][1];
}

// Générateur pseudo-aléatoire déterministe.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Création DOM
function h(tag, cls, parent, html, style) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html !== undefined && html !== null) el.innerHTML = html;
  if (style) Object.assign(el.style, style);
  if (parent) parent.appendChild(el);
  return el;
}
const SVGNS = 'http://www.w3.org/2000/svg';
function s(tag, attrs, parent) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(el);
  return el;
}

// Transformations / opacité / flou en une ligne.
function setT(el, p = {}) {
  const { x = 0, y = 0, z = 0, s: sc = 1, sx = 1, sy = 1, r = 0, rx = 0, ry = 0 } = p;
  el.style.transform =
    `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) ` +
    `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotate(${r.toFixed(3)}deg) ` +
    `scale(${(sc * sx).toFixed(4)},${(sc * sy).toFixed(4)})`;
  if (p.o !== undefined) el.style.opacity = clamp(p.o).toFixed(3);
  if (p.blur !== undefined || p.f !== undefined) {
    const b = p.blur > 0.05 ? `blur(${p.blur.toFixed(2)}px) ` : '';
    el.style.filter = (b + (p.f || '')).trim() || 'none';
  }
}
const show = (el, v) => (el.style.display = v ? '' : 'none');

// Découpe un texte en mots (spans inline-block) pour la typographie cinétique.
function words(parent, text, cls = 'w') {
  const out = [];
  text.split(' ').forEach((wd, i, arr) => {
    const sp = h('span', cls, parent, wd);
    out.push(sp);
    if (i < arr.length - 1) parent.appendChild(document.createTextNode(' '));
  });
  return out;
}
function chars(parent, text, cls = 'c') {
  return [...text].map((ch) => h('span', cls, parent, ch === ' ' ? '&nbsp;' : ch));
}

// Apparition mot par mot : montée + flou + échelle.
function revealWords(spans, lt, t0, stagger, dur, o = {}) {
  const { dy = 46, blur = 12, s0 = 1, e = Ease.outCubic, out = null } = o;
  spans.forEach((sp, i) => {
    const p = e(prog(lt, t0 + i * stagger, t0 + i * stagger + dur));
    let y = (1 - p) * dy, op = p, bl = (1 - p) * blur, sc = lerp(s0, 1, p);
    if (out) {
      const q = Ease.inCubic(prog(lt, out[0] + i * (out[2] || 0), out[1] + i * (out[2] || 0)));
      y -= q * (o.outDy || 60); op *= 1 - q; bl += q * 14;
    }
    setT(sp, { y, s: sc, o: op, blur: bl });
  });
}

// Étoile arrondie (SVG path)
function starPath(cx, cy, R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rad).toFixed(2) + ',' + (cy + Math.sin(a) * rad).toFixed(2);
  }
  return d + 'Z';
}

