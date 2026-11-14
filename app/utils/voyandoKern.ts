// Kern van de Voyando-koppeling. Bewust zonder imports: het script voor de eerste lading
// (scripts/voyando-eerste-lading.ts) draait dit bestand rechtstreeks met node.
//
// Voyando is de bron voor boekingsnummer, datums en annulering. Wat in beheer is ingevoerd
// (taal, nachtregistratie, een afwijkende naam of datum) wordt nooit stil overschreven:
// een verschil dat er bij het koppelen al was blijft staan tot iemand het in beheer overneemt.

const BASIS = "https://voyando.com/api/v1";

export type VoyandoBoeking = {
    id: number;
    status: string | null;
    channel: string | null;
    check_in: string | null;
    check_out: string | null;
    adults: number | null;
    kids: number | null;
    babies: number | null;
    pets: number | null;
    updated_at: string;
};

export type VoyandoMoment = {
    id: number;
    status: string | null;
    kanaal: string | null;
    checkIn: string;
    checkOut: string;
    volwassenen: number;
    kinderen: number;
    babys: number;
    huisdieren: number;
    naam?: string;
    telefoon?: string;
    email?: string;
    updatedAt: string;
};

export type Gast = { naam: string; telefoon: string; email: string };

export type RapportRegel = {
    id: string;
    soort: "nieuw" | "gekoppeld" | "bijgewerkt" | "geannuleerd" | "hersteld" | "verschil" | "alleen-beheer" | "overgeslagen";
    naam?: string;
    tekst: string;
};

export type SamenvoegResultaat = {
    bookings: any[];
    gewijzigd: boolean;
    rapport: RapportRegel[];
    geannuleerd: string[];
};

async function vraag(pad: string, sleutel: string): Promise<any> {
    const url = pad.startsWith("http") ? pad : pad.startsWith("/api/") ? "https://voyando.com" + pad : BASIS + pad;
    for (let poging = 0; ; poging++) {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${sleutel}`, Accept: "application/json", "User-Agent": "veluwedroomchalet-beheer/1.0" },
            cache: "no-store",
        });
        if ((res.status === 429 || res.status === 503) && poging < 3) {
            const wacht = Math.min(Number(res.headers.get("Retry-After")) || 5, 30);
            await new Promise(r => setTimeout(r, wacht * 1000));
            continue;
        }
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Voyando gaf ${res.status} op ${pad.split("?")[0]}`);
        return await res.json();
    }
}

export async function haalAlleBoekingen(sleutel: string): Promise<VoyandoBoeking[]> {
    const alle: VoyandoBoeking[] = [];
    let pad: string | null = "/bookings/?page_size=100";
    while (pad) {
        const pagina: any = await vraag(pad, sleutel);
        alle.push(...pagina.results);
        pad = pagina.next;
    }
    return alle;
}

export async function haalBoeking(sleutel: string, id: string | number): Promise<(VoyandoBoeking & { guest: any }) | null> {
    return await vraag(`/bookings/${id}/`, sleutel);
}

export function naamVan(gast: any): string {
    return [gast?.first_name, gast?.last_name].map((s: any) => (s || "").trim()).filter(Boolean).join(" ");
}

// Booking.com geeft een doorstuuradres en Airbnb een plaatshouder; alleen een echt adres is bruikbaar.
export function gastVan(gast: any): Gast {
    const email = String(gast?.email || "").trim();
    const echt = email && !/@(guest\.booking\.com|no-email\.voyando\.com)$/i.test(email);
    return { naam: naamVan(gast), telefoon: String(gast?.telefoon ?? gast?.telephone ?? "").trim(), email: echt ? email : "" };
}

export function momentVan(v: VoyandoBoeking, gast?: Partial<Gast>): VoyandoMoment {
    return {
        id: v.id,
        status: v.status,
        kanaal: v.channel,
        checkIn: v.check_in || "",
        checkOut: v.check_out || "",
        volwassenen: v.adults || 0,
        kinderen: v.kids || 0,
        babys: v.babies || 0,
        huisdieren: v.pets || 0,
        ...(gast?.naam !== undefined ? { naam: gast.naam } : {}),
        ...(gast?.telefoon !== undefined ? { telefoon: gast.telefoon } : {}),
        ...(gast?.email !== undefined ? { email: gast.email } : {}),
        updatedAt: v.updated_at,
    };
}

export function kanaalNaam(kanaal: string | null | undefined): string {
    if (!kanaal) return "Direct";
    if (/airbnb/i.test(kanaal)) return "Airbnb";
    if (/booking/i.test(kanaal)) return "Booking.com";
    return kanaal;
}

export function wijktAf(b: any): string | null {
    const m: VoyandoMoment | undefined = b?.voyando;
    if (!m || !m.checkIn || !m.checkOut) return null;
    if (b.checkIn === m.checkIn && b.checkOut === m.checkOut) return null;
    return `${m.checkIn} t/m ${m.checkOut}`;
}

const TELT_MEE = (status: string | null) => status === "accepted";

// Een boeking uit de tijd van de naam-codes (ANJA-XSEV) houdt haar eigen id en dus haar link;
// het Voyando-nummer staat dan alleen in het veld voyando.
export function voyandoSleutel(b: any): string {
    return String(b?.voyando?.id ?? b?.id ?? "").toUpperCase();
}

function nachten(van: string, tot: string): number {
    return Math.round((new Date(tot + "T12:00:00").getTime() - new Date(van + "T12:00:00").getTime()) / 86400000);
}

// Eerste lading: een boeking zonder Voyando-nummer hoort bij de Voyando-boeking met dezelfde aankomst of
// hetzelfde vertrek, mits de periodes overlappen en er aan beide kanten maar één kandidaat is.
// Er is één chalet, dus twee geaccepteerde boekingen kunnen elkaar niet overlappen.
function koppelOpDatum(bookings: any[], vrij: VoyandoBoeking[]): Map<number, any> {
    const past = (b: any, v: VoyandoBoeking) =>
        !!v.check_in && !!v.check_out && !!b.checkIn && !!b.checkOut
        && (b.checkIn === v.check_in || b.checkOut === v.check_out)
        && b.checkIn < v.check_out && v.check_in < b.checkOut;
    const kandidaten = bookings.filter(b => !b.isTest && !b.voyando && b.checkIn && b.checkOut && nachten(b.checkIn, b.checkOut) <= 60);
    const uit = new Map<number, any>();
    for (const v of vrij) {
        const bij = kandidaten.filter(b => past(b, v));
        if (bij.length !== 1) continue;
        if (vrij.filter(w => past(bij[0], w)).length !== 1) continue;
        uit.set(v.id, bij[0]);
    }
    return uit;
}

// Welke boekingen hebben een detailverzoek nodig (voor de gastnaam)?
export function detailNodig(bookings: any[], voyando: VoyandoBoeking[]): number[] {
    const perId = new Map((bookings || []).map(b => [voyandoSleutel(b), b]));
    return voyando
        .filter(v => {
            const b = perId.get(String(v.id));
            if (!b) return TELT_MEE(v.status);
            return !b.voyando || b.voyando.updatedAt !== v.updated_at || b.voyando.telefoon === undefined;
        })
        .map(v => v.id);
}

// Voegt de stand van Voyando samen met de boekingen in beheer. Zuiver: schrijft niets weg.
// gasten: gastgegevens per Voyando-id, voor zover opgehaald. Een nieuwe boeking zonder gastgegevens wacht tot de volgende ronde.
export function voegSamen(bestaand: any[], voyando: VoyandoBoeking[], gasten: Map<number, Gast>, opties: { koppelOpDatum?: boolean } = {}): SamenvoegResultaat {
    const bookings = (bestaand || []).map(b => ({ ...b }));
    const perId = new Map(bookings.map(b => [voyandoSleutel(b), b]));
    if (opties.koppelOpDatum) {
        const vrij = voyando.filter(v => TELT_MEE(v.status) && !perId.has(String(v.id)));
        for (const [vid, b] of koppelOpDatum(bookings, vrij)) {
            perId.delete(voyandoSleutel(b));
            perId.set(String(vid), b);
        }
    }
    const rapport: RapportRegel[] = [];
    const geannuleerd: string[] = [];
    let gewijzigd = false;
    const gezien = new Set<string>();

    for (const v of voyando) {
        const id = String(v.id);
        gezien.add(id);
        const gast = gasten.get(v.id);
        const naam = gast?.naam;
        const b = perId.get(id);

        if (!b) {
            if (!TELT_MEE(v.status)) continue;
            if (!v.check_in || !v.check_out) {
                rapport.push({ id, soort: "overgeslagen", tekst: "geen datums in Voyando" });
                continue;
            }
            if (naam === undefined) {
                rapport.push({ id, soort: "overgeslagen", tekst: "gastnaam nog niet opgehaald, volgt bij de volgende ronde" });
                continue;
            }
            bookings.push({ id, guestName: naam || "Gast", checkIn: v.check_in, checkOut: v.check_out, language: "nl", voyando: momentVan(v, gast) });
            rapport.push({ id, soort: "nieuw", naam, tekst: `${v.check_in} t/m ${v.check_out} · ${kanaalNaam(v.channel)}` });
            gewijzigd = true;
            continue;
        }

        const oud: VoyandoMoment | undefined = b.voyando;
        if (!oud) {
            b.voyando = momentVan(v, gast);
            gewijzigd = true;
            const verschillen: string[] = [];
            if (v.check_in && v.check_in !== b.checkIn) verschillen.push(`aankomst beheer ${b.checkIn}, Voyando ${v.check_in}`);
            if (v.check_out && v.check_out !== b.checkOut) verschillen.push(`vertrek beheer ${b.checkOut}, Voyando ${v.check_out}`);
            if (!TELT_MEE(v.status)) verschillen.push(`status in Voyando: ${v.status}`);
            const eigenId = String(b.id).toUpperCase() !== id ? ` · link blijft /b/${b.id}` : "";
            if (verschillen.length) rapport.push({ id, soort: "verschil", naam: b.guestName, tekst: verschillen.join(" · ") + eigenId });
            else rapport.push({ id, soort: "gekoppeld", naam: b.guestName, tekst: "gelijk aan Voyando" + eigenId });
            continue;
        }

        if (oud.updatedAt === v.updated_at && (oud.telefoon !== undefined || gast === undefined)) continue;
        // Gewijzigd in Voyando maar de naam is deze ronde niet opgehaald: wachten, anders raakt een naamswijziging zoek.
        if (oud.updatedAt !== v.updated_at && naam === undefined) continue;

        const wijzigingen: string[] = [];
        if (v.check_in && v.check_in !== oud.checkIn && b.checkIn === oud.checkIn) {
            wijzigingen.push(`aankomst ${b.checkIn} → ${v.check_in}`);
            b.checkIn = v.check_in;
        }
        if (v.check_out && v.check_out !== oud.checkOut && b.checkOut === oud.checkOut) {
            wijzigingen.push(`vertrek ${b.checkOut} → ${v.check_out}`);
            b.checkOut = v.check_out;
        }
        if (naam && oud.naam && naam !== oud.naam && b.guestName === oud.naam) {
            wijzigingen.push(`naam ${b.guestName} → ${naam}`);
            b.guestName = naam;
        }
        const wasActief = TELT_MEE(oud.status);
        const isActief = TELT_MEE(v.status);
        if (wasActief && !isActief) {
            b.geannuleerd = true;
            geannuleerd.push(b.id);
            rapport.push({ id, soort: "geannuleerd", naam: b.guestName, tekst: `in Voyando op ${v.status} gezet` });
        } else if (!wasActief && isActief && b.geannuleerd) {
            delete b.geannuleerd;
            rapport.push({ id, soort: "hersteld", naam: b.guestName, tekst: "in Voyando weer geaccepteerd" });
        }
        b.voyando = momentVan(v, gast ?? { naam: oud.naam, telefoon: oud.telefoon, email: oud.email });
        gewijzigd = true;
        if (wijzigingen.length) rapport.push({ id, soort: "bijgewerkt", naam: b.guestName, tekst: wijzigingen.join(" · ") });
    }

    for (const b of bookings) {
        if (b.isTest || b.voyando) continue;
        rapport.push({ id: b.id, soort: "alleen-beheer", naam: b.guestName, tekst: `${b.checkIn} t/m ${b.checkOut} · staat niet in Voyando` });
    }

    return { bookings, gewijzigd, rapport, geannuleerd };
}

// Voorinvulling van een nog lege nachtregistratie met wat Voyando al weet. Een ingevuld formulier blijft zoals het is.
export function voorinvulling(b: any): { aantalPersonen: number; telefoon: string; email: string } | null {
    const m: VoyandoMoment | undefined = b?.voyando;
    if (!m || b.nachtregistratie) return null;
    return { aantalPersonen: (m.volwassenen || 0) + (m.kinderen || 0) + (m.babys || 0), telefoon: m.telefoon || "", email: m.email || "" };
}

const telKern = (t: any) => String(t || "").replace(/\D/g, "").slice(-9);
const naamKern = (n: any) => String(n || "").toLowerCase().replace(/[^a-zà-ÿ ]/g, " ").replace(/\s+/g, " ").trim();

function kenmerken(b: any) {
    const tel = [b.voyando?.telefoon, b.nachtregistratie?.telefoon].map(telKern).filter(t => t.length === 9);
    const mail = [b.voyando?.email, b.nachtregistratie?.email].map(e => String(e || "").trim().toLowerCase()).filter(Boolean);
    const naam = [b.voyando?.naam, b.nachtregistratie?.huurderNaam, b.guestName].map(naamKern).filter(n => n.split(" ").length >= 2);
    return { tel, mail, naam };
}

// Eerdere verblijven van dezelfde gast: zelfde telefoonnummer, e-mailadres of volledige naam.
// Een nummer dat bij drie of meer verschillende namen staat (dat van de verhuurder zelf) zegt niets en telt niet mee.
export function eerdereVerblijven(bookings: any[]): Map<string, any[]> {
    const echte = (bookings || []).filter(b => !b.isTest && !b.geannuleerd && b.checkIn && b.checkOut);
    const metKenmerken = echte.map(b => ({ b, k: kenmerken(b) }));
    const namenPerTel = new Map<string, Set<string>>();
    for (const { b, k } of metKenmerken) for (const t of k.tel) {
        if (!namenPerTel.has(t)) namenPerTel.set(t, new Set());
        namenPerTel.get(t)!.add(naamKern(b.voyando?.naam || b.guestName));
    }
    const bruikbaar = (t: string) => (namenPerTel.get(t)?.size || 0) < 3;
    const uit = new Map<string, any[]>();
    for (const { b, k } of metKenmerken) {
        const eerder = metKenmerken.filter(({ b: a, k: ka }) => a !== b && a.checkOut <= b.checkIn && (
            k.tel.some(t => bruikbaar(t) && ka.tel.includes(t)) || k.mail.some(m => ka.mail.includes(m)) || k.naam.some(n => ka.naam.includes(n))
        )).map(x => x.b).sort((x, y) => y.checkIn.localeCompare(x.checkIn));
        if (eerder.length) uit.set(b.id, eerder);
    }
    return uit;
}
