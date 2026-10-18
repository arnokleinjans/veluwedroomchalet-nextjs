import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { getKV } from "./db";
import type {
    Beurt, BeurtMetContext, BeurtVoorSchoonmaker, HistorieRegel,
    SchoonmaakInstellingen, Schoonmaker, SchoonmakerPubliek,
} from "./schoonmaakTypes";

// Alle Redis-toegang voor de schoonmaak staat in dit bestand. Bewust los van veluwe_app_data:
// een opslag hier kan nooit boekingen of gastteksten overschrijven.
const SLEUTEL_SCHOONMAKERS = "schoonmakers";
const SLEUTEL_INDEX = "schoonmaak:index";
const SLEUTEL_INSTELLINGEN = "schoonmaak:instellingen";
const beurtSleutel = (id: string) => `schoonmaak:${id}`;

const STANDAARD_INSTELLINGEN: SchoonmaakInstellingen = {
    vertrektijd: "11:00",
    meldingEmail: "info@veluwedroomchalet.nl",
};

export function vandaag(): string {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());
}

export function nieuweId(): string {
    return Date.now().toString(36) + randomBytes(3).toString("hex");
}

export function regel(actie: string, schoonmakerId?: string, toelichting?: string): HistorieRegel {
    return { op: new Date().toISOString(), actie, ...(schoonmakerId ? { schoonmakerId } : {}), ...(toelichting ? { toelichting } : {}) };
}

// ---------- Instellingen ----------

export async function leesInstellingen(): Promise<SchoonmaakInstellingen> {
    const opgeslagen = await getKV().get<Partial<SchoonmaakInstellingen>>(SLEUTEL_INSTELLINGEN);
    return { ...STANDAARD_INSTELLINGEN, ...(opgeslagen || {}) };
}

export async function bewaarInstellingen(instellingen: SchoonmaakInstellingen) {
    await getKV().set(SLEUTEL_INSTELLINGEN, instellingen);
}

// ---------- Schoonmaaksters ----------

export async function leesSchoonmakers(): Promise<Schoonmaker[]> {
    return (await getKV().get<Schoonmaker[]>(SLEUTEL_SCHOONMAKERS)) || [];
}

export async function bewaarSchoonmakers(lijst: Schoonmaker[]) {
    await getKV().set(SLEUTEL_SCHOONMAKERS, lijst);
}

export function zonderPin(s: Schoonmaker): SchoonmakerPubliek {
    const { pinHash, ...rest } = s;
    return { ...rest, heeftPin: !!pinHash };
}

export async function vindSchoonmakerOpCode(code: string): Promise<Schoonmaker | null> {
    const lijst = await leesSchoonmakers();
    return lijst.find(s => s.linkCode === code) || null;
}

export function nieuweLinkCode(): string {
    return randomBytes(8).toString("base64url").replace(/[-_]/g, "").slice(0, 10).toLowerCase();
}

export function nieuwePin(): string {
    return String(randomInt(0, 100000)).padStart(5, "0");
}

export function hashPin(pin: string): string {
    const zout = randomBytes(16).toString("hex");
    return `${zout}:${scryptSync(pin, zout, 32).toString("hex")}`;
}

export function pinKlopt(pin: string, hash?: string): boolean {
    if (!hash) return false;
    const [zout, opgeslagen] = hash.split(":");
    const berekend = scryptSync(pin, zout, 32);
    const verwacht = Buffer.from(opgeslagen, "hex");
    return berekend.length === verwacht.length && timingSafeEqual(berekend, verwacht);
}

// ---------- Beurten ----------

export async function leesBeurt(id: string): Promise<Beurt | null> {
    return await getKV().get<Beurt>(beurtSleutel(id));
}

export async function bewaarBeurt(beurt: Beurt) {
    const kv = getKV();
    beurt.bijgewerkt = new Date().toISOString();
    await kv.set(beurtSleutel(beurt.id), beurt);
    await kv.sadd(SLEUTEL_INDEX, beurt.id);
}

export async function verwijderBeurt(id: string) {
    const kv = getKV();
    await kv.del(beurtSleutel(id));
    await kv.srem(SLEUTEL_INDEX, id);
}

export async function alleBeurten(): Promise<Beurt[]> {
    const kv = getKV();
    const ids = await kv.smembers(SLEUTEL_INDEX);
    if (!ids.length) return [];
    const beurten = await kv.mget<(Beurt | null)[]>(...ids.map(beurtSleutel));
    return beurten.filter((b): b is Beurt => !!b).sort((a, b) => a.datum.localeCompare(b.datum));
}

// Elke boeking die nog moet vertrekken krijgt een beurt op de vertrekdatum.
// Een beurt waarvan de datum niet met de hand is aangepast, schuift mee met de vertrekdatum.
// Geeft de beurten terug waarvan de datum is verschoven terwijl er al iemand op stond.
export async function synchroniseerBeurten(bookings: any[]): Promise<Beurt[]> {
    const beurten = await alleBeurten();
    const perBoeking = new Map(beurten.filter(b => b.automatisch && b.bookingId).map(b => [b.bookingId!, b]));
    const grens = vandaag();
    const verschoven: Beurt[] = [];

    for (const booking of bookings || []) {
        if (!booking?.id || !booking.checkOut) continue;
        const beurt = perBoeking.get(booking.id);
        if (!beurt) {
            if (booking.checkOut < grens) continue;
            await bewaarBeurt({
                id: nieuweId(),
                bookingId: booking.id,
                automatisch: true,
                datum: booking.checkOut,
                datumHandmatig: false,
                betaald: false,
                status: "open",
                historie: [regel("aangemaakt bij boeking")],
                bijgewerkt: "",
            });
        } else if (!beurt.datumHandmatig && beurt.datum !== booking.checkOut && beurt.status !== "uitgevoerd") {
            beurt.historie.push(regel("datum mee verschoven met vertrek", undefined, `${beurt.datum} → ${booking.checkOut}`));
            beurt.datum = booking.checkOut;
            await bewaarBeurt(beurt);
            if (beurt.schoonmakerId && (beurt.status === "toegewezen" || beurt.status === "geaccepteerd")) verschoven.push(beurt);
        }
    }
    return verschoven;
}

export async function hernoemBoekingInBeurten(oudId: string, nieuwId: string) {
    for (const beurt of await alleBeurten()) {
        if (beurt.bookingId === oudId) {
            beurt.bookingId = nieuwId;
            await bewaarBeurt(beurt);
        }
    }
}

// ---------- Afgeleide gegevens ----------

export function verrijk(beurt: Beurt, bookings: any[]): BeurtMetContext {
    const boeking = beurt.bookingId ? bookings.find(b => b.id === beurt.bookingId) : undefined;
    // De eerstvolgende gast die op of na de schoonmaakdatum aankomt. Voor die gast wordt het chalet klaargemaakt.
    const volgende = bookings
        .filter(b => !b.isTest && b.id !== beurt.bookingId && b.checkIn && b.checkIn >= beurt.datum)
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
    return {
        ...beurt,
        gastNaam: boeking?.guestName,
        boekingVerwijderd: !!beurt.bookingId && !boeking,
        vertrekBoeking: boeking?.checkOut,
        personenVolgende: volgende?.nachtregistratie?.aantalPersonen || undefined,
        volgendeAankomst: volgende?.checkIn,
    };
}

export function voorSchoonmaker(beurt: BeurtMetContext, instellingen: SchoonmaakInstellingen): BeurtVoorSchoonmaker {
    return {
        id: beurt.id,
        datum: beurt.datum,
        omschrijving: beurt.bookingId ? undefined : beurt.omschrijving,
        vertrektijd: beurt.vertrektijd || instellingen.vertrektijd,
        volgendeAankomst: beurt.volgendeAankomst,
        personenVolgende: beurt.personenVolgende,
        berichtAanSchoonmaker: beurt.berichtAanSchoonmaker,
        opmerkingSchoonmaker: beurt.opmerkingSchoonmaker,
        redenAfkeuring: beurt.redenAfkeuring,
        status: beurt.status,
        bedrag: beurt.bedrag,
        betaald: beurt.betaald,
    };
}
