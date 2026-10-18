// Maakt voor elke boeking die al vertrokken is een schoonmaakbeurt aan, als die er nog niet is.
// Status "uitgevoerd", zonder schoonmaakster, zonder bedrag, niet betaald. Kitty vult de rest zelf in.
// Er gaan geen mails uit. Nog eens draaien maakt niets dubbel.
// Gebruik: node scripts/schoonmaak-verleden-aanvullen.mjs              (TEST-Redis)
//          node scripts/schoonmaak-verleden-aanvullen.mjs --productie (productie, maak eerst een backup)

import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";

const productie = process.argv.includes("--productie");
let db;
if (productie) {
    const env = Object.fromEntries(
        readFileSync(".env.productie.local", "utf8").split("\n")
            .map(r => r.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
            .map(m => [m[1], m[2].replace(/^"|"$/g, "")]),
    );
    db = new Redis({ url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN });
} else {
    db = new Redis({ url: "http://127.0.0.1:8079", token: "test-token-lokaal" });
}

const vandaag = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());
const app = await db.get("veluwe_app_data");
const ids = await db.smembers("schoonmaak:index");
const beurten = ids.length ? await db.mget(...ids.map(i => `schoonmaak:${i}`)) : [];
const heeftBeurt = new Set(beurten.filter(b => b?.automatisch && b.bookingId).map(b => b.bookingId));

const oud = (app.bookings || [])
    .filter(b => !b.isTest && b.checkOut && b.checkOut < vandaag && b.checkIn <= b.checkOut && !heeftBeurt.has(b.id))
    .sort((a, b) => a.checkOut.localeCompare(b.checkOut));
const overgeslagen = (app.bookings || []).filter(b => !b.isTest && b.checkOut < vandaag && b.checkIn > b.checkOut);

const nu = new Date().toISOString();
for (const b of oud) {
    const beurt = {
        id: Date.now().toString(36) + randomBytes(3).toString("hex"),
        bookingId: b.id,
        automatisch: true,
        datum: b.checkOut,
        datumHandmatig: false,
        betaald: false,
        status: "uitgevoerd",
        historie: [{ op: nu, actie: "overgenomen uit oude boeking" }],
        bijgewerkt: nu,
    };
    await db.set(`schoonmaak:${beurt.id}`, beurt);
    await db.sadd("schoonmaak:index", beurt.id);
}

console.log(`${productie ? "PRODUCTIE" : "TEST"}: ${oud.length} oude beurten aangemaakt${oud.length ? ` (${oud[0].checkOut} t/m ${oud.at(-1).checkOut})` : ""}.`);
if (overgeslagen.length) console.log(`Overgeslagen, vertrek vóór aankomst: ${overgeslagen.map(b => `${b.guestName} (${b.id})`).join(", ")}`);
console.log(`Beurten totaal: ${(await db.smembers("schoonmaak:index")).length}`);
