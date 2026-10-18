// Eenmalig bij het live zetten van de schoonmaak: zet de schoonmaaksters (met link en pincode)
// uit de lokale TEST-Redis in productie, plus de schoonmaakinstellingen. Beurten gaan niet mee:
// productie begint met een schone lei en maakt de beurten zelf aan bij het openen van beheer.
// Gebruik: node scripts/schoonmaak-naar-productie.mjs

import { readFileSync } from "node:fs";
import { Redis } from "@upstash/redis";

const env = Object.fromEntries(
    readFileSync(".env.productie.local", "utf8").split("\n")
        .map(r => r.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
        .map(m => [m[1], m[2].replace(/^"|"$/g, "")]),
);
const prod = new Redis({ url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN });
const test = new Redis({ url: "http://127.0.0.1:8079", token: "test-token-lokaal" });

if (await prod.exists("schoonmakers")) {
    console.log("In productie staan al schoonmaaksters. Er is niets gewijzigd.");
    process.exit(1);
}
const schoonmakers = await test.get("schoonmakers");
if (!schoonmakers?.length) {
    console.log("Geen schoonmaaksters gevonden in TEST. Draait de TEST-Redis (npm run testdb:start)?");
    process.exit(1);
}

await prod.set("schoonmakers", schoonmakers);
await prod.set("schoonmaak:instellingen", { vertrektijd: "11:00", meldingEmail: "info@veluwedroomchalet.nl" });

const terug = await prod.get("schoonmakers");
console.log("Schoonmaaksters in productie:", terug.map(s => `${s.naam} (${s.email})`).join(", "));
console.log("Instellingen in productie:", JSON.stringify(await prod.get("schoonmaak:instellingen")));
console.log("Boekingen in productie:", (await prod.get("veluwe_app_data")).bookings.length);
console.log("\nLinks voor de schoonmaaksters (pincodes blijven hetzelfde):");
for (const s of terug) console.log(`  ${s.naam}: https://webapp.veluwedroomchalet.nl/schoonmaak/${s.linkCode}`);
