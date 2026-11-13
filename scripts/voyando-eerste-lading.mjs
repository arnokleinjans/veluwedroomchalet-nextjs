// Eerste lading van de Voyando-koppeling: koppelt de bestaande boekingen in beheer aan Voyando
// en voegt toe wat er nog niet staat. Wat in beheer is ingevoerd blijft ongewijzigd; verschillen
// komen in het rapport en worden niet overgenomen.
//
//   node scripts/voyando-eerste-lading.mjs                 proefronde tegen TEST, schrijft niets
//   node scripts/voyando-eerste-lading.mjs --schrijf       schrijft naar TEST
//   node scripts/voyando-eerste-lading.mjs --productie     proefronde tegen productie, schrijft niets
//   node scripts/voyando-eerste-lading.mjs --productie --schrijf
//
// Node 24 leest het TypeScript-bestand met de kern rechtstreeks.

import { readFileSync, writeFileSync } from "node:fs";
import { Redis } from "@upstash/redis";
import { haalAlleBoekingen, haalBoeking, detailNodig, voegSamen, gastVan } from "../app/utils/voyandoKern.ts";

const productie = process.argv.includes("--productie");
const schrijf = process.argv.includes("--schrijf");

function leesEnv(bestand) {
    const env = {};
    for (const regel of readFileSync(bestand, "utf8").split("\n")) {
        const m = regel.match(/^([A-Z_]+)=(.*)$/);
        if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
    return env;
}

const lokaal = leesEnv(".env.local");
const sleutel = lokaal.VOYANDO_API_KEY;
if (!sleutel) { console.error("VOYANDO_API_KEY ontbreekt in .env.local"); process.exit(1); }

let db;
if (productie) {
    const p = leesEnv(".env.productie.local");
    const token = schrijf ? p.KV_REST_API_TOKEN : (p.KV_REST_API_READ_ONLY_TOKEN || p.KV_REST_API_TOKEN);
    if (!p.KV_REST_API_URL || !token) { console.error("KV_REST_API_URL of het token ontbreekt in .env.productie.local"); process.exit(1); }
    db = new Redis({ url: p.KV_REST_API_URL, token });
} else {
    db = new Redis({ url: "http://127.0.0.1:8079", token: "test-token-lokaal" });
}

console.log(`Database: ${productie ? "PRODUCTIE" : "TEST"} · ${schrijf ? "SCHRIJVEN" : "proefronde, er wordt niets geschreven"}\n`);

const voyando = await haalAlleBoekingen(sleutel);
let app = await db.get("veluwe_app_data");
if (!app?.bookings) { console.error("Geen boekingen gevonden in veluwe_app_data"); process.exit(1); }

const nodig = detailNodig(app.bookings, voyando);
console.log(`Voyando: ${voyando.length} boekingen · beheer: ${app.bookings.length} · gastgegevens ophalen: ${nodig.length}`);
const namen = new Map();
for (const [i, id] of nodig.entries()) {
    const detail = await haalBoeking(sleutel, id);
    if (detail) namen.set(id, gastVan(detail.guest));
    if (i % 10 === 9) process.stdout.write(`  ${i + 1}/${nodig.length}\n`);
    await new Promise(r => setTimeout(r, 1100));
}

if (schrijf) app = await db.get("veluwe_app_data");
const voor = JSON.stringify(app.bookings);
const uit = voegSamen(app.bookings, voyando, namen, { koppelOpDatum: true });

const KOPPEN = {
    nieuw: "Nieuw in beheer (stond alleen in Voyando)",
    verschil: "Gekoppeld, maar beheer wijkt af van Voyando (niets gewijzigd)",
    gekoppeld: "Gekoppeld en gelijk",
    "alleen-beheer": "Alleen in beheer (niet in Voyando, ongemoeid gelaten)",
    overgeslagen: "Overgeslagen",
    bijgewerkt: "Bijgewerkt", geannuleerd: "Geannuleerd", hersteld: "Hersteld",
};
for (const [soort, kop] of Object.entries(KOPPEN)) {
    const regels = uit.rapport.filter(r => r.soort === soort);
    if (!regels.length) continue;
    console.log(`\n${kop}: ${regels.length}`);
    for (const r of soort === "gekoppeld" ? regels.filter(r => r.tekst.includes("link blijft")) : regels) console.log(`  ${r.id.padEnd(14)} ${(r.naam || "").padEnd(28)} ${r.tekst}`);
}

// Controle: van een bestaande boeking mag alleen het veld voyando zijn toegevoegd of bijgewerkt.
const oud = new Map(JSON.parse(voor).map(b => [b.id, b]));
let aangetast = 0;
for (const b of uit.bookings) {
    const o = oud.get(b.id);
    if (!o) continue;
    const { voyando: _v, ...rest } = b;
    const { voyando: _w, ...oudRest } = o;
    if (JSON.stringify(rest) !== JSON.stringify(oudRest)) { aangetast++; console.error(`  ONVERWACHT gewijzigd: ${b.id}`); }
}
const verdwenen = [...oud.keys()].filter(id => !uit.bookings.some(b => b.id === id));
console.log(`\nControle: ${oud.size} bestaande boekingen, ${aangetast} inhoudelijk gewijzigd, ${verdwenen.length} verdwenen. Na de lading: ${uit.bookings.length} boekingen.`);
if (aangetast || verdwenen.length) { console.error("Gestopt: de lading zou bestaande gegevens raken."); process.exit(1); }

if (!schrijf) { console.log("\nProefronde klaar. Er is niets geschreven."); process.exit(0); }

const stempel = new Date().toISOString().replace(/[:.]/g, "-");
const kopie = `scripts/voor-voyando-lading_${productie ? "productie" : "test"}_${stempel}.json`;
writeFileSync(kopie, JSON.stringify(app, null, 1));
await db.set("veluwe_app_data", { ...app, bookings: uit.bookings });
console.log(`\nGeschreven. Kopie van de oude stand: ${kopie}`);
