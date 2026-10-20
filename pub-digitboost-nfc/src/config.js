// ─────────────────────────────────────────────────────────────
// CONFIG — textes, couleurs, durées. Tout ce qui se modifie
// facilement est ici. Les durées sont en secondes.
// ─────────────────────────────────────────────────────────────
window.CFG = {
  W: 1080,
  H: 1920,
  fps: 30,           // cadence du fichier final
  renderFps: 60,     // cadence de rendu (2 images fusionnées = flou de mouvement)

  text: {
    hookA: ['Vos clients', 'sont satisfaits.'],
    hookB: ['Mais laissent-ils', 'un avis ?'],

    salonTag: 'SALON DE COIFFURE',
    salonTyped: 'Est-ce que vous pourriez… nous laisser un av',
    salonA: 'Demander un avis ?',
    salonB: 'Pas toujours facile.',

    restoTag: 'RESTAURANT',
    restoSteps: ['Ouvrir Google', 'Chercher le nom', 'Trouver la fiche', 'Trouver « Avis »'],
    restoA: 'Trop d’étapes…',
    restoB: 'le client abandonne.',

    aware: ['Et si laisser un avis', 'devenait plus simple ?'],
    awareAccent: 'simple',

    heroTag: 'LA SOLUTION',
    heroA: 'La carte NFC',
    heroB: 'DigitBoost',

    demo1: 'Approchez.',
    demo2: 'Appuyez.',
    demo3: 'Notez.',
    demoNote: 'Le client choisit librement sa note.',
    demoDone: 'Avis publié',

    arrowsA: 'Plus d’avis',
    arrowsB: 'Plus de visibilité',
    arrowsC: 'sur Google',
    arrowsNote: 'Selon Google, les avis comptent dans le classement local.',

    priceTag: 'LA CARTE NFC',
    price: 20,
    priceCur: '€',
    priceChips: ['Sans abonnement', 'Aucun frais supplémentaire'],

    ctaSignature: 'SITES · CARTES NFC · AVIS GOOGLE',
    ctaLine: ['Simplifiez la collecte', 'de vos avis.'],
    ctaVerb: 'Commentez',
    ctaKeyword: 'AVIS',
    ctaOffer: 'Carte NFC · 20 € · sans abonnement',
  },

  // Plan de la démo : images sources (vidéo 60 i/s) et vitesse de lecture.
  // rate 0.5 = ralenti ×0,5 ; rate 4 = accéléré (speed ramp).
  demoPlan: {
    long: [
      { f0: 36,  f1: 62,  rate: 0.5,  step: 1 },  // téléphone posé, écran éteint
      { f0: 62,  f1: 100, rate: 0.5,  step: 1 },  // contact NFC : l'écran s'allume
      { f0: 100, f1: 150, rate: 0.8,  step: 2 },  // notification → appui
      { f0: 150, f1: 228, rate: 4,    step: 2, ramp: true },
      { f0: 229, f1: 340, rate: 1.3,  step: 3 },  // formulaire d'avis
      { f0: 340, f1: 437, rate: 4,    step: 3, ramp: true },
      { f0: 437, f1: 508, rate: 0.75, step: 4 },  // « Merci de votre post »
    ],
    short: [
      { f0: 40,  f1: 62,  rate: 0.6,  step: 1 },
      { f0: 62,  f1: 100, rate: 0.6,  step: 1 },
      { f0: 100, f1: 150, rate: 1.0,  step: 2 },
      { f0: 150, f1: 228, rate: 5,    step: 2, ramp: true },
      { f0: 229, f1: 320, rate: 1.4,  step: 3 },
      { f0: 340, f1: 437, rate: 6,    step: 3, ramp: true },
      { f0: 437, f1: 508, rate: 0.9,  step: 4 },
    ],
  },

  // Montage. overlap = chevauchement avec la scène précédente (transitions).
  versions: {
    30: [
      { id: 'hook',   dur: 2.6 },
      { id: 'salon',  dur: 3.3, overlap: 0.15 },
      { id: 'resto',  dur: 3.9, overlap: 0.24 },
      { id: 'aware',  dur: 2.2, overlap: 0.0 },
      { id: 'hero',   dur: 2.8, overlap: 0.18 },
      { id: 'demo',   plan: 'long', overlap: 0.36 },
      { id: 'arrows', dur: 2.5, overlap: 0.22 },
      { id: 'price',  dur: 2.9, overlap: 0.22 },
      { id: 'cta',    dur: 'rest', overlap: 0.28 },
    ],
    15: [
      { id: 'hook',   dur: 2.1, short: true },
      { id: 'hero',   dur: 2.0, overlap: 0.18, short: true },
      { id: 'demo',   plan: 'short', overlap: 0.36, short: true },
      { id: 'price',  dur: 2.3, overlap: 0.22, short: true },
      { id: 'cta',    dur: 'rest', overlap: 0.28, short: true },
    ],
  },
  durations: { 30: 30, 15: 15 },
};
