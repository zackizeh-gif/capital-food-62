"""Design sonore : synthèse des bruitages et mixage à partir des repères (cues).

Aucun son externe : tout est généré ici (numpy), donc libre de droits.
Usage : python3 audio/sfx.py cues30.json sortie.wav
"""
import json
import sys
import wave

import numpy as np

SR = 48000
RNG = np.random.default_rng(42)


# ── Outils ──────────────────────────────────────────────────
def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env_exp(dur, attack=0.003, tau=0.1):
    t = t_axis(dur)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / tau)


def sine(freq, dur, phase=0.0):
    """freq : scalaire ou tableau (fréquence instantanée)."""
    n = int(dur * SR)
    f = np.full(n, freq, dtype=float) if np.isscalar(freq) else np.asarray(freq, dtype=float)[:n]
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def noise(dur):
    return RNG.standard_normal(int(dur * SR))


def stft_filter(x, gain_fn, win=1024, hop=256):
    """Filtrage spectral variable dans le temps : gain_fn(t[frames], f[bins]) -> gains."""
    n = len(x)
    pad = win
    xp = np.pad(x, (pad, pad + win))
    frames = 1 + (len(xp) - win) // hop
    idx = np.arange(win)[None, :] + hop * np.arange(frames)[:, None]
    w = np.hanning(win)
    X = np.fft.rfft(xp[idx] * w, axis=1)
    t = (np.arange(frames) * hop + win / 2 - pad) / SR
    f = np.fft.rfftfreq(win, 1 / SR)
    G = gain_fn(t[:, None], f[None, :])
    y = np.fft.irfft(X * G, n=win, axis=1) * w
    out = np.zeros(len(xp))
    for i in range(frames):
        out[i * hop:i * hop + win] += y[i]
    return out[pad:pad + n] / 1.5


def bandpass(x, fc, bw_oct=1.0):
    return stft_filter(x, lambda t, f: np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / bw_oct) ** 2))


def lowpass(x, fc):
    return stft_filter(x, lambda t, f: 1 / (1 + (f / fc) ** 4))


def highpass(x, fc):
    return stft_filter(x, lambda t, f: 1 / (1 + (fc / np.maximum(f, 1)) ** 4))


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


# ── Bruitages ───────────────────────────────────────────────
def sfx_impact(p):
    low = p.get('low', 0)
    d = 1.4
    t = t_axis(d)
    f = 38 + (78 - 38) * np.exp(-t / 0.12)
    sub = sine(f, d) * env_exp(d, 0.004, 0.42)
    body = lowpass(noise(d), 380) * env_exp(d, 0.002, 0.09) * 1.4
    click = highpass(noise(0.03), 2500) * env_exp(0.03, 0.0005, 0.006)
    knock = sine(150, d) * env_exp(d, 0.002, 0.06)   # médium audible sur téléphone
    x = sub * (0.55 + 0.15 * low) + body * 0.8 + knock * 0.5
    x[:len(click)] += click * 0.5
    return np.tanh(1.6 * norm(x)) * 0.95, 0.35


def sfx_whoosh(p):
    d = p.get('len', 0.4) + 0.12
    bright = p.get('bright', 0)
    fpk = 5200 if bright else 2600
    peak = 0.62
    def g(t, f):
        u = np.clip(t / d, 0, 1)
        fc = 280 + (fpk - 280) * np.sin(np.pi * np.clip(u / (peak * 1.25), 0, 1)) ** 1.2
        return np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / 1.1) ** 2)
    x = stft_filter(noise(d), g)
    t = t_axis(d)
    u = t / d
    env = np.where(u < peak, (u / peak) ** 2.2, np.exp(-(u - peak) / 0.12))
    return norm(x * env) * 0.9, 0.25


def sfx_tick(p):
    pitch = p.get('pitch', 1.0)
    d = 0.06
    x = sine(2300 * pitch, d) * env_exp(d, 0.0008, 0.012)
    c = highpass(noise(d), 3000) * env_exp(d, 0.0003, 0.002)
    return norm(x * 0.8 + c * 0.6) * 0.55, 0.12


def sfx_key(p):
    pitch = p.get('pitch', 1.0)
    d = 0.07
    thock = sine(170 * pitch, d) * env_exp(d, 0.001, 0.014)
    clack = bandpass(noise(d), 3200 * pitch, 0.9) * env_exp(d, 0.0005, 0.008)
    return norm(thock * 0.6 + clack) * 0.5, 0.1


def sfx_tac(p):
    pitch = p.get('pitch', 1.0)
    d = 0.12
    t = t_axis(d)
    f = (700 + 600 * np.exp(-t / 0.012)) * pitch
    tone = sine(f, d) * env_exp(d, 0.001, 0.03)
    thump = sine(120, d) * env_exp(d, 0.002, 0.03)
    click = highpass(noise(d), 2500) * env_exp(d, 0.0003, 0.003)
    return norm(tone * 0.8 + thump * 0.6 + click * 0.4) * 0.6, 0.15


def sfx_thud(p):
    d = 0.6
    t = t_axis(d)
    f = 70 + 50 * np.exp(-t / 0.05)
    x = sine(f, d) * env_exp(d, 0.003, 0.16) + lowpass(noise(d), 500) * env_exp(d, 0.002, 0.05) * 0.8
    x2 = np.zeros_like(x)
    off = int(0.09 * SR)
    x2[off:] = x[:-off] * 0.55
    return np.tanh(1.4 * norm(x + x2)) * 0.8, 0.2


def sfx_riser(p):
    d = p.get('len', 2.0)
    t = t_axis(d)
    u = t / d
    def g(tt, f):
        fc = 220 * (5200 / 220) ** np.clip(tt / d, 0, 1)
        return np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / 0.8) ** 2)
    nz = stft_filter(noise(d), g)
    tone = sine(110 * (8 ** u), d) * 0.25 + sine(165 * (8 ** u), d) * 0.12
    env = u ** 2.6
    x = (norm(nz) * 0.9 + tone) * env
    fade = np.clip((d - t) / 0.01, 0, 1)
    return norm(x * fade) * 0.75, 0.3


def sfx_shimmer(p):
    d = p.get('len', 1.5) + 0.4
    t = t_axis(d)
    x = np.zeros_like(t)
    for i, f in enumerate([2093.0, 2637.0, 3136.0, 4186.0, 5274.0]):
        x += sine(f * (1 + 0.002 * i), d, phase=RNG.random() * 6) * (0.6 ** i)
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)
    env = np.clip(t / 0.08, 0, 1) * np.exp(-t / (d * 0.35))
    air = highpass(noise(d), 6000) * env * 0.15
    return norm(x * trem * env + air) * 0.4, 0.6


def sfx_swish(p):
    d = 0.35
    def g(t, f):
        fc = 2500 + 4000 * np.clip(t / d, 0, 1)
        return np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / 0.8) ** 2)
    x = stft_filter(noise(d), g)
    u = t_axis(d) / d
    return norm(x * np.sin(np.pi * u) ** 2) * 0.5, 0.3


def sfx_scan(p):
    d = p.get('len', 0.8)
    t = t_axis(d)
    x = sine(880, d) * 0.5 + sine(1320, d) * 0.25
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 7.5 * t) ** 8
    env = np.clip(t / 0.15, 0, 1) * np.clip((d - t) / 0.1, 0, 1)
    return norm(x * am * env) * 0.22, 0.2


def sfx_nfc(p):
    d = 0.9
    t = t_axis(d)
    b1 = (sine(1760, d) + 0.35 * sine(3520, d)) * env_exp(d, 0.002, 0.05)
    b2 = np.zeros_like(t)
    off = int(0.11 * SR)
    b2[off:] = ((sine(2349, d) + 0.3 * sine(4698, d)) * env_exp(d, 0.002, 0.07))[:-off]
    f = 300 * np.exp(-t / 0.2) + 90
    whoom = sine(f, d) * env_exp(d, 0.01, 0.25) * 0.6
    return norm(b1 * 0.8 + b2 * 0.7 + whoom) * 0.75, 0.35


def sfx_notif(p):
    """Carillon de notification générique (deux notes), volontairement différent des sons iOS."""
    d = 1.0
    t = t_axis(d)
    def bell(f0, start):
        x = np.zeros_like(t)
        o = int(start * SR)
        tt = t[: len(t) - o]
        b = (np.sin(2 * np.pi * f0 * tt) + 0.3 * np.sin(2 * np.pi * f0 * 2.01 * tt) + 0.1 * np.sin(2 * np.pi * f0 * 3.0 * tt))
        b *= np.clip(tt / 0.003, 0, 1) * np.exp(-tt / 0.2)
        x[o:] = b
        return x
    return norm(bell(1318.5, 0) + 0.9 * bell(1975.5, 0.12)) * 0.6, 0.3


def sfx_tap(p):
    d = 0.08
    x = sine(260, d) * env_exp(d, 0.001, 0.012) + highpass(noise(d), 3000) * env_exp(d, 0.0003, 0.003) * 0.7
    return norm(x) * 0.6, 0.1


def sfx_success(p):
    d = 1.4
    t = t_axis(d)
    x = np.zeros_like(t)
    for i, f0 in enumerate([1046.5, 1318.5, 1568.0, 2093.0]):
        o = int(i * 0.065 * SR)
        tt = t[: len(t) - o]
        b = np.sin(2 * np.pi * f0 * tt) + 0.25 * np.sin(2 * np.pi * f0 * 2.76 * tt)
        x[o:] += b * np.clip(tt / 0.002, 0, 1) * np.exp(-tt / 0.32) * (0.85 ** i)
    air = highpass(noise(d), 7000) * env_exp(d, 0.05, 0.3) * 0.12
    return norm(x + air) * 0.55, 0.5


def sfx_pop(p):
    d = 0.12
    t = t_axis(d)
    f = 380 + 700 * (1 - np.exp(-t / 0.02))
    x = sine(f, d) * env_exp(d, 0.001, 0.035) + highpass(noise(d), 2000) * env_exp(d, 0.0003, 0.003) * 0.5
    return norm(x) * 0.65, 0.2


def sfx_rise(p):
    pitch = p.get('pitch', 1.0)
    d = 0.55
    t = t_axis(d)
    u = t / d
    f = (260 + 900 * u ** 1.6) * pitch
    tone = sine(f, d) + 0.3 * sine(f * 2, d)
    def g(tt, ff):
        fc = (600 + 4000 * np.clip(tt / d, 0, 1)) * pitch
        return np.exp(-0.5 * (np.log2(np.maximum(ff, 1) / fc) / 0.9) ** 2)
    nz = stft_filter(noise(d), g)
    env = np.where(u < 0.8, (u / 0.8) ** 1.5, np.exp(-(u - 0.8) / 0.05))
    return norm((tone * 0.5 + norm(nz) * 0.7) * env) * 0.6, 0.3


def sfx_logo(p):
    a, _ = sfx_impact({'low': 1})
    d = len(a) / SR
    t = t_axis(d)
    ting = (np.sin(2 * np.pi * 1568 * t) + 0.5 * np.sin(2 * np.pi * 2349 * t) + 0.2 * np.sin(2 * np.pi * 3136 * t)) * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.5)
    return norm(a + ting * 0.35) * 0.95, 0.5


SFX = {k[4:]: v for k, v in globals().items() if k.startswith('sfx_')}


# ── Mixage ──────────────────────────────────────────────────
def reverb_ir(dur=1.6):
    t = t_axis(dur)
    ir_l = RNG.standard_normal(len(t)) * np.exp(-t / 0.35)
    ir_r = RNG.standard_normal(len(t)) * np.exp(-t / 0.35)
    ir_l[: int(0.012 * SR)] = 0
    ir_r[: int(0.017 * SR)] = 0
    return lowpass(ir_l, 6000), lowpass(ir_r, 6000)


def fft_conv(x, ir):
    n = len(x) + len(ir)
    N = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[: len(x)]


def mix(cues_path, out_path):
    data = json.load(open(cues_path))
    total = data['duration']
    n = int(total * SR) + SR
    L = np.zeros(n)
    R = np.zeros(n)
    send = np.zeros(n)
    for c in data['cues']:
        fn = SFX.get(c['type'])
        if fn is None:
            print('cue inconnue :', c['type'])
            continue
        x, rv = fn(c.get('p', {}))
        g = c.get('gain', 1.0)
        pan = c.get('p', {}).get('pan', 0)
        o = int(c['t'] * SR)
        e = min(n, o + len(x))
        seg = x[: e - o] * g
        if pan:  # balayage stéréo pour les whips
            pp = np.linspace(-pan, pan, len(seg)) * 0.6
        else:
            pp = np.zeros(len(seg))
        L[o:e] += seg * np.sqrt((1 - pp) / 2) * 1.414
        R[o:e] += seg * np.sqrt((1 + pp) / 2) * 1.414
        send[o:e] += seg * rv
    ir_l, ir_r = reverb_ir()
    L += fft_conv(send, ir_l) * 0.22
    R += fft_conv(send, ir_r) * 0.22
    L, R = highpass(L, 28), highpass(R, 28)
    st = np.stack([L, R], 1)[: int(total * SR)]
    # niveau : RMS « utile » (fenêtres non silencieuses) ramené à −18 dBFS
    win = int(0.4 * SR)
    m = st.mean(1)
    w = np.array([np.sqrt(np.mean(m[i:i + win] ** 2)) for i in range(0, len(m) - win, win)])
    gated = w[w > np.max(w) * 10 ** (-30 / 20)]
    st *= 10 ** (-18 / 20) / np.sqrt(np.mean(gated ** 2))
    # limiteur à genou doux, plafond −1 dBFS
    ceil, knee = 10 ** (-1 / 20), 0.6
    a = np.abs(st)
    over = a > knee
    st[over] = np.sign(st[over]) * (knee + (ceil - knee) * np.tanh((a[over] - knee) / (ceil - knee)))
    fade = np.ones(len(st))
    fade[-int(0.25 * SR):] = np.linspace(1, 0, int(0.25 * SR))
    st *= fade[:, None]
    pcm = (st * 32767).astype('<i2')
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    rms = np.sqrt(np.mean(st ** 2))
    print(f'{out_path} : {total:.2f} s, {len(data["cues"])} sons, RMS {20 * np.log10(rms):.1f} dBFS')


if __name__ == '__main__':
    mix(sys.argv[1], sys.argv[2])
