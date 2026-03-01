import { Redis } from '@upstash/redis';
import { unstable_noStore as noStore } from 'next/cache';

let kvInstance: Redis | null = null;
export function getKV(): Redis {
    // VERCEL DEBUG SCANNER
    console.log("KV INIT ENV DUMP:");
    console.log("- KV_REST_API_URL exists:", !!process.env.KV_REST_API_URL);
    console.log("- KV_REST_API_TOKEN exists:", !!process.env.KV_REST_API_TOKEN);
    console.log("- UPSTASH_REST_URL exists:", !!process.env.UPSTASH_REDIS_REST_URL);

    if (!kvInstance) {
        kvInstance = new Redis({
            url: (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) as string,
            token: (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN) as string,
        });
    }
    return kvInstance;
}

const defaultAppData = {
    "accessCode": "VELUWE2026",
    "bookings": [
        {
            "id": "FAMILIE-L1JD",
            "guestName": "Familie van der Horst",
            "checkIn": "2026-02-27",
            "checkOut": "2026-03-02"
        },
        {
            "id": "KITTY-7R9X",
            "guestName": "Kitty van der Pijll",
            "checkIn": "2026-02-27",
            "checkOut": "2026-05-03"
        }
    ],
    "property": {
        "name": "Veluwe Droom Chalet",
        "subtitle": "Welkom terug",
        "headerImage": "images/Boshuisje.jpg",
        "wifi": {
            "network": "Wegwezen",
            "password": "BomenZijnFijn2026"
        },
        "host": {
            "name": "Kitty",
            "phone": "+31653238603",
            "avatar": "https://ui-avatars.com/api/?name=Arno&background=4A5D23&color=fff&rounded=true"
        }
    },
    "rules": [
        {
            "title": "Afvalscheiding",
            "desc": "Groenbak achter het schuurtje. Papier in de blauwe bak. Restafval in de grijze bak."
        },
        {
            "title": "Testje",
            "desc": "Test"
        }
    ],
    "videos": [
        {
            "title": "vakantiehuisje",
            "thumb": "images/Boshuisje.jpg",
            "url": "https://www.youtube.com/watch?v=S1WnqtMAeS4"
        }
    ],
    "omgeving": [
        {
            "name": "Pannenkoekenboerderij De Boswachter",
            "desc": "Heerlijk voor de kinderen. 5 minuten fietsen.",
            "image": "",
            "url": "https://www.nu.nl/",
            "adres": ""
        },
        {
            "name": "Bar het suffertje",
            "desc": "testbar",
            "image": "",
            "url": "",
            "adres": ""
        }
    ],
    "insights": [
        {
            "icon": "wifi-outline",
            "title": "Wifi",
            "subtitle": "test",
            "action": "wifi-modal",
            "detailContent": ""
        },
        {
            "icon": "time-outline",
            "title": "In- en uitchecken",
            "subtitle": "Inchecken kan vanaf 15.00 uur en gaat contactloos via een sleutelkastje. Het uitchecken is uiterlijk om 10.30 uur. ",
            "action": "none",
            "detailContent": ""
        },
        {
            "icon": "key-outline",
            "title": "Sleutelkastje",
            "subtitle": "Het sleutelkastje kun je vinden....",
            "action": "none",
            "detailContent": ""
        },
        {
            "icon": "restaurant-outline",
            "title": "Lekker Eten",
            "subtitle": "Check onze lokale restaurant tips!",
            "action": "none",
            "detailContent": ""
        }
    ],
    "chatbotContext": ""
};

// Main function to retrieve data from Vercel KV
export async function getAppData() {
    noStore();
    try {
        const kv = getKV();
        const data = await kv.get('veluwe_app_data');
        if (!data) {
            // Seed the database with defaults if it's completely empty
            const kv = getKV();
            await kv.set('veluwe_app_data', defaultAppData);
            return defaultAppData;
        }
        return data as typeof defaultAppData;
    } catch (error) {
        console.error("Vercel KV Error: ", error);
        // Fallback to static defaults if KV is not configured yet (e.g. local without .env)
        return defaultAppData;
    }
}
