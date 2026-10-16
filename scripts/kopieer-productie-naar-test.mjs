// Kopieert alle data uit de productie-Redis naar de lokale TEST-Redis (docker-compose.test-db.yml).
// Productie wordt gelezen met het alleen-lezen-token: dit script kan daar niets wijzigen.
// Gebruik: npm run testdb:kopie

import { readFileSync } from "node:fs";
import { Redis } from "@upstash/redis";

const TEST_URL = "http://127.0.0.1:8079";
const TEST_TOKEN = "test-token-lokaal";
const TEST_EMAIL = "akleinjans@me.com";

function leesEnv(bestand) {
    const env = {};
    for (const regel of readFileSync(bestand, "utf8").split("\n")) {
        const m = regel.match(/^([A-Z_]+)=(.*)$/);
        if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
    return env;
}

const prodEnv = leesEnv(".env.productie.local");
if (!prodEnv.KV_REST_API_URL || !prodEnv.KV_REST_API_READ_ONLY_TOKEN) {
    console.error("KV_REST_API_URL of KV_REST_API_READ_ONLY_TOKEN ontbreekt in .env.productie.local");
    process.exit(1);
}

const prod = new Redis({
    url: prodEnv.KV_REST_API_URL,
    token: prodEnv.KV_REST_API_READ_ONLY_TOKEN,
    automaticDeserialization: false,
});
const test = new Redis({ url: TEST_URL, token: TEST_TOKEN, automaticDeserialization: false });

await test.ping().catch(() => {
    console.error("TEST-Redis niet bereikbaar. Start hem met: npm run testdb:start");
    process.exit(1);
});

const sleutels = [];
let cursor = "0";
do {
    const [volgende, batch] = await prod.scan(cursor, { count: 500 });
    sleutels.push(...batch);
    cursor = String(volgende);
} while (cursor !== "0");

await test.flushdb();

const telling = {};
for (const sleutel of sleutels) {
    const type = await prod.type(sleutel);
    if (type === "string") {
        await test.set(sleutel, await prod.get(sleutel));
    } else if (type === "hash") {
        await test.hset(sleutel, await prod.hgetall(sleutel));
    } else if (type === "list") {
        const items = await prod.lrange(sleutel, 0, -1);
        if (items.length) await test.rpush(sleutel, ...items);
    } else if (type === "set") {
        const items = await prod.smembers(sleutel);
        if (items.length) await test.sadd(sleutel, ...items);
    } else if (type === "zset") {
        const items = await prod.zrange(sleutel, 0, -1, { withScores: true });
        for (let i = 0; i < items.length; i += 2) {
            await test.zadd(sleutel, { member: items[i], score: Number(items[i + 1]) });
        }
    } else {
        console.warn(`Overgeslagen (${type}): ${sleutel}`);
        continue;
    }
    const pttl = await prod.pttl(sleutel);
    if (pttl > 0) await test.pexpire(sleutel, pttl);
    telling[type] = (telling[type] || 0) + 1;
}

// Mail uit de testomgeving mag nooit bij de camping uitkomen.
const testJson = new Redis({ url: TEST_URL, token: TEST_TOKEN });
const appData = await testJson.get("veluwe_app_data");
if (appData?.property) {
    appData.property.campingEmail = TEST_EMAIL;
    await testJson.set("veluwe_app_data", appData);
}

console.log(`${sleutels.length} sleutels gekopieerd naar TEST:`, telling);
console.log(`Camping-e-mail in TEST staat op ${TEST_EMAIL}.`);
