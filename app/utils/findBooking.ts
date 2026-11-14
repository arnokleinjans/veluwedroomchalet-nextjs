// Zoekt een boeking op id (case-insensitief). Een boeking met een eigen code (ANJA-XSEV) of een
// vertypt nummer is ook vindbaar op haar Voyando-nummer: dat is het nummer in de mail van Voyando.
export function findBooking<T extends { id: string }>(
    bookings: T[] | undefined | null,
    rawId: string
): T | null {
    if (!bookings || !rawId) return null;
    const id = decodeURIComponent(rawId).trim().toUpperCase();
    return bookings.find(b => b.id?.toUpperCase() === id)
        || bookings.find(b => String((b as any).voyando?.id ?? "") === id)
        || null;
}
