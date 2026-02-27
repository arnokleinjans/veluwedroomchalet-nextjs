export function parseTemplateString(text: string, booking: any | null): string {
    if (!text) return "";

    // Fallback dictionary for template tags if booking is not found
    const dictionary = {
        '@naamgast': booking?.guestName || 'Beste gast',
        '@aankomst': formatDutchDate(booking?.checkIn),
        '@vertrek': formatDutchDate(booking?.checkOut),
    };

    let result = text;
    for (const [key, value] of Object.entries(dictionary)) {
        // Find every occurrence of the keyword (case-insensitive) and replace it with its value
        const regex = new RegExp(key, 'gi');
        result = result.replace(regex, value);
    }

    return result;
}

// Helper to convert "2026-03-02" to "2 maart 2026"
export function formatDutchDate(dateString: string | undefined): string {
    if (!dateString) return 'onbekende datum';

    try {
        const date = new Date(dateString);
        // Valid date check
        if (isNaN(date.getTime())) return dateString;

        // Force Dutch formulation
        const options: Intl.DateTimeFormatOptions = {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        };

        return new Intl.DateTimeFormat('nl-NL', options).format(date);
    } catch (error) {
        return dateString;
    }
}
