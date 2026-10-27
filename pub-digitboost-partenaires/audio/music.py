"""Musique originale (instrumentale, cinématographique) synthétisée en numpy — libre de droits.

Ré mineur, 109 BPM (un temps = 0,55 s) : chaque partenaire tombe sur un temps fort.
Structure calée sur les repères exportés par l'animation (cues.json) :
  intro (nappe + drone, impact au logo) → carte (nappe qui s'ouvre, pulsation)
  → partenaires (kick, basse, arpège, cloche + impact discret par repère)
  → apogée (vue d'ensemble, logo) → respiration → slogan → accord final.
Usage : python3 audio/music.py build/cues.json build/music.wav
"""
import json
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def nm(s):  # 'D3' -> midi
    name, octv = (s[:-1], int(s[-1]))
    name = name.replace('b', '#') if False else name
    flats = {'Bb': 'A#', 'Eb': 'D#', 'Ab': 'G#', 'Db': 'C#', 'Gb': 'F#'}
    name = flats.get(name, name)
    return 12 * (octv + 1) + NOTE[name]


class Mix:
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.out = np.zeros((self.n, 2))
        self.send = np.zeros((self.n, 2))

    def add(self, sig, t0, gain=1.0, pan=0.0, rev=0.0):
        if sig.ndim == 1:
            l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
            sig = np.stack([sig * l, sig * r], 1) * 1.414
        o = int(round(t0 * SR))
        if o < 0:
            sig, o = sig[-o:], 0
        e = min(self.n, o + len(sig))
        if e <= o:
            return
        self.out[o:e] += sig[: e - o] * gain
        self.send[o:e] += sig[: e - o] * gain * rev


# ── Instruments ─────────────────────────────────────────────
def adsr(n, a, d, s, r, sustain_len=None):
    t = np.arange(n) / SR
    dur = n / SR
    rel_start = dur - r
    env = np.where(t < a, t / max(a, 1e-4), np.where(t < a + d, 1 - (1 - s) * (t - a) / max(d, 1e-4), s))
    env = np.where(t > rel_start, env * np.clip((dur - t) / max(r, 1e-4), 0, 1), env)
    return env


def saw(freq, n, fc, nh_cap=10000.0, phase=0.0):
    """Dent de scie additive (sans repliement) avec filtre passe-bas variable fc (scalaire ou tableau)."""
    t = np.arange(n) / SR
    fc_arr = np.full(n, fc, float) if np.isscalar(fc) else fc
    fmax = min(nh_cap, 2.6 * float(np.max(fc_arr)))
    out = np.zeros(n)
    k = 1
    while freq * k < fmax:
        fk = freq * k
        out += (1.0 / k) / (1 + (fk / fc_arr) ** 4) * np.sin(2 * np.pi * fk * t + phase * k)
        k += 1
    return out


def pad_note(midi, dur, fc_fn, a=1.2, r=1.6, detune=7, voices=3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fc = fc_fn(t)
    st = np.zeros((n, 2))
    for v in range(voices):
        cents = (v - (voices - 1) / 2) * detune
        f = mtof(midi) * 2 ** (cents / 1200)
        x = saw(f, n, fc, phase=rng.random() * 6.28)
        pan = (v - (voices - 1) / 2) / max(1, (voices - 1) / 2) * 0.7
        st[:, 0] += x * np.sqrt((1 - pan) / 2)
        st[:, 1] += x * np.sqrt((1 + pan) / 2)
    env = adsr(n, a, 0.5, 0.85, r)
    return st * env[:, None] / voices


def sub(midi, dur, a=0.05, r=0.4, drive=1.4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    x = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    x = np.tanh(drive * x) / np.tanh(drive)
    return x * adsr(n, a, 0.1, 0.9, r)


def pluck(midi, dur=0.5, bright=2600):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fc = 300 + bright * np.exp(-t / 0.09)
    x = saw(mtof(midi), n, fc) + 0.5 * saw(mtof(midi) * 1.004, n, fc)
    return x * np.exp(-t / 0.22) * np.clip(t / 0.003, 0, 1)


def bass_pulse(midi, dur=0.27):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fc = 180 + 700 * np.exp(-t / 0.06)
    x = saw(mtof(midi), n, fc) * 0.8 + np.sin(2 * np.pi * mtof(midi) * t) * 0.9
    return np.tanh(1.3 * x) * np.exp(-t / 0.16) * np.clip(t / 0.004, 0, 1)


def bell(midi, dur=2.6, index=2.2, ratio=3.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    I = index * np.exp(-t / 0.35)
    x = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t))
    x += 0.35 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.5)
    return x * np.exp(-t / 0.9) * np.clip(t / 0.002, 0, 1)


def noise(n):
    return rng.standard_normal(n)


def spectral(x, gain_fn, win=1024, hop=256):
    n = len(x)
    xp = np.pad(x, (win, 2 * win))
    frames = 1 + (len(xp) - win) // hop
    idx = np.arange(win)[None, :] + hop * np.arange(frames)[:, None]
    w = np.hanning(win)
    X = np.fft.rfft(xp[idx] * w, axis=1)
    tt = (np.arange(frames) * hop + win / 2 - win) / SR
    f = np.fft.rfftfreq(win, 1 / SR)
    y = np.fft.irfft(X * gain_fn(tt[:, None], f[None, :]), n=win, axis=1) * w
    out = np.zeros(len(xp))
    for i in range(frames):
        out[i * hop:i * hop + win] += y[i]
    return out[win:win + n] / 1.5


def hp(x, fc):
    return spectral(x, lambda t, f: 1 / (1 + (fc / np.maximum(f, 1)) ** 4))


def lp(x, fc):
    return spectral(x, lambda t, f: 1 / (1 + (f / fc) ** 4))


def kick(gain=1.0):
    d = 0.6
    t = np.arange(int(d * SR)) / SR
    f = 44 + 110 * np.exp(-t / 0.035)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.28)
    click = hp(noise(len(t)), 2500) * np.exp(-t / 0.004) * 0.25
    return np.tanh(1.5 * (x + click)) * gain


def hat(dur=0.08, open_=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return hp(noise(n), 7000) * np.exp(-t / (0.06 if open_ else 0.018))


def boom(d=2.2, depth=1.0):
    t = np.arange(int(d * SR)) / SR
    f = 34 + 60 * np.exp(-t / 0.09)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.6)
    body = lp(noise(len(t)), 260) * np.exp(-t / 0.12) * 0.6
    knock = np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.05) * 0.4
    return np.tanh(1.3 * (x * depth + body + knock))


def swell(d=1.6, f0=300, f1=7000, rev=False):
    """Souffle montant (riser) ; rev=True : crescendo inversé type cymbale."""
    n = int(d * SR)
    t = np.arange(n) / SR
    def g(tt, f):
        u = np.clip(tt / d, 0, 1)
        fc = f0 * (f1 / f0) ** u
        return np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / 1.0) ** 2)
    x = spectral(noise(n), g)
    env = (t / d) ** (3.0 if rev else 2.0)
    return x / (np.max(np.abs(x)) + 1e-9) * env


def shimmer(d=2.0):
    t = np.arange(int(d * SR)) / SR
    x = np.zeros_like(t)
    for i, m in enumerate([86, 90, 93, 98]):   # D6 F#6? -> accord de ré mineur aigu (D6 F6 A6 D7)
        pass
    for i, m in enumerate([nm('D6'), nm('F6'), nm('A6'), nm('D7')]):
        x += np.sin(2 * np.pi * mtof(m) * t + rng.random() * 6) * (0.7 ** i) * (0.6 + 0.4 * np.sin(2 * np.pi * (5 + i) * t))
    return x * np.clip(t / 0.3, 0, 1) * np.exp(-t / (d * 0.4))


# ── Composition ─────────────────────────────────────────────
def compose(cues_path, out_path):
    data = json.load(open(cues_path))
    C = {c['type']: c['t'] for c in data['cues'] if c['type'] != 'pin'}
    pins = [c['t'] for c in data['cues'] if c['type'] == 'pin']
    DUR = data['duration']
    BEAT = 0.55
    BAR = 4 * BEAT
    m = Mix(DUR + 0.5)

    CH = {  # accords (voicings de nappe) et fondamentales de basse
        'Dm9': (['D3', 'A3', 'C4', 'F4', 'E5'], 'D1'),
        'Bbmaj7': (['Bb2', 'F3', 'A3', 'D4', 'C5'], 'Bb0'),
        'F': (['F3', 'A3', 'C4', 'F4', 'G5'], 'F1'),
        'C': (['C3', 'G3', 'C4', 'E4', 'D5'], 'C1'),
        'Csus': (['C3', 'G3', 'C4', 'F4', 'D5'], 'C1'),
        'Dm': (['D3', 'A3', 'D4', 'F4', 'A4'], 'D1'),
    }

    def chord(name, t0, t1, fc_fn, gain=0.22, a=1.0, r=1.4, rev=0.45):
        notes, _ = CH[name]
        for s in notes:
            m.add(pad_note(nm(s), (t1 - t0) + r, fc_fn, a=a, r=r), t0, gain, rev=rev)

    def bassline(name, t0, t1, gain=0.5):
        _, root = CH[name]
        m.add(sub(nm(root) + 12, t1 - t0 + 0.3, a=0.08, r=0.3), t0, gain)

    # A. Intro : drone, crescendo inversé jusqu'au logo, impact + cloches
    logo = C['logo']
    m.add(sub(nm('D1') + 12, logo + 0.4, a=0.5, r=0.3), 0.0, 0.32)
    m.add(pad_note(nm('A4'), logo + 0.6, lambda t: 900 + 600 * t, a=0.3, r=0.5), 0.0, 0.05, rev=0.6)
    m.add(swell(logo, 200, 5000, rev=True), 0.0, 0.22, rev=0.4)
    m.add(boom(2.6), logo, 0.75, rev=0.25)
    m.add(swell(0.9, 9000, 3000), logo, 0.08, rev=0.6)
    for k, s in enumerate(['D5', 'A5', 'E6']):
        m.add(bell(nm(s), 3.2, index=1.6), logo + k * 0.09, 0.11, pan=(k - 1) * 0.5, rev=0.75)
    chord('Dm9', logo, C['map'] + 0.4, lambda t: 500 + 900 * (1 - np.exp(-t / 1.5)), gain=0.18, a=0.8)
    m.add(shimmer(2.0), C['brand'], 0.05, rev=0.8)
    m.add(swell(C['map'] + 0.4 - (C['map'] - 0.6), 400, 6000), C['map'] - 0.6, 0.16, rev=0.5)

    # B. Carte : la nappe s'ouvre, pulsation douce
    b0 = C['map'] + 0.4               # = 4,0 s : début de mesure
    p0 = pins[0]
    chord('Dm9', b0, b0 + BAR, lambda t: 1000 + 2200 * (1 - np.exp(-t / 1.2)), gain=0.2)
    chord('Bbmaj7', b0 + BAR, p0, lambda t: 2400 + 1000 * t / BAR, gain=0.2)
    bassline('Dm9', b0, b0 + BAR, 0.4)
    bassline('Bbmaj7', b0 + BAR, p0, 0.4)
    arp = {'Dm9': ['D4', 'A4', 'F5', 'A4'], 'Bbmaj7': ['Bb3', 'F4', 'D5', 'F4'], 'F': ['F4', 'C5', 'A5', 'C5'], 'C': ['C4', 'G4', 'E5', 'G4']}
    tt, i = b0, 0
    while tt < p0 - 0.01:
        name = 'Dm9' if tt < b0 + BAR else 'Bbmaj7'
        g = 0.035 + 0.05 * (tt - b0) / (p0 - b0)
        m.add(pluck(nm(arp[name][i % 4]), 0.5, bright=1400 + 1400 * (tt - b0) / (p0 - b0)), tt, g, pan=(-0.4 if i % 2 else 0.4), rev=0.5)
        tt += BEAT / 2; i += 1
    m.add(boom(1.6, 0.6), C['title'], 0.28, rev=0.3)
    m.add(swell(0.9, 600, 4000), C['title'] - 0.35, 0.07, rev=0.5)
    m.add(swell(BAR, 300, 9000), p0 - BAR, 0.2, rev=0.4)

    # C. Partenaires : 4 mesures Dm | Bb | F | C, kick sur chaque repère
    prog_ = ['Dm9', 'Bbmaj7', 'F', 'C']
    melody = ['A5', 'D6', 'F5', 'D6', 'C6', 'A5', 'G5', 'E6']
    end_c = C['overview']
    for bi, name in enumerate(prog_):
        t0 = p0 + bi * BAR
        chord(name, t0, t0 + BAR, lambda t: 3300 + 600 * np.sin(t * 1.3), gain=0.19, a=0.25, r=0.6)
        _, root = CH[name]
        for b in range(8):  # basse en croches
            m.add(bass_pulse(nm(root) + 24 + (12 if b % 4 == 3 else 0)), t0 + b * BEAT / 2, 0.22)
        m.add(sub(nm(root) + 12, BAR, a=0.02, r=0.2), t0, 0.32)
        for b in range(16):  # arpège en doubles croches, discret
            m.add(pluck(nm(arp[name][b % 4]) + (12 if b % 8 >= 6 else 0), 0.4, 2200), t0 + b * BEAT / 4, 0.03, pan=(0.5 if b % 2 else -0.5), rev=0.45)
        for b in range(8):  # charleston
            m.add(hat(0.1, open_=(b % 2 == 1)), t0 + b * BEAT / 2, 0.085 if b % 2 else 0.06, pan=0.3)
    for k, tp in enumerate(pins):
        m.add(kick(), tp, 0.55)
        m.add(boom(1.4, 0.5), tp, 0.16, rev=0.3)                 # impact discret par partenaire
        m.add(bell(nm(melody[k]), 2.4), tp + 0.02, 0.13, pan=(-0.3 if k % 2 else 0.3), rev=0.7)
        m.add(kick(0.7), tp + BEAT, 0.3)

    # D. Apogée : vue d'ensemble puis logo
    ov, lg2, ev = C['overview'], C['logo2'], C['etvous']
    m.add(boom(3.0), ov, 0.85, rev=0.35)
    m.add(swell(1.0, 9000, 2500), ov, 0.1, rev=0.6)
    chord('Bbmaj7', ov, lg2, lambda t: 3800 + 2200 * (1 - np.exp(-t / 0.8)), gain=0.25, a=0.15, r=0.5)
    chord('Csus', lg2, lg2 + BEAT * 2, lambda t: 5600 + 0 * t, gain=0.25, a=0.1, r=0.3)
    chord('C', lg2 + BEAT * 2, ev - 0.15, lambda t: 5600 - 4400 * np.clip(t / 0.9, 0, 1), gain=0.25, a=0.05, r=0.25)
    for name, t0, t1 in (('Bbmaj7', ov, lg2), ('C', lg2, ev - 0.2)):
        bassline(name, t0, t1, 0.55)
        tb = t0
        while tb < t1 - 0.05:
            m.add(kick(0.8), tb, 0.38)
            m.add(hat(0.08), tb + BEAT / 2, 0.085, pan=-0.3)
            m.add(bass_pulse(nm(CH[name][1]) + 24), tb, 0.2)
            m.add(bass_pulse(nm(CH[name][1]) + 24), tb + BEAT / 2, 0.14)
            tb += BEAT
    for k, s in enumerate(['F5', 'A5', 'D6', 'F6']):          # montée de cloches vers le logo
        m.add(bell(nm(s), 2.0, index=1.4), ov + 0.3 + k * BEAT / 2, 0.08, pan=(k - 1.5) * 0.3, rev=0.7)
    m.add(boom(2.2), lg2, 0.7, rev=0.35)
    m.add(shimmer(2.4), lg2, 0.08, rev=0.8)
    m.add(swell(ev - (lg2 + 0.4), 300, 8000, rev=True), lg2 + 0.4, 0.22, rev=0.4)

    # E. Slogan : impact, accord sombre, puis question et accord final
    q, fl, fd = C['question'], C['flare'], C['fade']
    m.add(boom(3.2, 1.2), ev, 0.95, rev=0.4)
    chord('Dm', ev, q, lambda t: 1400 + 1200 * (1 - np.exp(-t / 0.6)), gain=0.22, a=0.05, r=0.6)
    m.add(sub(nm('D1') + 12, q - ev + 0.4, a=0.01, r=0.4), ev, 0.5)
    m.add(bell(nm('D6'), 3.0, index=1.8), ev + 0.02, 0.12, rev=0.8)
    m.add(boom(2.4, 0.7), q, 0.45, rev=0.4)
    chord('Bbmaj7', q, q + 2 * BEAT * 1.0, lambda t: 2000 + 800 * t, gain=0.2, a=0.1, r=0.6)
    chord('Dm9', q + 2 * BEAT, DUR - 0.2, lambda t: 2400 + 900 * np.exp(-t / 2.0), gain=0.22, a=0.4, r=1.4)
    m.add(sub(nm('Bb0') + 12, 2 * BEAT + 0.3, a=0.02, r=0.3), q, 0.45)
    m.add(sub(nm('D1') + 12, DUR - (q + 2 * BEAT), a=0.2, r=1.2), q + 2 * BEAT, 0.45)
    for k, s in enumerate(['A5', 'D6', 'E6', 'A6']):
        m.add(bell(nm(s), 3.0, index=1.2), q + 0.4 + k * BEAT, 0.07, pan=(k - 1.5) * 0.4, rev=0.8)
    m.add(shimmer(1.8), fl, 0.12, rev=0.9)
    m.add(bell(nm('D7'), 2.5, index=1.0), fl + 0.05, 0.08, rev=0.9)

    # couche d'air (souffle aigu très doux) de la carte jusqu'au slogan
    a0, a1 = C['map'], DUR
    na = int((a1 - a0) * SR)
    ta = np.arange(na) / SR
    air = spectral(noise(na), lambda t, f: np.exp(-0.5 * (np.log2(np.maximum(f, 1) / 8500) / 0.6) ** 2))
    env_air = np.clip(ta / 1.5, 0, 1) * (0.6 + 0.4 * np.sin(ta * 0.9)) * np.clip((a1 - a0 - ta) / 1.0, 0, 1)
    air = air / (np.max(np.abs(air)) + 1e-9) * env_air
    air2 = spectral(noise(na), lambda t, f: np.exp(-0.5 * (np.log2(np.maximum(f, 1) / 8500) / 0.6) ** 2))
    air2 = air2 / (np.max(np.abs(air2)) + 1e-9) * env_air
    m.add(np.stack([air, air2], 1), a0, 0.11, rev=0.2)

    # ── Réverbération (IR synthétique 3 s) ──
    n_ir = int(3.0 * SR)
    t = np.arange(n_ir) / SR
    irs = []
    for ch in range(2):
        ir = rng.standard_normal(n_ir) * np.exp(-t / 0.75)
        ir[: int((0.018 + 0.006 * ch) * SR)] = 0
        irs.append(lp(ir, 5500))
    wet = np.zeros_like(m.out)
    N = 1 << (len(m.out) + n_ir - 1).bit_length()
    for ch in range(2):
        wet[:, ch] = np.fft.irfft(np.fft.rfft(m.send[:, ch], N) * np.fft.rfft(irs[ch], N), N)[: len(m.out)]
    mix = m.out + wet * 0.09
    mix = mix[: int(DUR * SR)]
    # égalisation finale : creux léger dans le bas-médium, ouverture des aigus
    def eq(t, f):
        f = np.maximum(f, 1)
        dip = 1 - (1 - 10 ** (-4 / 20)) * np.exp(-0.5 * (np.log2(f / 280) / 0.7) ** 2)
        shelf = 1 + (10 ** (6 / 20) - 1) / (1 + np.exp(-3 * np.log2(f / 3500)))
        hpf = 1 / (1 + (26 / f) ** 4)
        return dip * shelf * hpf
    for ch in range(2):
        mix[:, ch] = spectral(mix[:, ch], eq)
    # fondu final
    nf = int((DUR - fd) * SR)
    mix[-nf:] *= np.linspace(1, 0, nf)[:, None] ** 1.5
    # niveau : RMS utile ~ −15 dBFS, limiteur doux, plafond −1 dBFS
    mono = mix.mean(1)
    win = int(0.4 * SR)
    w = np.array([np.sqrt(np.mean(mono[i:i + win] ** 2)) for i in range(0, len(mono) - win, win)])
    gated = w[w > w.max() * 10 ** (-30 / 20)]
    mix *= 10 ** (-15 / 20) / np.sqrt(np.mean(gated ** 2))
    ceil, knee = 10 ** (-1 / 20), 0.55
    a = np.abs(mix)
    over = a > knee
    mix[over] = np.sign(mix[over]) * (knee + (ceil - knee) * np.tanh((a[over] - knee) / (ceil - knee)))
    pcm = (mix * 32767).astype('<i2')
    with wave.open(out_path, 'wb') as wf:
        wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes())
    print(f'{out_path} : {DUR:.1f} s')


if __name__ == '__main__':
    compose(sys.argv[1], sys.argv[2])
