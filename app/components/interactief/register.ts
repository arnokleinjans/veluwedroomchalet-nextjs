export type InteractiefOnderdeel = {
    id: string;
    naam: string;
    uitleg: string;
    alleenTalen?: string[];
    alleenDesktop?: boolean;
    beperking?: string;
};

export const INTERACTIEVE_ONDERDELEN: InteractiefOnderdeel[] = [
    {
        id: "sleutelkastje",
        naam: "Sleutelkastje",
        uitleg: "De gast opent het sleutelkastje in vier tikken. Gebruikt de sleutelcode uit het tabblad Algemeen.",
    },
    {
        id: "checkin",
        naam: "Check-in op de parkkaart",
        uitleg: "De gast speelt de zes stappen van het inchecken na op de plattegrond van het park, met het sleutelkastje erin. Gebruikt de sleutelcode uit het tabblad Algemeen.",
        alleenTalen: ["nl"],
        alleenDesktop: true,
        beperking: "Voorlopig alleen zichtbaar voor Nederlandstalige gasten en alleen op een breed scherm (computer of tablet). Op een telefoon en in andere talen ziet de gast dit onderdeel niet.",
    },
    {
        id: "checkout",
        naam: "Check-out op de parkkaart",
        uitleg: "De gast speelt de zes stappen van het uitchecken na op de plattegrond van het park.",
        alleenTalen: ["nl"],
        alleenDesktop: true,
        beperking: "Voorlopig alleen zichtbaar voor Nederlandstalige gasten en alleen op een breed scherm (computer of tablet). Op een telefoon en in andere talen ziet de gast dit onderdeel niet.",
    },
];

export function interactiefOnderdeel(id?: string, lang: string = "nl"): InteractiefOnderdeel | undefined {
    const onderdeel = INTERACTIEVE_ONDERDELEN.find(o => o.id === id);
    if (!onderdeel) return undefined;
    if (onderdeel.alleenTalen && !onderdeel.alleenTalen.includes(lang || "nl")) return undefined;
    return onderdeel;
}
