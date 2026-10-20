// ─────────────────────────────────────────────────────────────
// MAIN — démarrage + API pour le rendu (Playwright) et l'aperçu.
//   index.html?v=30            → version 30 s (défaut)
//   index.html?v=15            → version 15 s
//   index.html?v=30&t=12.5     → image fixe à 12,5 s
//   index.html?v=30&play=1     → lecture en temps réel (aperçu)
// ─────────────────────────────────────────────────────────────
(async function () {
  const q = new URLSearchParams(location.search);
  const version = q.get('v') === '15' ? 15 : 30;
  Global.init();
  Timeline.build(version);

  await document.fonts.ready;
  await Promise.all(['card.png', 'logo-icon.png', 'decor-starfood.jpg', 'grain.png'].map((f) => {
    const im = new Image(); im.src = '../assets/' + f; return im.decode().catch(() => {});
  }));

  window.renderAt = (t) => Timeline.render(t);
  window.getCues = () => Timeline.cues();
  window.getDuration = () => Timeline.total;
  window.getScenes = () => Timeline.scenes.map((s) => ({ id: s.id, start: +s.start.toFixed(3), end: +s.end.toFixed(3) }));

  if (q.has('t')) await Timeline.render(parseFloat(q.get('t')));
  else await Timeline.render(0);

  if (q.has('play')) {
    document.body.classList.add('preview');
    const st = document.getElementById('stage');
    const fit = () => (st.style.transform = `scale(${Math.min(innerWidth / 1080, innerHeight / 1920)})`);
    fit(); addEventListener('resize', fit);
    let t0 = performance.now(), busy = false;
    const loop = async () => {
      const t = ((performance.now() - t0) / 1000) % Timeline.total;
      if (!busy) { busy = true; await Timeline.render(t); busy = false; }
      requestAnimationFrame(loop);
    };
    loop();
  }
  window.__ready = true;
})();
