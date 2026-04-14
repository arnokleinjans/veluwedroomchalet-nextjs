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

// Securely fetch data for client-side Admin Panel (always fresh)
export async function fetchAdminData() {
    return await getAppDataFresh();
}

// Batched save: General info + header image in ONE write instead of TWO
export async function updateGeneralInfo(name: string, hostName: string, phone: string, subtitle: string, headerImage: string, keyCode: string = "") {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    updatedData.property.name = name;
    updatedData.property.subtitle = subtitle;
    updatedData.property.host.name = hostName;
    updatedData.property.host.phone = phone;
    updatedData.property.headerImage = headerImage;
    (updatedData.property as any).keyCode = keyCode;

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

export async function addBooking(guestName: string, checkIn: string, checkOut: string, language: string = "nl") {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const safeNamePart = guestName.split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase();
    const newId = `${safeNamePart}-${randomSuffix}`;

    if (!updatedData.bookings) {
        updatedData.bookings = [];
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

export async function updateBooking(id: string, checkIn: string, checkOut: string, language: string) {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    if (!updatedData.bookings) return { success: false, error: "Geen boekingen gevonden." };

    updatedData.bookings = updatedData.bookings.map((b: any) =>
        b.id === id ? { ...b, checkIn, checkOut, language } : b
    );

    return await saveToKV(updatedData);
}

export async function removeBooking(id: string) {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData };

    if (!updatedData.bookings) return { success: false, error: "Geen boekingen gevonden." };

    updatedData.bookings = updatedData.bookings.filter((b: any) => b.id !== id);

    return await saveToKV(updatedData);
}

export async function updateTranslations(translations: { en: any, de: any }) {
    noStore();
    const appData = await getAppDataFresh();
    const updatedData = { ...appData } as any;

    updatedData.translations = translations;
    return await saveToKV(updatedData);
}
