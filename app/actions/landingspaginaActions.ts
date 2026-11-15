"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getKV } from "../utils/db";
import { isBeheer, NIET_INGELOGD } from "../utils/sessie";
import { HEADER_SLEUTEL, PROMO_SLEUTEL, LANDINGSPAGINA_URL, geldigHeaderId, haalHeaderLijst, haalPromoLijst, leesHeader, leesPromo, type LandingHeader, type LandingPromo } from "../utils/landingspagina";

export type LandingspaginaStand = { adres: string; actief: string; headers: LandingHeader[]; fout?: string };

export async function haalLandingspaginaHeaders(): Promise<LandingspaginaStand> {
    noStore();
    if (!(await isBeheer())) throw new Error("Niet ingelogd");
    const actief = await leesHeader();
    try {
        return { adres: LANDINGSPAGINA_URL, actief, headers: await haalHeaderLijst() };
    } catch (e: any) {
        return { adres: LANDINGSPAGINA_URL, actief, headers: [], fout: e?.message || "De lijst met headers is niet op te halen." };
    }
}

export async function kiesLandingspaginaHeader(id: string) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    if (!geldigHeaderId(id)) return { success: false as const, error: "Onbekende header." };
    try {
        const lijst = await haalHeaderLijst();
        if (!lijst.some(h => h.id === id)) return { success: false as const, error: "Deze header staat niet op de landingspagina." };
        await getKV().set(HEADER_SLEUTEL, id);
        return { success: true as const };
    } catch (e: any) {
        return { success: false as const, error: e?.message || "Opslaan mislukt." };
    }
}

// actief is "" als er geen promo aan staat.
export type LandingspaginaPromoStand = { adres: string; actief: string; promos: LandingPromo[]; fout?: string };

export async function haalLandingspaginaPromos(): Promise<LandingspaginaPromoStand> {
    noStore();
    if (!(await isBeheer())) throw new Error("Niet ingelogd");
    const actief = (await leesPromo()) || "";
    try {
        return { adres: LANDINGSPAGINA_URL, actief, promos: await haalPromoLijst() };
    } catch (e: any) {
        return { adres: LANDINGSPAGINA_URL, actief, promos: [], fout: e?.message || "De lijst met promo's is niet op te halen." };
    }
}

export async function kiesLandingspaginaPromo(id: string) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    try {
        if (id === "") {
            await getKV().set(PROMO_SLEUTEL, "");
            return { success: true as const };
        }
        if (!geldigHeaderId(id)) return { success: false as const, error: "Onbekende promo." };
        const lijst = await haalPromoLijst();
        if (!lijst.some(p => p.id === id)) return { success: false as const, error: "Deze promo staat niet op de landingspagina." };
        await getKV().set(PROMO_SLEUTEL, id);
        return { success: true as const };
    } catch (e: any) {
        return { success: false as const, error: e?.message || "Opslaan mislukt." };
    }
}
