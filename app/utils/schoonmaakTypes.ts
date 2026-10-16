export type BeurtStatus = "open" | "toegewezen" | "geaccepteerd" | "afgekeurd" | "uitgevoerd" | "vervallen";

export type HistorieRegel = {
    op: string;
    actie: string;
    schoonmakerId?: string;
    toelichting?: string;
};

export type Beurt = {
    id: string;
    bookingId?: string;
    automatisch?: boolean;
    omschrijving?: string;
    datum: string;
    datumHandmatig: boolean;
    vertrektijd?: string;
    schoonmakerId?: string;
    bedrag?: number;
    betaald: boolean;
    betaaldOp?: string;
    status: BeurtStatus;
    redenAfkeuring?: string;
    berichtAanSchoonmaker?: string;
    opmerkingSchoonmaker?: string;
    historie: HistorieRegel[];
    bijgewerkt: string;
};

export type Schoonmaker = {
    id: string;
    naam: string;
    email: string;
    telefoon: string;
    tarief: number;
    actief: boolean;
    linkCode: string;
    pinHash?: string;
    pinVersie: number;
};

export type SchoonmakerPubliek = Omit<Schoonmaker, "pinHash"> & { heeftPin: boolean };

export type SchoonmaakInstellingen = {
    vertrektijd: string;
    meldingEmail: string;
};

// Wat beheer per beurt te zien krijgt: de beurt plus wat uit de boekingen wordt afgeleid.
export type BeurtMetContext = Beurt & {
    gastNaam?: string;
    boekingVerwijderd: boolean;
    vertrekBoeking?: string;
    aantalPersonen?: number;
    volgendeAankomst?: string;
};

// Wat een schoonmaakster te zien krijgt. Bewust zonder gastgegevens.
export type BeurtVoorSchoonmaker = {
    id: string;
    datum: string;
    omschrijving?: string;
    vertrektijd: string;
    volgendeAankomst?: string;
    aantalPersonen?: number;
    berichtAanSchoonmaker?: string;
    opmerkingSchoonmaker?: string;
    redenAfkeuring?: string;
    status: BeurtStatus;
    bedrag?: number;
    betaald: boolean;
};

export const STATUS_LABEL: Record<BeurtStatus, { label: string; bg: string; color: string }> = {
    open: { label: "Open", bg: "#f0f0f0", color: "#666" },
    toegewezen: { label: "Toegewezen", bg: "#fef3c7", color: "#92400e" },
    geaccepteerd: { label: "Geaccepteerd", bg: "#dbeafe", color: "#1e40af" },
    afgekeurd: { label: "Afgekeurd", bg: "#fee2e2", color: "#b91c1c" },
    uitgevoerd: { label: "Uitgevoerd", bg: "#dcfce7", color: "#166534" },
    vervallen: { label: "Vervallen", bg: "#f5f5f5", color: "#999" },
};

export function formatEuro(bedrag?: number): string {
    if (bedrag === undefined || bedrag === null || isNaN(bedrag)) return "—";
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(bedrag);
}

export function datumLang(iso: string): string {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function metHoofdletter(tekst: string): string {
    return tekst.charAt(0).toUpperCase() + tekst.slice(1);
}
