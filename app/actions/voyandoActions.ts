"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { getKV, getAppDataFresh, invalidateCache } from "../utils/db";
import { isBeheer, NIET_INGELOGD } from "../utils/sessie";
import { synchroniseerNaBoekingen } from "../utils/schoonmaakMail";
import { synchroniseerVoyando, leesVoyandoStand, voyandoActief, VoyandoStand } from "../utils/voyando";

export async function voyandoOphalen(forceer: boolean = false): Promise<{ actief: boolean; stand: VoyandoStand }> {
    noStore();
    if (!(await isBeheer())) throw new Error("Niet ingelogd");
    if (!voyandoActief()) return { actief: false, stand: {} };
    return { actief: true, stand: await synchroniseerVoyando({ forceer }) };
}

export async function voyandoStand(): Promise<{ actief: boolean; stand: VoyandoStand }> {
    noStore();
    if (!(await isBeheer())) throw new Error("Niet ingelogd");
    return { actief: voyandoActief(), stand: voyandoActief() ? await leesVoyandoStand() : {} };
}

export async function neemDatumsOverVanVoyando(bookingId: string) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh() as any;
    const boeking = (appData.bookings || []).find((b: any) => b.id === bookingId);
    if (!boeking?.voyando?.checkIn || !boeking.voyando.checkOut) return { success: false, error: "Deze boeking is niet gekoppeld aan Voyando." };

    const bookings = appData.bookings.map((b: any) =>
        b.id === bookingId ? { ...b, checkIn: b.voyando.checkIn, checkOut: b.voyando.checkOut } : b
    );
    try {
        await getKV().set("veluwe_app_data", { ...appData, bookings });
        invalidateCache();
        revalidatePath("/", "layout");
    } catch (e: any) {
        return { success: false, error: "Kon data niet opslaan in de database. " + (e?.message || "") };
    }
    await synchroniseerNaBoekingen(bookings).catch(e => console.error("Schoonmaak bijwerken mislukt:", e));
    return { success: true };
}
