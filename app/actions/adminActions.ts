"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { getKV, getAppDataFresh, invalidateCache } from "../utils/db";

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

export async function verifyAdminPin(pin: string): Promise<boolean> {
    const adminPin = process.env.ADMIN_PIN;
    if (!adminPin) throw new Error("ADMIN_PIN is niet geconfigureerd");
    return pin === adminPin;
}

// Securely fetch data for client-side Admin Panel (always fresh)
export async function fetchAdminData() {
    return await getAppDataFresh();
}

// Batched save: General info + header image in ONE write instead of TWO
export async function updateGeneralInfo(name: string, hostName: string, phone: string, subtitle: string, headerImage: string, keyCode: string = "", staanplaats: string = "", campingEmail: string = "") {
    noStore();
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
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    updatedData.expiredPageContent = content;
    return await saveToKV(updatedData);
}

// Keep individual functions for backward compatibility
export async function updatePropertyInfo(name: string, hostName: string, phone: string, subtitle: string) {
    noStore();
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
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    updatedData.property.headerImage = headerImage;
    return await saveToKV(updatedData);
}

export async function updateInsights(newInsights: any[]) {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    updatedData.insights = newInsights;
    return await saveToKV(updatedData);
}

export async function updateVideos(newVideos: any[]) {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    updatedData.videos = newVideos;
    return await saveToKV(updatedData);
}

// Batched save: Omgeving + AI settings in ONE write
export async function updateOmgevingWithAi(newOmgeving: any[], aiPrompt: string, aiMaxChars: number) {
    noStore();
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
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    updatedData.omgeving = newOmgeving;
    return await saveToKV(updatedData);
}

export async function updateChatbotContext(context: string) {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    updatedData.chatbotContext = context;
    return await saveToKV(updatedData);
}

export async function updateAiSettings(aiPrompt: string, aiMaxChars: number) {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    updatedData.aiPrompt = aiPrompt;
    updatedData.aiMaxChars = aiMaxChars;
    return await saveToKV(updatedData);
}

function normalizeBookingId(raw: string): string {
    return raw.trim().toUpperCase();
}

function isBookingIdTaken(bookings: any[], id: string, excludeId?: string): boolean {
    return bookings.some((b: any) => {
        if (excludeId && b.id === excludeId) return false;
        return b.id?.toUpperCase() === id;
    });
}

export async function addBooking(guestName: string, checkIn: string, checkOut: string, language: string = "nl", bookingNumber?: string) {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    if (!updatedData.bookings) {
        updatedData.bookings = [];
    }

    let newId: string;
    if (bookingNumber && bookingNumber.trim()) {
        newId = normalizeBookingId(bookingNumber);
        if (isBookingIdTaken(updatedData.bookings, newId)) {
            return { success: false, error: `Boekingsnummer ${newId} is al in gebruik.` };
        }
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

    return await saveToKV(updatedData);
}

export async function updateBooking(id: string, checkIn: string, checkOut: string, language: string, bookingNumber?: string) {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    if (!updatedData.bookings) return { success: false, error: "Geen boekingen gevonden." };

    let newId: string | null = null;
    if (bookingNumber && bookingNumber.trim() && normalizeBookingId(bookingNumber) !== id.toUpperCase()) {
        newId = normalizeBookingId(bookingNumber);
        if (isBookingIdTaken(updatedData.bookings, newId, id)) {
            return { success: false, error: `Boekingsnummer ${newId} is al in gebruik.` };
        }
    }

    updatedData.bookings = updatedData.bookings.map((b: any) => {
        if (b.id !== id) return b;
        const updated = { ...b, checkIn, checkOut, language };
        if (newId) updated.id = newId;
        delete updated.aliases;
        return updated;
    });

    return await saveToKV(updatedData);
}

export async function removeBooking(id: string) {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    if (!updatedData.bookings) return { success: false, error: "Geen boekingen gevonden." };

    if (updatedData.bookings.some((b: any) => b.id === id && b.isTest)) {
        return { success: false, error: "De testboeking kan niet worden verwijderd." };
    }

    updatedData.bookings = updatedData.bookings.filter((b: any) => b.id !== id);

    return await saveToKV(updatedData);
}

export async function updateGames(newGames: any[]) {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    updatedData.games = newGames;
    return await saveToKV(updatedData);
}

export async function updateTranslations(translations: Record<string, any>) {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    updatedData.translations = translations;
    return await saveToKV(updatedData);
}

// Per taal opslaan, zodat een mislukte taal de bestaande vertalingen niet wist.
export async function updateTranslationsVoorTaal(code: string, vertaling: any) {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    updatedData.translations = { ...(updatedData.translations || {}), [code]: vertaling };
    return await saveToKV(updatedData);
}

// ---------- Nachtregistratie ----------

export async function adminUpdateNachtregistratie(bookingId: string, registratie: any) {
    noStore();
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
