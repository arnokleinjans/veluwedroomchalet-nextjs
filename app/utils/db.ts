import { Redis } from '@upstash/redis';
import { unstable_noStore as noStore } from 'next/cache';

let kvInstance: Redis | null = null;
export function getKV(): Redis {
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
            "checkOut": "2026-03-02",
            "language": "nl"
        },
        {
            "id": "KITTY-7R9X",
            "guestName": "Kitty van der Pijll",
            "checkIn": "2026-02-27",
            "checkOut": "2026-05-03",
            "language": "nl"
        }
    ],
    "property": {
        "name": "Veluwe Droom Chalet",
        "subtitle": "Welkom terug",
        "headerImage": "images/Boshuisje.webp",
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
            "thumb": "images/Boshuisje.webp",
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
        },
        {
            "name": "De Smaak van Hoenderloo",
            "desc": "Heerlijk voor de kinderen. 5 minuten fietsen.",
            "image": "images/Restaurant in een oogopslag.webp",
            "url": "https://www.desmaakvanhoenderloo.nl/",
            "adres": "De Smaak van Hoenderloo krimweg"
        }
    ],
    "insights": [
        {
            "icon": "wifi-outline",
            "title": "Wifi",
            "subtitle": "test",
            "action": "wifi-modal",
            "detailContent": "",
            "image": ""
        },
        {
            "icon": "time-outline",
            "title": "In- en uitchecken",
            "subtitle": "Inchecken kan vanaf 15.00 uur en gaat contactloos via een sleutelkastje. Het uitchecken is uiterlijk om 10.30 uur. ",
            "action": "none",
            "detailContent": "",
            "image": ""
        },
        {
            "icon": "key-outline",
            "title": "Sleutelkastje",
            "subtitle": "Het sleutelkastje kun je vinden....",
            "action": "none",
            "detailContent": "",
            "image": ""
        },
        {
            "icon": "restaurant-outline",
            "title": "Lekker Eten",
            "subtitle": "Check onze lokale restaurant tips!",
            "action": "none",
            "detailContent": "",
            "image": ""
        }
    ],
    "chatbotContext": "",
    "translations": {} as any
};

// Cached read for guest-facing pages (revalidates every 2 seconds)
// This prevents every single page view from hitting Upstash Redis
let cachedData: typeof defaultAppData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 2_000; // 2 seconds

export async function getAppData() {
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return cachedData;
    }

    try {
        const kv = getKV();
        const data = await kv.get('veluwe_app_data');
        if (!data) {
            await kv.set('veluwe_app_data', defaultAppData);
            cachedData = defaultAppData;
            cacheTimestamp = now;
            return defaultAppData;
        }
        cachedData = data as typeof defaultAppData;
        cacheTimestamp = now;
        return cachedData;
    } catch (error) {
        console.error("Vercel KV Error: ", error);
        return cachedData || defaultAppData;
    }
}

export async function getTranslatedAppData(bookingId: string) {
    const appData = await getAppData();
    const booking = appData.bookings?.find((b: any) => b.id === bookingId);
    if (!booking || !booking.language || booking.language === 'nl') return appData;

    const mergeTranslations = (data: any, translation: any): any => {
        if (!translation) return data;
        if (Array.isArray(data)) {
            return data.map((item, i) => mergeTranslations(item, translation[i]));
        } else if (data !== null && typeof data === 'object') {
            const result = { ...data };
            for (const key in translation) {
                if (key in result) {
                    result[key] = mergeTranslations(result[key], translation[key]);
                } else {
                    result[key] = translation[key];
                }
            }
            return result;
        }
        return translation;
    };

    let finalAppData = appData;
    if (appData.translations && appData.translations[booking.language]) {
        finalAppData = mergeTranslations(appData, appData.translations[booking.language]);
    }
    return finalAppData;
}


// Uncached read for admin panel — always gets fresh data
export async function getAppDataFresh() {
    noStore();
    try {
        const kv = getKV();
        const data = await kv.get('veluwe_app_data');
        if (!data) {
            await kv.set('veluwe_app_data', defaultAppData);
            return defaultAppData;
        }
        // Also update cache so guest pages get the latest after admin saves
        cachedData = data as typeof defaultAppData;
        cacheTimestamp = Date.now();
        return data as typeof defaultAppData;
    } catch (error) {
        console.error("Vercel KV Error: ", error);
        return defaultAppData;
    }
}

// Invalidate the in-memory cache (call after admin saves)
export function invalidateCache() {
    cachedData = null;
    cacheTimestamp = 0;
}
