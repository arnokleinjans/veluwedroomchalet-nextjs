// Zoekt een boeking op id óf op een oude alias-id (oude gastenlinks blijven werken).
export function findBooking<T extends { id: string; aliases?: string[] }>(
    bookings: T[] | undefined | null,
    rawId: string
): T | null {
    if (!bookings || !rawId) return null;
    const id = decodeURIComponent(rawId).trim().toUpperCase();
    return bookings.find(b =>
        b.id?.toUpperCase() === id ||
        (Array.isArray(b.aliases) && b.aliases.some(a => (a || "").toUpperCase() === id))
    ) || null;
}
