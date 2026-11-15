import { getKV } from "./db";

// De actieve header van de landingspagina (www.veluwedroomchalet.nl). De landingspagina is een aparte site
// en leest alleen deze ene waarde, via /api/landingspagina/header.
export const HEADER_SLEUTEL = "landingspagina:header";
export const STANDAARD_HEADER = "heidebloei";
export const LANDINGSPAGINA_URL = (process.env.LANDINGSPAGINA_URL || "https://www.veluwedroomchalet.nl").replace(/\/+$/, "");

export type LandingHeader = { id: string; naam: string; omschrijving: string };

export const geldigHeaderId = (id: unknown): id is string => typeof id === "string" && /^[a-z0-9-]{1,40}$/.test(id);

export async function leesHeader(): Promise<string> {
    const waarde = await getKV().get(HEADER_SLEUTEL);
    return geldigHeaderId(waarde) ? waarde : STANDAARD_HEADER;
}

// De lijst staat bij de landingspagina zelf, zodat een nieuwe header alleen daar een deploy vraagt.
export async function haalHeaderLijst(): Promise<LandingHeader[]> {
    const res = await fetch(`${LANDINGSPAGINA_URL}/assets/headers/lijst.json`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`De landingspagina gaf ${res.status} op de lijst met headers.`);
    const lijst = await res.json();
    if (!Array.isArray(lijst)) throw new Error("De lijst met headers is niet leesbaar.");
    return lijst
        .filter((h: any) => geldigHeaderId(h?.id))
        .map((h: any) => ({ id: h.id, naam: String(h.naam || h.id), omschrijving: String(h.omschrijving || "") }));
}

// De promo op de landingspagina: een video in een pop-up. Hooguit één actief, of geen (lege waarde).
export const PROMO_SLEUTEL = "landingspagina:promo";
export type LandingPromo = { id: string; naam: string; omschrijving: string; tot?: string };

export async function leesPromo(): Promise<string | null> {
    const waarde = await getKV().get(PROMO_SLEUTEL);
    return geldigHeaderId(waarde) ? waarde : null;
}

export async function haalPromoLijst(): Promise<LandingPromo[]> {
    const res = await fetch(`${LANDINGSPAGINA_URL}/assets/promos/lijst.json`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`De landingspagina gaf ${res.status} op de lijst met promo's.`);
    const lijst = await res.json();
    if (!Array.isArray(lijst)) throw new Error("De lijst met promo's is niet leesbaar.");
    return lijst
        .filter((p: any) => geldigHeaderId(p?.id))
        .map((p: any) => ({ id: p.id, naam: String(p.naam || p.id), omschrijving: String(p.omschrijving || ""), tot: /^\d{4}-\d{2}-\d{2}$/.test(p.tot) ? p.tot : undefined }));
}
