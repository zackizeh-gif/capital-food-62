import { getStore } from "@netlify/blobs";

export const config = {
  path: ["/api/commande", "/api/suivi", "/api/cuisine", "/api/cuisine-statut", "/api/reglages", "/api/cuisine-reglages"],
};

const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const txt = (v, n) => String(v ?? "").slice(0, n);
const STATUTS = ["nouvelle", "preparation", "prete", "terminee", "annulee"];

/* ---------- réglages de la cuisine : commandes ouvertes, prix modifiés, ruptures ---------- */
// Les choix d'options sont regroupés par famille : « Coca-Cola » est le même produit dans toutes les listes de boissons.
export const famille = (g) => (/^boisson/.test(g) ? "boisson" : /^viande/.test(g) ? "viande" : g);
const catOf = (id) => String(id).replace(/-\d+$/, "");
const liste = (a, max = 1000) =>
  Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === "string" && x && x.length <= 100))].slice(0, max) : [];
const prixOk = (v) => (typeof v === "number" && isFinite(v) && v >= 0 && v <= 1000 ? Math.round(v * 100) / 100 : null);

export async function lireReglages(store) {
  let r = null;
  try { r = await store.get("reglages", { type: "json", consistency: "strong" }); }
  catch { try { r = await store.get("reglages", { type: "json" }); } catch {} }
  r = r && typeof r === "object" ? r : {};
  const ru = r.rupture && typeof r.rupture === "object" ? r.rupture : {};
  return {
    ouvert: r.ouvert !== false,
    prix: r.prix && typeof r.prix === "object" && !Array.isArray(r.prix) ? r.prix : {},
    prixMaj: +r.prixMaj || 0,
    rupture: { plats: liste(ru.plats), cats: liste(ru.cats), choix: liste(ru.choix) },
    maj: +r.maj || 0,
  };
}

// Lignes du panier qui ne sont plus disponibles (plat, catégorie, option ou supplément en rupture).
function epuises(b, R) {
  const P = new Set(R.rupture.plats), C = new Set(R.rupture.cats), X = new Set(R.rupture.choix), out = [];
  (Array.isArray(b.panier) ? b.panier : []).forEach((l, i) => {
    if (!l || typeof l.id !== "string") return;
    const nom = txt(b.lignes[i] && b.lignes[i].n, 80) || l.id;
    if (P.has(l.id) || C.has(catOf(l.id))) { out.push(nom); return; }
    const o = l.o && typeof l.o === "object" ? l.o : {};
    for (const [g, vals] of Object.entries(o))
      for (const v of Array.isArray(vals) ? vals : []) if (X.has(famille(g) + ":" + v)) out.push(`${nom} (${v})`);
    for (const n of Array.isArray(l.xn) ? l.xn : []) if (X.has("supp:" + n)) out.push(`${nom} (${n})`);
  });
  return [...new Set(out)];
}

export async function handle(req, store, code) {
  const url = new URL(req.url);
  const path = url.pathname;
  const kitchenOk = () => !code || req.headers.get("x-code") === code;

  // --- le client envoie sa commande ---
  if (path === "/api/commande" && req.method === "POST") {
    let b;
    try { b = await req.json(); } catch { return json({ ok: false, error: "Commande illisible." }, 400); }
    if (b.site) return json({ ok: true, num: "000", id: "x", token: "x", total: "" }); // anti-robot
    if (!Array.isArray(b.lignes) || !b.lignes.length || b.lignes.length > 60) return json({ ok: false, error: "Panier vide." }, 400);
    if (txt(b.nom, 60).trim().length < 2 || !/^(\+33|0033|0)[1-9]\d{8}$/.test(txt(b.tel, 20))) return json({ ok: false, error: "Nom ou téléphone invalide." }, 400);

    const R = await lireReglages(store);
    if (!R.ouvert)
      return json({ ok: false, code: "ferme", reglages: R, error: "Les commandes en ligne sont fermées pour le moment. Appelez-nous au 09 56 85 85 86." }, 403);
    const out = epuises(b, R);
    if (out.length)
      return json({ ok: false, code: "rupture", reglages: R, error: `Désolé, plus disponible pour le moment : ${out.join(", ")}.` }, 409);
    if ((+b.pv || 0) !== R.prixMaj)
      return json({ ok: false, code: "prix", reglages: R, error: "Les prix viennent d'être mis à jour. Vérifiez votre commande avant de la valider." }, 409);

    const day = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
    let n = (await store.get(`n-${day}`, { type: "json" })) || 100;
    let id;
    for (let i = 0; i < 20; i++) {
      n++; id = `${day}-${n}`;
      const r = await store.set(`cmd-${id}`, "reserve", { onlyIfNew: true });
      if (!r || r.modified !== false) break;
    }
    await store.setJSON(`n-${day}`, n);
    const o = {
      id, num: String(n), token: crypto.randomUUID().replace(/-/g, "").slice(0, 24), at: Date.now(), statut: "nouvelle",
      mode: b.mode === "livraison" ? "livraison" : "retrait",
      nom: txt(b.nom, 60), tel: txt(b.tel, 20), adresse: txt(b.adresse, 120), cp: txt(b.cp, 10),
      heure: txt(b.heure, 12), note: txt(b.note, 200), paiement: txt(b.paiement, 30), total: txt(b.totalTxt, 20),
      lignes: b.lignes.map((l) => ({ q: Math.min(99, +l.q || 1), n: txt(l.n, 80), d: txt(l.d, 300), p: txt(l.p, 20) })),
    };
    await store.setJSON(`cmd-${id}`, o);
    return json({ ok: true, num: o.num, id: o.id, token: o.token, total: o.total });
  }

  // --- le client suit sa commande ---
  if (path === "/api/suivi" && req.method === "GET") {
    const o = await store.get(`cmd-${url.searchParams.get("id")}`, { type: "json" });
    if (!o || o.token !== url.searchParams.get("t")) return json({ error: "introuvable" }, 404);
    return json({ statut: o.statut, mode: o.mode, total: o.total, paiement: o.paiement });
  }

  // --- le site lit les réglages (commandes ouvertes, prix, ruptures) ---
  if (path === "/api/reglages" && req.method === "GET") return json(await lireReglages(store));

  // --- la cuisine ---
  if (path === "/api/cuisine" && req.method === "GET") {
    if (!kitchenOk()) return json({ error: "code" }, 401);
    const avecReglages = url.searchParams.has("reglages");
    const [{ blobs }, R] = await Promise.all([store.list({ prefix: "cmd-" }), avecReglages ? lireReglages(store) : null]);
    const since = Date.now() - 36 * 3600 * 1000;
    const all = (await Promise.all(blobs.map((x) => store.get(x.key, { type: "json" }).catch(() => null)))).filter((o) => o && o.at > since);
    all.forEach((o) => delete o.token);
    return json(avecReglages ? { commandes: all, reglages: R } : all);
  }
  if (path === "/api/cuisine-statut" && req.method === "POST") {
    if (!kitchenOk()) return json({ error: "code" }, 401);
    const b = await req.json();
    const o = await store.get(`cmd-${b.id}`, { type: "json" });
    if (!o || !STATUTS.includes(b.statut)) return json({ error: "introuvable" }, 404);
    o.statut = b.statut;
    await store.setJSON(`cmd-${b.id}`, o);
    return json({ ok: true });
  }
  if (path === "/api/cuisine-reglages" && req.method === "POST") {
    if (!kitchenOk()) return json({ error: "code" }, 401);
    let b;
    try { b = await req.json(); } catch { return json({ error: "illisible" }, 400); }
    if (!b || typeof b !== "object") return json({ error: "illisible" }, 400);
    const r = await lireReglages(store);

    // ouvrir / fermer les commandes en ligne
    if (typeof b.ouvert === "boolean") r.ouvert = b.ouvert;

    // ruptures : { type: "plat" | "cat" | "choix", ids: [...], on: true/false } ou { vider: true }
    if (b.rupture && typeof b.rupture === "object") {
      if (b.rupture.vider) r.rupture = { plats: [], cats: [], choix: [] };
      else {
        const k = { plat: "plats", cat: "cats", choix: "choix" }[b.rupture.type];
        if (!k) return json({ error: "type" }, 400);
        const set = new Set(r.rupture[k]);
        liste(b.rupture.ids, 200).forEach((id) => (b.rupture.on ? set.add(id) : set.delete(id)));
        r.rupture[k] = [...set];
      }
    }

    // prix : { "id-du-plat": 9.5, "pizza-1": [8.5, 12.9, 17.9], "x:tacos:s1": 2, "o:boissonSupp": 2, "id": null (= prix d'origine) }
    if (b.prix && typeof b.prix === "object" && !Array.isArray(b.prix)) {
      let n = 0;
      for (const [k, v] of Object.entries(b.prix)) {
        if (!k || k.length > 100) continue;
        if (v === null) { if (k in r.prix) { delete r.prix[k]; n++; } continue; }
        if (Array.isArray(v)) {
          const a = v.slice(0, 8).map(prixOk);
          if (a.length && a.every((x) => x !== null)) { r.prix[k] = a; n++; }
          continue;
        }
        const p = prixOk(v);
        if (p !== null) { r.prix[k] = p; n++; }
      }
      if (Object.keys(r.prix).length > 2000) return json({ error: "trop de prix" }, 400);
      if (n) r.prixMaj = Date.now();
    }

    r.maj = Date.now();
    await store.setJSON("reglages", r);
    return json({ ok: true, reglages: r });
  }
  return json({ error: "inconnu" }, 404);
}

export default async (req) => handle(req, getStore("commandes"), Netlify.env.get("CUISINE_CODE") || "");
