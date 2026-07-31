export type Taal = {
    code: string;
    naam: string;
    vlag: string;
    engels: string;
};

export const TALEN: Taal[] = [
    { code: "nl", naam: "Nederlands", vlag: "🇳🇱", engels: "Dutch" },
    { code: "en", naam: "Engels", vlag: "🇬🇧", engels: "English" },
    { code: "de", naam: "Duits", vlag: "🇩🇪", engels: "German" },
    { code: "fr", naam: "Frans", vlag: "🇫🇷", engels: "French" },
    { code: "it", naam: "Italiaans", vlag: "🇮🇹", engels: "Italian" },
];

// Nederlands is de brontaal; alleen de rest wordt vertaald en opgeslagen.
export const VERTAALTALEN = TALEN.filter(t => t.code !== "nl");

export const TAALCODES = TALEN.map(t => t.code);

export function vlagVan(code?: string): string {
    return TALEN.find(t => t.code === code)?.vlag || "";
}

export function naamVan(code?: string): string {
    return TALEN.find(t => t.code === code)?.naam || code || "";
}
