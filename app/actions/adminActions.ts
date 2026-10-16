"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { getKV, getAppDataFresh, invalidateCache } from "../utils/db";
import { isBeheer, startBeheerSessie, stopSessie, BEHEER_COOKIE, NIET_INGELOGD, pogingToegestaan, registreerMislukt, wisPogingen } from "../utils/sessie";
import { hernoemBoekingInBeurten } from "../utils/schoonmaakStore";
import { synchroniseerNaBoekingen } from "../utils/schoonmaakMail";

// Helper to write the appData object back to Vercel KV
async function saveToKV(newData: any) {
    noStore();
    try {
        const kv = getKV();
        await kv.set('veluwe_app_data', newData);
        // Clear in-memory cache so guest pages pick up changes
        invalidateCache();
        // Instruct Next.js to clear cache for the entire site
        revalidatePath("/", "layout");
        return { success: true };
    } catch (error: any) {
        console.error("Vercel KV Write Error:", error);
        return { success: false, error: "Kon data niet opslaan in de database. " + (error.message || "Onbekende fout.") };
    }
}

export async function verifyAdminPin(pin: string): Promise<{ ok: boolean; error?: string }> {
    const adminPin = process.env.ADMIN_PIN;
    if (!adminPin) throw new Error("ADMIN_PIN is niet geconfigureerd");
    if (!(await pogingToegestaan("beheer"))) {
        return { ok: false, error: "Te veel pogingen. Probeer het over een kwartier opnieuw." };
    }
    if (pin !== adminPin) {
        await registreerMislukt("beheer");
        return { ok: false, error: "Ongeldige PIN." };
    }
    await wisPogingen("beheer");
    await startBeheerSessie();
    return { ok: true };
}

export async function checkBeheerSessie(): Promise<boolean> {
    return await isBeheer();
}

export async function logoutBeheer() {
    await stopSessie(BEHEER_COOKIE);
}

// Securely fetch data for client-side Admin Panel (always fresh)
export async function fetchAdminData() {
    if (!(await isBeheer())) throw new Error("Niet ingelogd");
    return await getAppDataFresh();
}

// Batched save: General info + header image in ONE write instead of TWO
export async function updateGeneralInfo(name: string, hostName: string, phone: string, subtitle: string, headerImage: string, keyCode: string = "", staanplaats: string = "", campingEmail: string = "") {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    updatedData.property.name = name;
    updatedData.property.subtitle = subtitle;
    updatedData.property.host.name = hostName;
    updatedData.property.host.phone = phone;
    updatedData.property.headerImage = headerImage;
    (updatedData.property as any).keyCode = keyCode;
    (updatedData.property as any).staanplaats = staanplaats;
    (updatedData.property as any).campingEmail = campingEmail;

    return await saveToKV(updatedData);
}

export async function updateExpiredPageContent(content: string) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    updatedData.expiredPageContent = content;
    return await saveToKV(updatedData);
}

// Keep individual functions for backward compatibility
export async function updatePropertyInfo(name: string, hostName: string, phone: string, subtitle: string) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    updatedData.property.name = name;
    updatedData.property.subtitle = subtitle;
    updatedData.property.host.name = hostName;
    updatedData.property.host.phone = phone;

    return await saveToKV(updatedData);
}

export async function updateHeaderImage(headerImage: string) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    updatedData.property.headerImage = headerImage;
    return await saveToKV(updatedData);
}

export async function updateInsights(newInsights: any[]) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    updatedData.insights = newInsights;
    return await saveToKV(updatedData);
}

export async function updateVideos(newVideos: any[]) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    updatedData.videos = newVideos;
    return await saveToKV(updatedData);
}

// Batched save: Omgeving + AI settings in ONE write
export async function updateOmgevingWithAi(newOmgeving: any[], aiPrompt: string, aiMaxChars: number) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    updatedData.omgeving = newOmgeving;
    updatedData.aiPrompt = aiPrompt;
    updatedData.aiMaxChars = aiMaxChars;
    return await saveToKV(updatedData);
}

// Keep individual functions for backward compatibility
export async function updateOmgeving(newOmgeving: any[]) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    updatedData.omgeving = newOmgeving;
    return await saveToKV(updatedData);
}

export async function updateChatbotContext(context: string) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    updatedData.chatbotContext = context;
    return await saveToKV(updatedData);
}

export async function updateAiSettings(aiPrompt: string, aiMaxChars: number) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    updatedData.aiPrompt = aiPrompt;
    updatedData.aiMaxChars = aiMaxChars;
    return await saveToKV(updatedData);
}

// Een fout in de schoonmaak mag het opslaan van een boeking nooit laten mislukken.
async function schoonmaakBijwerken(bookings: any[]) {
    try {
        await synchroniseerNaBoekingen(bookings || []);
    } catch (e) {
        console.error("Schoonmaak bijwerken na boekingswijziging mislukt:", e);
    }
}

function normalizeBookingId(raw: string): string {
    return raw.trim().toUpperCase();
}

function findBookingWithId(bookings: any[], id: string, excludeId?: string): any | null {
    return bookings.find((b: any) => {
        if (excludeId && b.id === excludeId) return false;
        return b.id?.toUpperCase() === id;
    }) || null;
}

function idTakenError(newId: string, bezet: any) {
    const naam = bezet.guestName || "onbekende gast";
    const periode = bezet.checkIn && bezet.checkOut ? ` (${bezet.checkIn} t/m ${bezet.checkOut})` : "";
    const verlopen = bezet.checkOut && new Date(bezet.checkOut + "T12:00:00") < new Date();
    const hint = verlopen ? ' Die boeking is verlopen — zet het filter op "Alle" om hem te zien.' : "";
    return { success: false, error: `Boekingsnummer ${newId} is al in gebruik door ${naam}${periode}.${hint}` };
}

export async function addBooking(guestName: string, checkIn: string, checkOut: string, language: string = "nl", bookingNumber?: string) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    if (!updatedData.bookings) {
        updatedData.bookings = [];
    }

    let newId: string;
    if (bookingNumber && bookingNumber.trim()) {
        newId = normalizeBookingId(bookingNumber);
        const bezet = findBookingWithId(updatedData.bookings, newId);
        if (bezet) return idTakenError(newId, bezet);
    } else {
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const safeNamePart = guestName.split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase();
        newId = `${safeNamePart}-${randomSuffix}`;
    }

    updatedData.bookings.push({
        id: newId,
        guestName,
        checkIn,
        checkOut,
        language,
    });

    const res = await saveToKV(updatedData);
    if (res.success) await schoonmaakBijwerken(updatedData.bookings);
    return res;
}

export async function updateBooking(id: string, checkIn: string, checkOut: string, language: string, bookingNumber?: string) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    if (!updatedData.bookings) return { success: false, error: "Geen boekingen gevonden." };

    let newId: string | null = null;
    if (bookingNumber && bookingNumber.trim() && normalizeBookingId(bookingNumber) !== id.toUpperCase()) {
        newId = normalizeBookingId(bookingNumber);
        const bezet = findBookingWithId(updatedData.bookings, newId, id);
        if (bezet) return idTakenError(newId, bezet);
    }

    updatedData.bookings = updatedData.bookings.map((b: any) => {
        if (b.id !== id) return b;
        const updated = { ...b, checkIn, checkOut, language };
        if (newId) updated.id = newId;
        delete updated.aliases;
        return updated;
    });

    const res = await saveToKV(updatedData);
    if (res.success) {
        if (newId) await hernoemBoekingInBeurten(id, newId).catch(e => console.error("Beurten hernoemen mislukt:", e));
        await schoonmaakBijwerken(updatedData.bookings);
    }
    return res;
}

export async function removeBooking(id: string) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    if (!updatedData.bookings) return { success: false, error: "Geen boekingen gevonden." };

    if (updatedData.bookings.some((b: any) => b.id === id && b.isTest)) {
        return { success: false, error: "De testboeking kan niet worden verwijderd." };
    }

    updatedData.bookings = updatedData.bookings.filter((b: any) => b.id !== id);

    const res = await saveToKV(updatedData);
    if (res.success) await schoonmaakBijwerken(updatedData.bookings);
    return res;
}

export async function updateGames(newGames: any[]) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    updatedData.games = newGames;
    return await saveToKV(updatedData);
}

export async function updateTranslations(translations: Record<string, any>) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    updatedData.translations = translations;
    return await saveToKV(updatedData);
}

// Per taal opslaan, zodat een mislukte taal de bestaande vertalingen niet wist.
export async function updateTranslationsVoorTaal(code: string, vertaling: any) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    updatedData.translations = { ...(updatedData.translations || {}), [code]: vertaling };
    return await saveToKV(updatedData);
}

// ---------- Nachtregistratie ----------

export async function adminUpdateNachtregistratie(bookingId: string, registratie: any) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    if (!updatedData.bookings) return { success: false, error: "Geen boekingen gevonden." };
    const booking = updatedData.bookings.find((b: any) => b.id === bookingId);
    if (!booking) return { success: false, error: "Boeking niet gevonden." };

    updatedData.bookings = updatedData.bookings.map((b: any) =>
        b.id === bookingId ? { ...b, nachtregistratie: { ...registratie } } : b
    );

    return await saveToKV(updatedData);
}

export async function verstuurNachtregistratie(bookingId: string, registratie: any) {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    const booking = updatedData.bookings?.find((b: any) => b.id === bookingId);
    if (!booking) return { success: false, error: "Boeking niet gevonden." };

    const property = updatedData.property || {};
    const campingEmail = property.campingEmail;
    if (!campingEmail) return { success: false, error: "Geen camping-e-mailadres ingesteld (zie sectie Algemene Informatie)." };

    const settings = {
        verhuurderNaam: property.name || "",
        verhuurderTelefoon: property.host?.phone || "",
        staanplaats: property.staanplaats || "",
        campingEmail,
    };

    try {
        const { vulNachtregistratiePdf } = await import("../utils/nachtregistratiePdf");
        const { verstuurNachtregistratieMail } = await import("../utils/mailer");

        const verzonden = {
            ...registratie,
            status: 'verstuurd',
            verstuurdOp: new Date().toISOString(),
        };

        const pdf = await vulNachtregistratiePdf(verzonden, settings);
        await verstuurNachtregistratieMail(campingEmail, verzonden, pdf);

        updatedData.bookings = updatedData.bookings.map((b: any) =>
            b.id === bookingId ? { ...b, nachtregistratie: verzonden } : b
        );
        return await saveToKV(updatedData);
    } catch (error: any) {
        console.error("Nachtregistratie verzendfout:", error);
        return { success: false, error: "Verzenden mislukt: " + (error.message || "onbekende fout") };
    }
}
