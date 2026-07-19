// Zoekt een boeking op id (case-insensitief).
export function findBooking<T extends { id: string }>(
    bookings: T[] | undefined | null,
    rawId: string
): T | null {
    if (!bookings || !rawId) return null;
    const id = decodeURIComponent(rawId).trim().toUpperCase();
    return bookings.find(b => b.id?.toUpperCase() === id) || null;
}
