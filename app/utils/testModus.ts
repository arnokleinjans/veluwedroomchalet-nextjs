export const TEST_COOKIE = "vdc_test";

export type TestFase = "voor" | "aankomst" | "verblijf" | "vertrek" | "verlopen";
export type TestNachtreg = "leeg" | "ingevuld" | "verstuurd";

export type TestKeuze = {
    fase: TestFase;
    taal: string;
    nachtreg: TestNachtreg;
};

export const TEST_FASES: { waarde: TestFase; label: string }[] = [
    { waarde: "voor", label: "Voor aankomst" },
    { waarde: "aankomst", label: "Dag van aankomst" },
    { waarde: "verblijf", label: "Tijdens verblijf" },
    { waarde: "vertrek", label: "Vertrek nadert" },
    { waarde: "verlopen", label: "Verlopen" },
];

export const TEST_STANDAARD: TestKeuze = { fase: "verblijf", taal: "nl", nachtreg: "leeg" };

export function leesTestKeuze(ruw: string | undefined | null): TestKeuze {
    if (!ruw) return TEST_STANDAARD;
    const [fase, taal, nachtreg] = decodeURIComponent(ruw).split("|");
    return {
        fase: (TEST_FASES.some(f => f.waarde === fase) ? fase : TEST_STANDAARD.fase) as TestFase,
        taal: ["nl", "en", "de"].includes(taal) ? taal : TEST_STANDAARD.taal,
        nachtreg: (["leeg", "ingevuld", "verstuurd"].includes(nachtreg) ? nachtreg : TEST_STANDAARD.nachtreg) as TestNachtreg,
    };
}

export function schrijfTestKeuze(keuze: TestKeuze): string {
    return `${keuze.fase}|${keuze.taal}|${keuze.nachtreg}`;
}

// De hele app is datumgestuurd. Door alleen de aankomst- en vertrekdatum te
// verschuiven komt elke fase op een natuurlijke manier tot stand, zonder dat de
// gate-, verloop- of zichtbaarheidslogica iets van een testmodus hoeft te weten.
const VERSCHUIVING: Record<TestFase, [number, number]> = {
    voor: [5, 12],
    aankomst: [0, 5],
    verblijf: [-2, 3],
    vertrek: [-5, 1],
    verlopen: [-8, -1],
};

function datumInAmsterdam(dagenVanafVandaag: number): string {
    const nu = new Date();
    const delen = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Amsterdam",
        year: "numeric", month: "2-digit", day: "2-digit",
    }).format(nu);
    const dag = new Date(delen + "T12:00:00Z");
    dag.setUTCDate(dag.getUTCDate() + dagenVanafVandaag);
    return dag.toISOString().slice(0, 10);
}

export function pasTestKeuzeToe<T extends Record<string, any>>(booking: T, keuze: TestKeuze): T {
    const [vanaf, tot] = VERSCHUIVING[keuze.fase];
    const aangepast: any = {
        ...booking,
        checkIn: datumInAmsterdam(vanaf),
        checkOut: datumInAmsterdam(tot),
        language: keuze.taal,
    };

    if (keuze.nachtreg === "leeg") {
        delete aangepast.nachtregistratie;
    } else {
        aangepast.nachtregistratie = {
            status: keuze.nachtreg,
            betaalwijze: "receptie",
            huurderNaam: booking.guestName || "Testgast",
            adres: "Teststraat 1",
            postcode: "1234 AB",
            woonplaats: "Hoenderloo",
            telefoon: "06-12345678",
            email: "test@veluwedroomchalet.nl",
            aantalPersonen: 2,
            aankomst: aangepast.checkIn,
            vertrek: aangepast.checkOut,
            bedrag: 0,
            ingevuldOp: new Date().toISOString(),
            ...(keuze.nachtreg === "verstuurd" ? { verstuurdOp: new Date().toISOString() } : {}),
        };
    }

    return aangepast as T;
}

// ---- Zichtbaarheid van tegels per fase ----------------------------------
// Een tegel is nooit zichtbaar in de fase "verlopen": daar vervangt de
// bedankpagina de hele app.
export const FASES_VOOR_TEGELS: TestFase[] = ["voor", "aankomst", "verblijf", "vertrek"];

export function huidigeFase(booking: { checkIn?: string; checkOut?: string } | null | undefined): TestFase {
    if (!booking?.checkIn || !booking?.checkOut) return "verblijf";

    const nu = new Date();
    const p: Record<string, string> = {};
    new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Amsterdam",
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
    }).formatToParts(nu).forEach(({ type, value }) => { if (type !== "literal") p[type] = value; });
    const vandaag = `${p.year}-${p.month}-${p.day}`;
    const uur = parseInt(p.hour);

    if (vandaag > booking.checkOut || (vandaag === booking.checkOut && uur >= 12)) return "verlopen";

    const poort = new Date(booking.checkIn + "T12:00:00");
    poort.setDate(poort.getDate() - 2);
    const poortDatum = poort.toISOString().slice(0, 10);
    if (vandaag < poortDatum || (vandaag === poortDatum && uur < 8)) return "voor";

    if (vandaag <= booking.checkIn) return "aankomst";

    const vertrekVanaf = new Date(booking.checkOut + "T00:00:00").getTime() - 12 * 60 * 60 * 1000;
    if (nu.getTime() >= vertrekVanaf) return "vertrek";

    return "verblijf";
}

// Oudere tegels hebben nog het enkelvoudige `visibility`-veld; die vertalen we
// naar dezelfde fases zodat bestaande instellingen blijven werken.
export function fasesVanTegel(insight: any): TestFase[] {
    if (Array.isArray(insight?.fases)) return insight.fases as TestFase[];
    switch (insight?.visibility) {
        case "checkin": return ["voor", "aankomst"];
        case "checkout": return ["vertrek"];
        default: return [...FASES_VOOR_TEGELS];
    }
}

export function vraagtOmNachtregistratie(insight: any): boolean {
    if (typeof insight?.alleenLegeNachtregistratie === "boolean") return insight.alleenLegeNachtregistratie;
    return insight?.visibility === "nachtregistratie";
}

// Mobiel/desktop staan in dezelfde vinkjesgroep als de fases. Oudere tegels
// hebben nog `hideOnMobile`; die blijft gewoon werken.
export function toontOpMobiel(insight: any): boolean {
    if (typeof insight?.toonMobiel === "boolean") return insight.toonMobiel;
    return !insight?.hideOnMobile;
}

export function toontOpDesktop(insight: any): boolean {
    if (typeof insight?.toonDesktop === "boolean") return insight.toonDesktop;
    return true;
}

export function tegelZichtbaar(insight: any, booking: any): boolean {
    if (vraagtOmNachtregistratie(insight) && booking?.nachtregistratie) return false;
    if (!toontOpMobiel(insight) && !toontOpDesktop(insight)) return false;
    return fasesVanTegel(insight).includes(huidigeFase(booking));
}

// Bepaalt het kleuraccent van een tegel. Rood is voorbehouden aan de
// nachtregistratie; groen ("uitgelicht") is een eigen keuze van de beheerder,
// met als terugval het oude gedrag: tegels die niet in alle fases staan.
export function isUitgelicht(insight: any): boolean {
    if (typeof insight?.uitgelicht === "boolean") return insight.uitgelicht;
    return fasesVanTegel(insight).length < FASES_VOOR_TEGELS.length;
}

export function accentVanTegel(insight: any): string | undefined {
    if (vraagtOmNachtregistratie(insight)) return "nachtregistratie";
    return isUitgelicht(insight) ? "uitgelicht" : undefined;
}
