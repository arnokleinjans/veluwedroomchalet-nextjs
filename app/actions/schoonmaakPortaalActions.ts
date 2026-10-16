"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getAppDataFresh } from "../utils/db";
import {
    sessieVanSchoonmaker, pogingToegestaan, registreerMislukt, schoonmaakCookie,
    startSchoonmakerSessie, stopSessie, wisPogingen,
} from "../utils/sessie";
import {
    alleBeurten, bewaarBeurt, leesBeurt, leesInstellingen, pinKlopt, regel,
    vandaag, verrijk, vindSchoonmakerOpCode, voorSchoonmaker,
} from "../utils/schoonmaakStore";
import { mailAfgekeurd, mailVeilig } from "../utils/schoonmaakMail";
import type { BeurtVoorSchoonmaker, Schoonmaker } from "../utils/schoonmaakTypes";

type Resultaat = { success: boolean; error?: string };

// De ingelogde schoonmaakster, maar alleen als de sessie bij deze link hoort en nog geldig is.
async function ingelogdeSchoonmaker(code: string): Promise<Schoonmaker | null> {
    const s = await vindSchoonmakerOpCode(code);
    if (!s || !s.actief) return null;
    const sessie = await sessieVanSchoonmaker(s.id);
    if (!sessie || s.pinVersie !== sessie.v) return null;
    return s;
}

export async function loginSchoonmaker(code: string, pin: string): Promise<Resultaat> {
    noStore();
    const soort = `schoonmaak:${code}`;
    if (!(await pogingToegestaan(soort))) return { success: false, error: "Te veel pogingen. Probeer het over een kwartier opnieuw." };
    const s = await vindSchoonmakerOpCode(code);
    if (!s || !s.actief || !pinKlopt(String(pin).trim(), s.pinHash)) {
        await registreerMislukt(soort);
        return { success: false, error: "Deze pincode klopt niet." };
    }
    await wisPogingen(soort);
    await startSchoonmakerSessie(s.id, s.pinVersie);
    return { success: true };
}

export async function logoutSchoonmaker(code: string) {
    const s = await vindSchoonmakerOpCode(code);
    if (s) await stopSessie(schoonmaakCookie(s.id));
}

export async function haalMijnBeurten(code: string): Promise<{ naam: string; komend: BeurtVoorSchoonmaker[]; afgelopen: BeurtVoorSchoonmaker[] } | null> {
    noStore();
    const s = await ingelogdeSchoonmaker(code);
    if (!s) return null;
    const appData: any = await getAppDataFresh();
    const bookings = appData.bookings || [];
    const inst = await leesInstellingen();
    const grens = vandaag();
    const terug = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

    const mijn = (await alleBeurten())
        .filter(b => b.schoonmakerId === s.id && b.status !== "vervallen")
        .map(b => voorSchoonmaker(verrijk(b, bookings), inst));

    return {
        naam: s.naam,
        komend: mijn.filter(b => b.datum >= grens),
        afgelopen: mijn.filter(b => b.datum < grens && b.datum >= terug).reverse(),
    };
}

export async function reageerOpBeurt(
    code: string,
    beurtId: string,
    actie: "accepteren" | "afkeuren" | "uitgevoerd" | "opmerking",
    tekst?: string,
): Promise<Resultaat & { waarschuwing?: string }> {
    noStore();
    const s = await ingelogdeSchoonmaker(code);
    if (!s) return { success: false, error: "Je bent niet meer ingelogd. Ververs de pagina." };
    const beurt = await leesBeurt(beurtId);
    if (!beurt || beurt.schoonmakerId !== s.id || beurt.status === "vervallen") {
        return { success: false, error: "Deze beurt staat niet (meer) op jouw naam. Ververs de pagina." };
    }
    const toelichting = (tekst || "").trim().slice(0, 1000);
    const waarschuwingen: string[] = [];

    if (actie === "accepteren") {
        if (beurt.status !== "toegewezen" && beurt.status !== "afgekeurd") return { success: false, error: "Deze beurt kan niet meer worden geaccepteerd." };
        beurt.status = "geaccepteerd";
        beurt.redenAfkeuring = undefined;
        beurt.historie.push(regel("geaccepteerd", s.id));
    } else if (actie === "afkeuren") {
        if (beurt.status !== "toegewezen" && beurt.status !== "geaccepteerd") return { success: false, error: "Deze beurt kan niet meer worden afgekeurd." };
        if (!toelichting) return { success: false, error: "Geef een reden op, dan weet Kitty waar ze aan toe is." };
        beurt.status = "afgekeurd";
        beurt.redenAfkeuring = toelichting;
        beurt.historie.push(regel("afgekeurd", s.id, toelichting));
    } else if (actie === "uitgevoerd") {
        if (beurt.status !== "geaccepteerd" && beurt.status !== "toegewezen") return { success: false, error: "Accepteer de beurt eerst." };
        beurt.status = "uitgevoerd";
        if (toelichting) beurt.opmerkingSchoonmaker = toelichting;
        beurt.historie.push(regel("uitgevoerd", s.id));
    } else if (actie === "opmerking") {
        if (beurt.status === "uitgevoerd") return { success: false, error: "Deze beurt is al afgerond. De opmerking kan niet meer worden aangepast." };
        beurt.opmerkingSchoonmaker = toelichting || undefined;
        beurt.historie.push(regel(toelichting ? "opmerking geplaatst" : "opmerking gewist", s.id, toelichting || undefined));
    } else {
        return { success: false, error: "Onbekende actie." };
    }

    await bewaarBeurt(beurt);

    if (actie === "afkeuren") {
        const appData: any = await getAppDataFresh();
        const boeking = (appData.bookings || []).find((b: any) => b.id === beurt.bookingId);
        const inst = await leesInstellingen();
        await mailVeilig(() => mailAfgekeurd(inst.meldingEmail, s, beurt, boeking?.guestName, toelichting), "aan Kitty", waarschuwingen);
    }
    return { success: true, waarschuwing: waarschuwingen.length ? "Kitty kon niet worden gemaild. Laat het haar even weten." : undefined };
}
