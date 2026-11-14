import { revalidatePath } from "next/cache";
import { getKV, getAppDataFresh, invalidateCache } from "./db";
import { synchroniseerNaBoekingen, vervalBeurtenVanBoeking } from "./schoonmaakMail";
import { haalAlleBoekingen, haalBoeking, detailNodig, voegSamen, gastVan, momentVan, voyandoSleutel, Gast, RapportRegel } from "./voyandoKern";

const STAND = "voyando:sync";
const MIN_TUSSENTIJD_MS = 2 * 60_000;
// Per ronde een beperkt aantal detailverzoeken, zodat een serverless-aanroep niet tegen zijn tijdslimiet loopt.
const MAX_DETAILS = 12;

export type VoyandoStand = {
    laatst?: string;
    gelukt?: boolean;
    fout?: string;
    aantal?: number;
    laatsteWijzigingen?: { op: string; regels: RapportRegel[] };
};

export function voyandoActief(): boolean {
    return !!process.env.VOYANDO_API_KEY;
}

export async function leesVoyandoStand(): Promise<VoyandoStand> {
    return ((await getKV().get(STAND)) as VoyandoStand) || {};
}

async function schrijfBoekingen(pasToe: (bookings: any[]) => { bookings: any[]; gewijzigd: boolean }): Promise<any[] | null> {
    // Vlak voor het schrijven opnieuw lezen en de wijziging daarop toepassen: zo overschrijft de koppeling
    // geen wijziging die Kitty op hetzelfde moment in beheer opslaat.
    const vers = await getAppDataFresh();
    const uitkomst = pasToe((vers as any).bookings || []);
    if (!uitkomst.gewijzigd) return null;
    await getKV().set("veluwe_app_data", { ...vers, bookings: uitkomst.bookings });
    invalidateCache();
    return uitkomst.bookings;
}

export async function synchroniseerVoyando(opties: { forceer?: boolean } = {}): Promise<VoyandoStand> {
    const sleutel = process.env.VOYANDO_API_KEY;
    if (!sleutel) return {};
    const kv = getKV();
    const stand = await leesVoyandoStand();
    if (!opties.forceer && stand.laatst && Date.now() - new Date(stand.laatst).getTime() < MIN_TUSSENTIJD_MS) return stand;

    const nu = new Date().toISOString();
    try {
        const voyando = await haalAlleBoekingen(sleutel);
        const appData = await getAppDataFresh();
        const nodig = detailNodig((appData as any).bookings || [], voyando);
        // Nieuwste eerst: een nieuwe boeking is dringender dan een oude naam.
        const gasten = new Map<number, Gast>();
        for (const id of nodig.sort((a, b) => b - a).slice(0, MAX_DETAILS)) {
            const detail = await haalBoeking(sleutel, id);
            if (detail) gasten.set(id, gastVan(detail.guest));
        }

        let rapport: RapportRegel[] = [];
        let geannuleerd: string[] = [];
        const bookings = await schrijfBoekingen(huidig => {
            const r = voegSamen(huidig, voyando, gasten);
            rapport = r.rapport;
            geannuleerd = r.geannuleerd;
            return r;
        });

        if (bookings) {
            for (const id of geannuleerd) {
                await vervalBeurtenVanBoeking(id).catch(e => console.error("Beurten laten vervallen mislukt:", e));
            }
            await synchroniseerNaBoekingen(bookings).catch(e => console.error("Schoonmaak bijwerken na Voyando mislukt:", e));
            revalidatePath("/", "layout");
        }

        const meldenswaard = rapport.filter(r => ["nieuw", "bijgewerkt", "geannuleerd", "hersteld"].includes(r.soort));
        const nieuw: VoyandoStand = {
            laatst: nu,
            gelukt: true,
            aantal: voyando.length,
            laatsteWijzigingen: meldenswaard.length ? { op: nu, regels: meldenswaard } : stand.laatsteWijzigingen,
        };
        await kv.set(STAND, nieuw);
        return nieuw;
    } catch (e: any) {
        console.error("Voyando ophalen mislukt:", e);
        const nieuw: VoyandoStand = { ...stand, laatst: nu, gelukt: false, fout: e?.message || "onbekende fout" };
        await kv.set(STAND, nieuw).catch(() => {});
        return nieuw;
    }
}

// Een gast opent de link uit de Voyando-mail voordat de boeking in beheer staat: dan halen we die ene boeking direct op.
export async function importeerOpVerzoek(rawId: string): Promise<boolean> {
    const sleutel = process.env.VOYANDO_API_KEY;
    const id = decodeURIComponent(rawId || "").trim();
    if (!sleutel || !/^\d{4,8}$/.test(id)) return false;
    try {
        const detail = await haalBoeking(sleutel, id);
        if (!detail || detail.status !== "accepted" || !detail.check_in || !detail.check_out) return false;
        const gast = gastVan(detail.guest);
        const bookings = await schrijfBoekingen(huidig => {
            if (huidig.some(b => String(b.id).toUpperCase() === id || voyandoSleutel(b) === id)) return { bookings: huidig, gewijzigd: false };
            return {
                gewijzigd: true,
                bookings: [...huidig, { id, guestName: gast.naam || "Gast", checkIn: detail.check_in, checkOut: detail.check_out, language: "nl", voyando: momentVan(detail, gast) }],
            };
        });
        if (bookings) await synchroniseerNaBoekingen(bookings).catch(e => console.error("Schoonmaak bijwerken na Voyando mislukt:", e));
        return true;
    } catch (e) {
        console.error("Voyando-boeking op verzoek ophalen mislukt:", e);
        return false;
    }
}
