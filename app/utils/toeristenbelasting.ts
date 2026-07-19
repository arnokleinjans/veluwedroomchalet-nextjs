// Park-/servicekosten & toeristenbelasting 't Veluws Hof (tarieven 2025/2026).
export const TARIEF_EERSTE_NACHT = 10.00;
export const TARIEF_VOLGENDE_NACHT = 6.25;

export function berekenNachten(checkIn: string, checkOut: string): number {
    const inDate = new Date(checkIn + "T12:00:00");
    const outDate = new Date(checkOut + "T12:00:00");
    const nachten = Math.round((outDate.getTime() - inDate.getTime()) / 86400000);
    return nachten > 0 ? nachten : 0;
}

export function berekenBedrag(checkIn: string, checkOut: string): number {
    const nachten = berekenNachten(checkIn, checkOut);
    if (nachten === 0) return 0;
    return TARIEF_EERSTE_NACHT + (nachten - 1) * TARIEF_VOLGENDE_NACHT;
}

export function formatBedrag(bedrag: number): string {
    return "€ " + bedrag.toFixed(2).replace(".", ",");
}

export function formatDatumNL(iso: string): string {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}-${m}-${y}`;
}
