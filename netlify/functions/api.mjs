import { getStore } from "@netlify/blobs";

export const config = { path: ["/api/commande", "/api/suivi", "/api/cuisine", "/api/cuisine-statut"] };

const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const txt = (v, n) => String(v ?? "").slice(0, n);
const STATUTS = ["nouvelle", "preparation", "prete", "terminee", "annulee"];

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

  // --- la cuisine ---
  if (path === "/api/cuisine" && req.method === "GET") {
    if (!kitchenOk()) return json({ error: "code" }, 401);
    const { blobs } = await store.list({ prefix: "cmd-" });
    const since = Date.now() - 36 * 3600 * 1000;
    const all = (await Promise.all(blobs.map((x) => store.get(x.key, { type: "json" }).catch(() => null)))).filter((o) => o && o.at > since);
    all.forEach((o) => delete o.token);
    return json(all);
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
  return json({ error: "inconnu" }, 404);
}

export default async (req) => handle(req, getStore("commandes"), Netlify.env.get("CUISINE_CODE") || "");
