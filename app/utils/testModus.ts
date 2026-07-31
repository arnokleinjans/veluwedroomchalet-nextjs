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
