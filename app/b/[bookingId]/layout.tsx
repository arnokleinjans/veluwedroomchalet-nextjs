import { getAppData } from "../../utils/db";
import { BookingProvider, BookingInfo } from "../../context/BookingContext";
import { notFound } from "next/navigation";
import ClientLayout from "../../components/ClientLayout";
import ExpiredBookingPage from "../../components/ExpiredBookingPage";

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

    const language = booking.language || 'nl';
    let translatedAppData = appData;
    if (language !== 'nl' && appData.translations && appData.translations[language]) {
        translatedAppData = mergeTranslations(appData, appData.translations[language]);
    }

    // Check if the booking has expired (checkOut date has passed)
    const checkOutDate = new Date(booking.checkOut + "T23:59:59");
    const isExpired = checkOutDate < new Date();

    if (isExpired) {
        return (
            <ExpiredBookingPage
                guestName={booking.guestName}
                propertyName={translatedAppData.property?.name || "Veluwe Droom Chalet"}
                content={(translatedAppData as any).expiredPageContent || ""}
                booking={{
                    id: booking.id,
                    guestName: booking.guestName,
                    checkIn: booking.checkIn,
                    checkOut: booking.checkOut,
                    keyCode: (translatedAppData?.property as any)?.keyCode || '',
                }}
            />
        );
    }

    const rawBookingInfo = {
        id: booking.id,
        guestName: booking.guestName,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        language: language,
        keyCode: (translatedAppData?.property as any)?.keyCode || ''
    };

    const finalAppData = translatedAppData;

    const bookingInfo: BookingInfo = rawBookingInfo;

    return (
        <BookingProvider booking={bookingInfo} appData={finalAppData}>
            <ClientLayout basePath={`/b/${bookingInfo.id}`} appData={finalAppData} booking={bookingInfo}>
                {children}
            </ClientLayout>
        </BookingProvider>
    );
}
