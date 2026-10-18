"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getAppDataFresh } from "../utils/db";
import { isBeheer, NIET_INGELOGD } from "../utils/sessie";
import {
    alleBeurten, bewaarBeurt, bewaarInstellingen, bewaarSchoonmakers, hashPin, leesBeurt,
    leesInstellingen, leesSchoonmakers, nieuweId, nieuweLinkCode, nieuwePin, regel,
    synchroniseerBeurten, vandaag, verrijk, verwijderBeurt, zonderPin,
} from "../utils/schoonmaakStore";
import type { Beurt, BeurtMetContext, BeurtStatus, SchoonmaakInstellingen, Schoonmaker, SchoonmakerPubliek } from "../utils/schoonmaakTypes";
import { mailToegewezen, mailIngetrokken, mailVerplaatst, mailVervallen, mailVeilig, portaalLink, verstuurVerplaatstMails } from "../utils/schoonmaakMail";

type Resultaat = { success: boolean; error?: string; waarschuwing?: string };

// ---------- Ophalen ----------

export async function haalSchoonmaakData(): Promise<{
    beurten: BeurtMetContext[];
    schoonmakers: SchoonmakerPubliek[];
    instellingen: SchoonmaakInstellingen;
    boekingen: { id: string; guestName: string; checkIn: string; checkOut: string; isTest?: boolean }[];
}> {
    noStore();
    if (!(await isBeheer())) throw new Error("Niet ingelogd");
    const appData: any = await getAppDataFresh();
    const bookings = appData.bookings || [];
    const schoonmakers = await leesSchoonmakers();
    const verschoven = await synchroniseerBeurten(bookings);
    await verstuurVerplaatstMails(verschoven, schoonmakers);
    return {
        beurten: (await alleBeurten()).map(b => verrijk(b, bookings)),
        schoonmakers: schoonmakers.map(zonderPin),
        instellingen: await leesInstellingen(),
        boekingen: bookings.map((b: any) => ({ id: b.id, guestName: b.guestName, checkIn: b.checkIn, checkOut: b.checkOut, isTest: !!b.isTest })),
    };
}

// ---------- Instellingen ----------

export async function bewaarSchoonmaakInstellingen(inst: SchoonmaakInstellingen): Promise<Resultaat> {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    if (!/^\d{1,2}:\d{2}$/.test(inst.vertrektijd)) return { success: false, error: "Vul een vertrektijd in als 11:00." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inst.meldingEmail)) return { success: false, error: "Vul een geldig e-mailadres in voor meldingen." };
    await bewaarInstellingen({ vertrektijd: inst.vertrektijd, meldingEmail: inst.meldingEmail.trim() });
    return { success: true };
}

// ---------- Schoonmaaksters ----------

export async function bewaarSchoonmaker(invoer: { id?: string; naam: string; email: string; telefoon: string; tarief: number; actief: boolean }): Promise<Resultaat & { pin?: string; link?: string }> {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const naam = invoer.naam.trim();
    const email = invoer.email.trim();
    if (!naam) return { success: false, error: "Vul een naam in." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: "Vul een geldig e-mailadres in." };
    const tarief = Number(invoer.tarief);
    if (!(tarief >= 0)) return { success: false, error: "Vul een geldig tarief in." };

    const lijst = await leesSchoonmakers();
    if (invoer.id) {
        const s = lijst.find(x => x.id === invoer.id);
        if (!s) return { success: false, error: "Schoonmaakster niet gevonden." };
        Object.assign(s, { naam, email, telefoon: invoer.telefoon.trim(), tarief, actief: invoer.actief });
        await bewaarSchoonmakers(lijst);
        return { success: true };
    }

    const pin = nieuwePin();
    const nieuw: Schoonmaker = {
        id: nieuweId(), naam, email, telefoon: invoer.telefoon.trim(), tarief, actief: true,
        linkCode: nieuweLinkCode(), pinHash: hashPin(pin), pinVersie: 1,
    };
    await bewaarSchoonmakers([...lijst, nieuw]);
    return { success: true, pin, link: await portaalLink(nieuw) };
}

export async function maakNieuwePin(id: string): Promise<Resultaat & { pin?: string; link?: string }> {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const lijst = await leesSchoonmakers();
    const s = lijst.find(x => x.id === id);
    if (!s) return { success: false, error: "Schoonmaakster niet gevonden." };
    const pin = nieuwePin();
    s.pinHash = hashPin(pin);
    s.pinVersie = (s.pinVersie || 1) + 1;
    await bewaarSchoonmakers(lijst);
    return { success: true, pin, link: await portaalLink(s) };
}

export async function haalPortaalLink(id: string): Promise<string | null> {
    if (!(await isBeheer())) return null;
    const s = (await leesSchoonmakers()).find(x => x.id === id);
    return s ? await portaalLink(s) : null;
}

// ---------- Beurten ----------

export type BeurtInvoer = {
    id?: string;
    bookingId?: string;
    omschrijving?: string;
    datum: string;
    vertrektijd?: string;
    schoonmakerId?: string;
    bedrag?: number | null;
    betaald: boolean;
    betaaldOp?: string;
    status?: BeurtStatus;
    berichtAanSchoonmaker?: string;
};

export async function bewaarBeurtActie(invoer: BeurtInvoer): Promise<Resultaat> {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoer.datum || "")) return { success: false, error: "Vul een datum in." };
    if (invoer.vertrektijd && !/^\d{1,2}:\d{2}$/.test(invoer.vertrektijd)) return { success: false, error: "Vul de vertrektijd in als 11:00." };

    const appData: any = await getAppDataFresh();
    const bookings = appData.bookings || [];
    const schoonmakers = await leesSchoonmakers();
    const inst = await leesInstellingen();
    const waarschuwingen: string[] = [];
    // Een beurt in het verleden wordt achteraf bijgewerkt: geen mails, en een andere schoonmaakster zet de status niet terug.
    const verleden = invoer.datum < vandaag();
    const nieuweSchoonmaker = invoer.schoonmakerId ? schoonmakers.find(s => s.id === invoer.schoonmakerId) : undefined;
    if (invoer.schoonmakerId && !nieuweSchoonmaker) return { success: false, error: "Schoonmaakster niet gevonden." };
    const bedrag = invoer.bedrag === null || invoer.bedrag === undefined || isNaN(Number(invoer.bedrag)) ? undefined : Number(invoer.bedrag);

    const bestaand = invoer.id ? await leesBeurt(invoer.id) : null;
    if (invoer.id && !bestaand) return { success: false, error: "Beurt niet gevonden. Ververs de pagina." };

    if (!bestaand) {
        if (!invoer.bookingId && !invoer.omschrijving?.trim()) return { success: false, error: "Vul een omschrijving in, bijvoorbeeld \"Grote schoonmaak\"." };
        const beurt: Beurt = {
            id: nieuweId(),
            bookingId: invoer.bookingId || undefined,
            automatisch: false,
            omschrijving: invoer.omschrijving?.trim() || undefined,
            datum: invoer.datum,
            datumHandmatig: true,
            vertrektijd: invoer.vertrektijd || undefined,
            schoonmakerId: nieuweSchoonmaker?.id,
            bedrag,
            betaald: !!invoer.betaald,
            betaaldOp: invoer.betaald ? (invoer.betaaldOp || vandaag()) : undefined,
            status: verleden ? "uitgevoerd" : nieuweSchoonmaker ? "toegewezen" : "open",
            berichtAanSchoonmaker: invoer.berichtAanSchoonmaker?.trim() || undefined,
            historie: [regel(verleden ? "losse beurt achteraf aangemaakt" : "losse beurt aangemaakt")],
            bijgewerkt: "",
        };
        if (nieuweSchoonmaker) beurt.historie.push(regel(verleden ? "schoonmaakster achteraf ingevuld" : "toegewezen", nieuweSchoonmaker.id));
        await bewaarBeurt(beurt);
        if (nieuweSchoonmaker && !verleden) {
            await mailVeilig(beurt, "Toewijzing", nieuweSchoonmaker.email, () => mailToegewezen(nieuweSchoonmaker, beurt, verrijk(beurt, bookings), inst), waarschuwingen);
            await bewaarBeurt(beurt);
        }
        return { success: true, waarschuwing: waarschuwingen.join(", ") || undefined };
    }

    const beurt = bestaand;
    const oudeDatum = beurt.datum;
    const oudeSchoonmaker = beurt.schoonmakerId ? schoonmakers.find(s => s.id === beurt.schoonmakerId) : undefined;
    const oudeStatus = beurt.status;

    if (!beurt.automatisch) {
        beurt.bookingId = invoer.bookingId || undefined;
        beurt.omschrijving = invoer.omschrijving?.trim() || undefined;
        if (!beurt.bookingId && !beurt.omschrijving) return { success: false, error: "Vul een omschrijving in." };
    }

    if (invoer.datum !== oudeDatum) {
        beurt.datum = invoer.datum;
        beurt.historie.push(regel("datum aangepast", undefined, `${oudeDatum} → ${invoer.datum}`));
    }
    if (beurt.automatisch) {
        const boeking = bookings.find((b: any) => b.id === beurt.bookingId);
        beurt.datumHandmatig = !!boeking && beurt.datum !== boeking.checkOut;
    }

    beurt.vertrektijd = invoer.vertrektijd || undefined;
    beurt.bedrag = bedrag;
    beurt.berichtAanSchoonmaker = invoer.berichtAanSchoonmaker?.trim() || undefined;

    if (!!invoer.betaald !== beurt.betaald) {
        beurt.betaald = !!invoer.betaald;
        beurt.historie.push(regel(beurt.betaald ? "betaald" : "betaling teruggedraaid"));
    }
    beurt.betaaldOp = beurt.betaald ? (invoer.betaaldOp || beurt.betaaldOp || vandaag()) : undefined;

    const andereSchoonmaker = (invoer.schoonmakerId || undefined) !== (beurt.schoonmakerId || undefined);
    if (andereSchoonmaker) {
        if (oudeSchoonmaker && !verleden && (oudeStatus === "toegewezen" || oudeStatus === "geaccepteerd")) {
            beurt.historie.push(regel("ingetrokken", oudeSchoonmaker.id));
            await mailVeilig(beurt, "Intrekking", oudeSchoonmaker.email, () => mailIngetrokken(oudeSchoonmaker, beurt), waarschuwingen);
        }
        if (beurt.opmerkingSchoonmaker) beurt.historie.push(regel("opmerking vorige schoonmaakster", beurt.schoonmakerId, beurt.opmerkingSchoonmaker));
        beurt.opmerkingSchoonmaker = undefined;
        beurt.redenAfkeuring = undefined;
        beurt.schoonmakerId = nieuweSchoonmaker?.id;
        if (verleden) {
            if (invoer.status && invoer.status !== beurt.status) beurt.status = invoer.status;
            beurt.historie.push(regel(nieuweSchoonmaker ? "schoonmaakster achteraf ingevuld" : "schoonmaakster weggehaald", nieuweSchoonmaker?.id));
        } else {
            beurt.status = nieuweSchoonmaker ? "toegewezen" : "open";
            beurt.historie.push(regel(nieuweSchoonmaker ? "toegewezen" : "niemand toegewezen", nieuweSchoonmaker?.id));
        }
    } else if (invoer.status && invoer.status !== beurt.status) {
        beurt.status = invoer.status;
        beurt.historie.push(regel(`status door Kitty op ${invoer.status} gezet`));
    }

    await bewaarBeurt(beurt);

    const wasActief = oudeStatus === "toegewezen" || oudeStatus === "geaccepteerd";
    const aantalRegels = beurt.historie.length;
    if (!verleden && andereSchoonmaker && nieuweSchoonmaker) {
        await mailVeilig(beurt, "Toewijzing", nieuweSchoonmaker.email, () => mailToegewezen(nieuweSchoonmaker, beurt, verrijk(beurt, bookings), inst), waarschuwingen);
    } else if (!verleden && !andereSchoonmaker && oudeSchoonmaker && wasActief && beurt.status === "vervallen") {
        await mailVeilig(beurt, "Vervalbericht", oudeSchoonmaker.email, () => mailVervallen(oudeSchoonmaker, beurt), waarschuwingen);
    } else if (!verleden && !andereSchoonmaker && oudeSchoonmaker && oudeStatus === "vervallen" && beurt.status === "toegewezen") {
        await mailVeilig(beurt, "Toewijzing", oudeSchoonmaker.email, () => mailToegewezen(oudeSchoonmaker, beurt, verrijk(beurt, bookings), inst), waarschuwingen);
    } else if (!verleden && !andereSchoonmaker && oudeSchoonmaker && beurt.datum !== oudeDatum && (beurt.status === "toegewezen" || beurt.status === "geaccepteerd")) {
        await mailVeilig(beurt, "Verplaatsing", oudeSchoonmaker.email, () => mailVerplaatst(oudeSchoonmaker, beurt, oudeDatum), waarschuwingen);
    }
    if (beurt.historie.length > aantalRegels) await bewaarBeurt(beurt);
    return { success: true, waarschuwing: waarschuwingen.join(", ") || undefined };
}

export async function verwijderBeurtActie(id: string): Promise<Resultaat> {
    noStore();
    if (!(await isBeheer())) return NIET_INGELOGD;
    const beurt = await leesBeurt(id);
    if (!beurt) return { success: true };
    if (beurt.automatisch) {
        const appData: any = await getAppDataFresh();
        if ((appData.bookings || []).some((b: any) => b.id === beurt.bookingId)) {
            return { success: false, error: "Deze beurt hoort bij een boeking. Zet de status op \"Vervallen\" als er geen schoonmaak nodig is." };
        }
    }
    await verwijderBeurt(id);

    const waarschuwingen: string[] = [];
    if (beurt.schoonmakerId && beurt.datum >= vandaag() && (beurt.status === "toegewezen" || beurt.status === "geaccepteerd")) {
        const s = (await leesSchoonmakers()).find(x => x.id === beurt.schoonmakerId);
        if (s) await mailVeilig(null, "Vervalbericht", s.email, () => mailVervallen(s, beurt), waarschuwingen);
    }
    return { success: true, waarschuwing: waarschuwingen.join(", ") || undefined };
}
