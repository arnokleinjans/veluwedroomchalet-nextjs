import { getAppData } from "../../utils/db";
import { BookingProvider, BookingInfo } from "../../context/BookingContext";
import { notFound } from "next/navigation";
import ClientLayout from "../../components/ClientLayout";

export const revalidate = 60; // Cache guest pages for 60 seconds (ISR)

export default async function BookingLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ bookingId: string }>;
}) {
    const { bookingId: rawId } = await params;
    const bookingId = rawId.toUpperCase();
    const appData = await getAppData();

    // Find the current booking
    const booking = appData.bookings?.find((b: any) => b.id.toUpperCase() === bookingId);

    // Fallback if URL is invalid
    if (!booking) {
        notFound();
    }

    const rawBookingInfo = {
        id: booking.id,
        guestName: booking.guestName,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        language: booking.language || 'nl'
    };

    // Deep merge function to replace text values seamlessly if translation exists
    const mergeTranslations = (data: any, translation: any): any => {
        if (!translation) return data;
        if (Array.isArray(data)) {
            return data.map((item, i) => mergeTranslations(item, translation[i]));
        } else if (data !== null && typeof data === 'object') {
            const result = { ...data };
            for (const key in translation) {
                if (key in result) {
                    result[key] = mergeTranslations(result[key], translation[key]);
                } else {
                    result[key] = translation[key];
                }
            }
            return result;
        }
        return translation;
    };

    let finalAppData = appData;
    if (rawBookingInfo.language && rawBookingInfo.language !== 'nl' && appData.translations && appData.translations[rawBookingInfo.language]) {
        finalAppData = mergeTranslations(appData, appData.translations[rawBookingInfo.language]);
    }

    const bookingInfo: BookingInfo = rawBookingInfo;

    return (
        <BookingProvider booking={bookingInfo} appData={finalAppData}>
            <ClientLayout basePath={`/b/${bookingInfo.id}`} appData={finalAppData} booking={bookingInfo}>
                {children}
            </ClientLayout>
        </BookingProvider>
    );
}
