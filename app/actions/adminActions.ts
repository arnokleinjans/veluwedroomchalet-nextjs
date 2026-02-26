"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";

const dataFilePath = path.join(process.cwd(), "app", "utils", "mockData.ts");

// Helper to write the appData object back to the TypeScript file
async function saveToFile(newData: any) {
    try {
        const fileContent = `export const appData = ${JSON.stringify(newData, null, 4)};\n`;
        await fs.writeFile(dataFilePath, fileContent, "utf8");
        // Instruct Next.js to clear cache for the entire site
        revalidatePath("/", "layout");
        return { success: true };
    } catch (error) {
        console.error("Fout bij opslaan van data:", error);
        return { success: false, error: "Kon data niet opslaan. Let op: dit werkt mogelijk niet in productie op Vercel (read-only filesystem)." };
    }
}

export async function updatePropertyInfo(name: string, hostName: string, phone: string) {
    const { appData } = await import("../utils/mockData");
    const updatedData = { ...appData };

    updatedData.property.name = name;
    updatedData.property.host.name = hostName;
    updatedData.property.host.phone = phone;

    return await saveToFile(updatedData);
}

export async function updateWifi(network: string, pass: string) {
    const { appData } = await import("../utils/mockData");
    const updatedData = { ...appData };

    updatedData.property.wifi.network = network;
    updatedData.property.wifi.password = pass;

    return await saveToFile(updatedData);
}

export async function updateRules(newRules: { title: string, desc: string }[]) {
    const { appData } = await import("../utils/mockData");
    const updatedData = { ...appData };

    updatedData.rules = newRules;

    return await saveToFile(updatedData);
}

// Nieuwe functionaliteit voor Gepersonaliseerde Gasten Links

export async function addBooking(guestName: string, checkIn: string, checkOut: string) {
    const { appData } = await import("../utils/mockData");
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
    const { appData } = await import("../utils/mockData");
    const updatedData = { ...appData };

    if (!updatedData.bookings) return { success: false, error: "Geen boekingen gevonden." };

    updatedData.bookings = updatedData.bookings.filter(b => b.id !== id);

    return await saveToFile(updatedData);
}
