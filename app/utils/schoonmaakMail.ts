import { headers } from "next/headers";
import { TEST_ONTVANGER, verstuurSchoonmaakMail } from "./mailer";
import { NOG_TE_DOEN, alleBeurten, bewaarBeurt, leesSchoonmakers, regel, synchroniseerBeurten, vandaag } from "./schoonmaakStore";
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

function beurtRegels(beurt: Beurt, vertrektijd: string, volgendeAankomst?: string, personenVolgende?: number): string[] {
    return [
        `Datum: ${datumLang(beurt.datum)}`,
        beurt.bookingId ? `Gast vertrekt: ${beurt.vertrektijd || vertrektijd}` : `Wat: ${beurt.omschrijving || "schoonmaak"}`,
        volgendeAankomst ? `Volgende gast komt: ${datumLang(volgendeAankomst)}${personenVolgende ? ` (${personenVolgende} personen)` : ""}` : "",
        beurt.berichtAanSchoonmaker ? `Bericht van Kitty: ${beurt.berichtAanSchoonmaker}` : "",
    ].filter(Boolean);
}

// Verstuurt een mail zonder dat een fout het opslaan blokkeert, en zet in de geschiedenis van de beurt
// welke mail naar wie ging en of dat lukte. De aanroeper slaat de beurt daarna op.
export async function mailVeilig(beurt: Beurt | null, wat: string, naar: string, fn: () => Promise<void>, waarschuwingen: string[]) {
    const omgeleid = process.env.VERCEL === "1" ? "" : ` (test: omgeleid naar ${TEST_ONTVANGER})`;
    try {
        await fn();
        beurt?.historie.push(regel(`${wat} verstuurd naar ${naar}${omgeleid}`));
    } catch (e: any) {
        console.error(`Schoonmaakmail mislukt (${wat}):`, e);
        waarschuwingen.push(`mail ${wat.toLowerCase()} niet verstuurd`);
        beurt?.historie.push(regel(`${wat} NIET verstuurd naar ${naar}`, undefined, e?.message || "onbekende fout"));
    }
}

export async function mailToegewezen(s: Schoonmaker, beurt: Beurt, ctx: BeurtMetContext, inst: SchoonmaakInstellingen) {
    await verstuurSchoonmaakMail(s.email, `Schoonmaak ${datumLang(beurt.datum)}`, [
        `Hoi ${s.naam},`, ``,
        `Kitty heeft je een schoonmaakbeurt toegewezen.`, ``,
        ...beurtRegels(beurt, inst.vertrektijd, ctx.volgendeAankomst, ctx.personenVolgende), ``,
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
        if (s && oud) {
            await mailVeilig(beurt, "Verplaatsing", s.email, () => mailVerplaatst(s, beurt, oud), waarschuwingen);
            await bewaarBeurt(beurt);
        }
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

// Bij het verwijderen van een boeking: beurten die nog niet gedaan zijn vervallen, en wie er al op stond krijgt bericht.
// Een uitgevoerde beurt blijft staan: die schoonmaak is gedaan en telt mee in de totalen.
export async function vervalBeurtenVanBoeking(bookingId: string) {
    const schoonmakers = await leesSchoonmakers();
    const waarschuwingen: string[] = [];
    for (const beurt of await alleBeurten()) {
        if (beurt.bookingId !== bookingId || !NOG_TE_DOEN.includes(beurt.status)) continue;
        const wasActief = beurt.status === "toegewezen" || beurt.status === "geaccepteerd";
        beurt.status = "vervallen";
        beurt.historie.push(regel("vervallen: boeking verwijderd"));
        const s = schoonmakers.find(x => x.id === beurt.schoonmakerId);
        if (s && wasActief && beurt.datum >= vandaag()) {
            await mailVeilig(beurt, "Vervalbericht", s.email, () => mailVervallen(s, beurt), waarschuwingen);
        }
        await bewaarBeurt(beurt);
    }
}
