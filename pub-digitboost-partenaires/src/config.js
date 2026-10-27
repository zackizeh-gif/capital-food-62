// ─────────────────────────────────────────────────────────────
// CONFIG — textes, partenaires, minutage (secondes). Tout se règle ici.
// ─────────────────────────────────────────────────────────────
window.CFG = {
  duration: 25,

  // Carte : version « nuit » de la carte de référence (recadrée de y=225 à y=930,
  // puis agrandie). Les coordonnées des partenaires sont celles de l'image d'origine.
  map: { src: '../assets/map-night.jpg', w: 2508, h: 1410, k: 2, cropTop: 225 },

  // Ordre d'apparition, orthographe de la carte, position = pointe du repère d'origine.
  // ov : position de l'étiquette dans la vue d'ensemble (r = droite, l = gauche, t = dessus).
  partners: [
    { name: 'Les Délices de Dieyna', x: 617, y: 316, ov: 't' },
    { name: 'Paname 62',             x: 464, y: 386, ov: 'l' },
    { name: 'Chicken Naan 62',       x: 818, y: 390, ov: 't' },
    { name: 'Capital Food 62', sub: 'Le Portel', x: 209, y: 851, ov: 'r' },
    { name: 'Milano Pizza',          x: 568, y: 538, ov: 'l' },
    { name: 'Burger Street',         x: 856, y: 548, ov: 'l' },
    { name: 'Star Food',             x: 627, y: 651, ov: 'l' },
    { name: 'Big Bargui',            x: 895, y: 664, ov: 'l' },
  ],

  // Libellés de la carte, réécrits proprement (coordonnées de l'image d'origine).
  mapLabels: [
    { text: 'BOULOGNE-SUR-MER', x: 690, y: 446, size: 30, cls: 'city' },
    { text: 'LE PORTEL', x: 307, y: 796, size: 24, cls: 'city' },
    { text: 'LA MANCHE', x: 120, y: 350, size: 22, cls: 'sea' },
    { text: 'D940', x: 883, y: 251, size: 13, cls: 'road' },
    { text: 'D901', x: 584, y: 715, size: 13, cls: 'road' },
    { text: 'D901', x: 490, y: 855, size: 13, cls: 'road' },
    { text: 'D96', x: 1190, y: 534, size: 13, cls: 'road' },
  ],

  t: {
    logoHit: 1.8,      // le logo apparaît dans la lumière
    mapIn: 3.6,        // la carte commence à se révéler
    title: 4.9,        // « DIGITBOOST EST PRÉSENT »
    pin0: 8.4,         // premier partenaire
    pinStep: 1.1,      // un partenaire toutes les 1,1 s (2 temps à 109 BPM)
    overview: 17.2,    // vue d'ensemble
    logo2: 19.4,       // le logo réapparaît
    etVous: 20.775,    // « ET VOUS… »
    question: 21.875,  // « QU'ATTENDEZ-VOUS… »
    flare: 24.15,      // éclat sur le logo
    fade: 24.35,       // fondu final vers le bleu nuit
  },

  text: {
    brand: ['DIGIT', 'BOOST'],
    tagline: 'La visibilité des commerces locaux.',
    present: ['DIGITBOOST', 'EST PRÉSENT'],
    etVous: ['ET', 'VOUS…'],
    question: [['QU’ATTENDEZ-VOUS'], ['POUR NOUS FAIRE'], ['CONFIANCE', '?']],
    blueWords: ['VOUS…', 'CONFIANCE'],
  },
};
