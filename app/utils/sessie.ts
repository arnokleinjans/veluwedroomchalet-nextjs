import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getKV } from "./db";

export const BEHEER_COOKIE = "vdc_beheer";
export const SCHOONMAAK_COOKIE = "vdc_schoonmaak";
const GELDIG_DAGEN = 30;
const MAX_POGINGEN = 8;
const BLOKKADE_SECONDEN = 15 * 60;

export type BeheerSessie = { rol: "beheer"; exp: number };
export type SchoonmakerSessie = { rol: "schoonmaker"; id: string; v: number; exp: number };

// Afgeleid van bestaande geheimen, zodat er op Vercel geen nieuwe variabele nodig is.
function geheim(): string {
    const basis = process.env.SESSIE_SECRET || `${process.env.ADMIN_PIN}|${process.env.KV_REST_API_TOKEN}`;
    return createHmac("sha256", "vdc-sessie").update(basis).digest("hex");
}

function onderteken(payload: object): string {
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = createHmac("sha256", geheim()).update(data).digest("base64url");
    return `${data}.${sig}`;
}

function controleer<T extends { exp: number }>(waarde: string | undefined): T | null {
    if (!waarde) return null;
    const [data, sig] = waarde.split(".");
    if (!data || !sig) return null;
    const verwacht = createHmac("sha256", geheim()).update(data).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(verwacht);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
        const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as T;
        return payload.exp > Date.now() ? payload : null;
    } catch {
        return null;
    }
}

async function zetCookie(naam: string, payload: object) {
    (await cookies()).set(naam, onderteken(payload), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: GELDIG_DAGEN * 24 * 60 * 60,
    });
}

function vervaldatum() {
    return Date.now() + GELDIG_DAGEN * 24 * 60 * 60 * 1000;
}

export async function startBeheerSessie() {
    await zetCookie(BEHEER_COOKIE, { rol: "beheer", exp: vervaldatum() });
}

export async function startSchoonmakerSessie(id: string, pinVersie: number) {
    await zetCookie(SCHOONMAAK_COOKIE, { rol: "schoonmaker", id, v: pinVersie, exp: vervaldatum() });
}

export async function stopSessie(naam: string) {
    (await cookies()).delete(naam);
}

export async function isBeheer(): Promise<boolean> {
    const s = controleer<BeheerSessie>((await cookies()).get(BEHEER_COOKIE)?.value);
    return s?.rol === "beheer";
}

export async function huidigeSchoonmaker(): Promise<SchoonmakerSessie | null> {
    const s = controleer<SchoonmakerSessie>((await cookies()).get(SCHOONMAAK_COOKIE)?.value);
    return s?.rol === "schoonmaker" ? s : null;
}

async function clientIp(): Promise<string> {
    const h = await headers();
    return (h.get("x-forwarded-for") || h.get("x-real-ip") || "lokaal").split(",")[0].trim();
}

// Mislukte inlogpogingen tellen in Redis: werkt ook over meerdere serverless-instanties heen.
export async function pogingToegestaan(soort: string): Promise<boolean> {
    const aantal = Number(await getKV().get(`inlog:pogingen:${soort}:${await clientIp()}`)) || 0;
    return aantal < MAX_POGINGEN;
}

export async function registreerMislukt(soort: string) {
    const sleutel = `inlog:pogingen:${soort}:${await clientIp()}`;
    const kv = getKV();
    const aantal = await kv.incr(sleutel);
    if (aantal === 1) await kv.expire(sleutel, BLOKKADE_SECONDEN);
}

export async function wisPogingen(soort: string) {
    await getKV().del(`inlog:pogingen:${soort}:${await clientIp()}`);
}

export const NIET_INGELOGD = { success: false as const, error: "Je bent niet (meer) ingelogd. Ververs de pagina en log opnieuw in." };
