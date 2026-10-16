import { headers } from "next/headers";
import { verstuurSchoonmaakMail } from "./mailer";
import { leesSchoonmakers, synchroniseerBeurten } from "./schoonmaakStore";
import type { Beurt, BeurtMetContext, SchoonmaakInstellingen, Schoonmaker } from "./schoonmaakTypes";
import { datumLang } from "./schoonmaakTypes";

// Geen "use server": deze functies mogen alleen vanuit andere servercode worden aangeroepen.

async function basisUrl(): Promise<string> {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "webapp.veluwedroomchalet.nl";
    const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`;
}

export async function portaalLink(s: { linkCode: string }): Promise<string> {
    return `${await basisUrl()}/schoonmaak/${s.linkCode}`;
}

function beurtRegels(beurt: Beurt, vertrektijd: string, volgendeAankomst?: string): string[] {
    return [
        `Datum: ${datumLang(beurt.datum)}`,
        beurt.bookingId ? `Gast vertrekt: ${beurt.vertrektijd || vertrektijd}` : `Wat: ${beurt.omschrijving || "schoonmaak"}`,
        volgendeAankomst ? `Volgende gast komt: ${datumLang(volgendeAankomst)}` : "",
        beurt.berichtAanSchoonmaker ? `Bericht van Kitty: ${beurt.berichtAanSchoonmaker}` : "",
    ].filter(Boolean);
}

export async function mailVeilig(fn: () => Promise<void>, wat: string, waarschuwingen: string[]) {
    try {
        await fn();
    } catch (e: any) {
        console.error(`Schoonmaakmail mislukt (${wat}):`, e);
        waarschuwingen.push(`mail ${wat} niet verstuurd`);
    }
}

export async function mailToegewezen(s: Schoonmaker, beurt: Beurt, ctx: BeurtMetContext, inst: SchoonmaakInstellingen) {
    await verstuurSchoonmaakMail(s.email, `Schoonmaak ${datumLang(beurt.datum)}`, [
        `Hoi ${s.naam},`, ``,
        `Kitty heeft je een schoonmaakbeurt toegewezen.`, ``,
        ...beurtRegels(beurt, inst.vertrektijd, ctx.volgendeAankomst), ``,
        `Accepteren of afkeuren doe je op je eigen pagina:`,
        await portaalLink(s), ``,
        `Groet,`, `Kitty`,
    ].join("\n"));
}

export async function mailIngetrokken(s: Schoonmaker, beurt: Beurt) {
    await verstuurSchoonmaakMail(s.email, `Schoonmaak ${datumLang(beurt.datum)} gaat niet door`, [
        `Hoi ${s.naam},`, ``,
        `De schoonmaakbeurt van ${datumLang(beurt.datum)} staat niet meer op jouw naam.`,
        `Je hoeft hiervoor niets te doen.`, ``,
        `Groet,`, `Kitty`,
    ].join("\n"));
}

export async function mailVerplaatst(s: Schoonmaker, beurt: Beurt, oudeDatum: string) {
    await verstuurSchoonmaakMail(s.email, `Schoonmaak verplaatst naar ${datumLang(beurt.datum)}`, [
        `Hoi ${s.naam},`, ``,
        `De schoonmaakbeurt van ${datumLang(oudeDatum)} is verplaatst naar ${datumLang(beurt.datum)}.`, ``,
        `Kun je dan niet, keur hem dan af op je eigen pagina:`,
        await portaalLink(s), ``,
        `Groet,`, `Kitty`,
    ].join("\n"));
}

export async function verstuurVerplaatstMails(verschoven: Beurt[], schoonmakers: Schoonmaker[]) {
    const waarschuwingen: string[] = [];
    for (const beurt of verschoven) {
        const s = schoonmakers.find(x => x.id === beurt.schoonmakerId);
        const oud = beurt.historie.at(-1)?.toelichting?.split(" → ")[0];
        if (s && oud) await mailVeilig(() => mailVerplaatst(s, beurt, oud), "verplaatsing", waarschuwingen);
    }
}

// Na het wijzigen van boekingen: beurten bijwerken en wie verplaatst is een mail sturen.
export async function synchroniseerNaBoekingen(bookings: any[]) {
    const verschoven = await synchroniseerBeurten(bookings);
    if (verschoven.length) await verstuurVerplaatstMails(verschoven, await leesSchoonmakers());
}

export async function mailAfgekeurd(naar: string, s: Schoonmaker, beurt: Beurt, gastNaam: string | undefined, reden: string) {
    await verstuurSchoonmaakMail(naar, `${s.naam} kan niet op ${datumLang(beurt.datum)}`, [
        `${s.naam} heeft de schoonmaakbeurt van ${datumLang(beurt.datum)} afgekeurd.`, ``,
        `Reden: ${reden}`,
        gastNaam ? `Vertrek van: ${gastNaam}` : `Beurt: ${beurt.omschrijving || "losse schoonmaak"}`, ``,
        `Wijs in beheer iemand anders toe:`,
        `${await basisUrl()}/beheer-vlp-x9q2w`,
    ].join("\n"));
}

export async function mailTochGeaccepteerd(naar: string, s: Schoonmaker, beurt: Beurt, gastNaam: string | undefined) {
    await verstuurSchoonmaakMail(naar, `${s.naam} kan toch op ${datumLang(beurt.datum)}`, [
        `${s.naam} had de schoonmaakbeurt van ${datumLang(beurt.datum)} afgekeurd, maar heeft hem nu toch geaccepteerd.`,
        `De beurt staat weer op haar naam. Je hoeft niemand anders te zoeken.`, ``,
        gastNaam ? `Vertrek van: ${gastNaam}` : `Beurt: ${beurt.omschrijving || "losse schoonmaak"}`, ``,
        `${await basisUrl()}/beheer-vlp-x9q2w`,
    ].join("\n"));
}

export async function mailGeaccepteerd(naar: string, s: Schoonmaker, beurt: Beurt, gastNaam: string | undefined) {
    await verstuurSchoonmaakMail(naar, `${s.naam} komt op ${datumLang(beurt.datum)}`, [
        `${s.naam} heeft de schoonmaakbeurt van ${datumLang(beurt.datum)} geaccepteerd.`, ``,
        gastNaam ? `Vertrek van: ${gastNaam}` : `Beurt: ${beurt.omschrijving || "losse schoonmaak"}`, ``,
        `${await basisUrl()}/beheer-vlp-x9q2w`,
    ].join("\n"));
}

export async function mailVervallen(s: Schoonmaker, beurt: Beurt) {
    await verstuurSchoonmaakMail(s.email, `Schoonmaak ${datumLang(beurt.datum)} vervalt`, [
        `Hoi ${s.naam},`, ``,
        `De schoonmaakbeurt van ${datumLang(beurt.datum)} gaat niet door. Er is die dag geen schoonmaak nodig.`,
        beurt.omschrijving ? `Het ging om: ${beurt.omschrijving}` : ``,
        `Je hoeft hiervoor niets te doen. De beurt staat niet meer op je pagina.`, ``,
        `Groet,`, `Kitty`,
    ].filter((r, i, a) => !(r === `` && a[i - 1] === ``)).join("\n"));
}
