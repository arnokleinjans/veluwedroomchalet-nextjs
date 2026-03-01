"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { getKV, getAppData } from "../utils/db";

// Helper to write the appData object back to Vercel KV
async function saveToFile(newData: any) {
    noStore();
    try {
        console.log("Attempting to write to Vercel KV...");
        const kv = getKV();
        await kv.set('veluwe_app_data', newData);
        console.log("Write successful. Revalidating path...");
        // Instruct Next.js to clear cache for the entire site
        revalidatePath("/", "layout");
        return { success: true };
    } catch (error: any) {
        console.error("Vercel KV Write Error DUMP:", error);
        return { success: false, error: "Kon data niet opslaan in de database. " + (error.message || "Onbekende fout.") };
    }
}

// Securely fetch data for client-side Admin Panel
export async function fetchAdminData() {
    noStore();
    return await getAppData();
}

export async function updatePropertyInfo(name: string, hostName: string, phone: string, subtitle: string) {
    noStore();
    const appData = await getAppData();
    const updatedData = { ...appData };

    updatedData.property.name = name;
    updatedData.property.subtitle = subtitle;
    updatedData.property.host.name = hostName;
    updatedData.property.host.phone = phone;

    return await saveToFile(updatedData);
}

// updateWifi removed — WiFi info is now managed as a regular Home item with detailContent

export async function updateRules(newRules: { title: string, desc: string }[]) {
    noStore();
    const appData = await getAppData();
    const updatedData = { ...appData };

    updatedData.rules = newRules;

    return await saveToFile(updatedData);
}

export async function updateHeaderImage(headerImage: string) {
    noStore();
    const appData = await getAppData();
    const updatedData = { ...appData };

    updatedData.property.headerImage = headerImage;
    return await saveToFile(updatedData);
}

export async function updateInsights(newInsights: any[]) {
    noStore();
    const appData = await getAppData();
    const updatedData = { ...appData };

    updatedData.insights = newInsights;
    return await saveToFile(updatedData);
}

export async function updateVideos(newVideos: any[]) {
    noStore();
    const appData = await getAppData();
    const updatedData = { ...appData };

    updatedData.videos = newVideos;
    return await saveToFile(updatedData);
}

export async function updateOmgeving(newOmgeving: any[]) {
    noStore();
    const appData = await getAppData();
    const updatedData = { ...appData };

    updatedData.omgeving = newOmgeving;
    return await saveToFile(updatedData);
}

export async function updateChatbotContext(context: string) {
    noStore();
    const appData = await getAppData();
    const updatedData = { ...appData };

    updatedData.chatbotContext = context;
    return await saveToFile(updatedData);
}

export async function updateAiSettings(aiPrompt: string, aiMaxChars: number) {
    noStore();
    const appData = await getAppData();
    const updatedData = { ...appData } as any;

    updatedData.aiPrompt = aiPrompt;
    updatedData.aiMaxChars = aiMaxChars;
    return await saveToFile(updatedData);
}

// Nieuwe functionaliteit voor Gepersonaliseerde Gasten Links

export async function addBooking(guestName: string, checkIn: string, checkOut: string) {
    noStore();
    const appData = await getAppData();
    const updatedData = { ...appData };

    // Genereer snelle unieke en leesbare ID
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const safeNamePart = guestName.split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase();
    const newId = `${safeNamePart}-${randomSuffix}`;

    if (!updatedData.bookings) {
        updatedData.bookings = [];
    }

    const newBooking = {
        id: newId,
        guestName,
        checkIn,
        checkOut
    };

    updatedData.bookings.push(newBooking);

    return await saveToFile(updatedData);
}

export async function removeBooking(id: string) {
    noStore();
    const appData = await getAppData();
    const updatedData = { ...appData };

    if (!updatedData.bookings) return { success: false, error: "Geen boekingen gevonden." };

    updatedData.bookings = updatedData.bookings.filter(b => b.id !== id);

    return await saveToFile(updatedData);
}
