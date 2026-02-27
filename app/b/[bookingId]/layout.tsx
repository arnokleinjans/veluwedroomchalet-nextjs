import { getAppData } from "../../utils/db";
import { BookingProvider, BookingInfo } from "../../context/BookingContext";
import { notFound } from "next/navigation";
import ClientLayout from "../../components/ClientLayout";

export const dynamic = "force-dynamic";

export default async function BookingLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ bookingId: string }>;
}) {
    const { bookingId } = await params;
    const appData = await getAppData();

    // Find the current booking
    const booking = appData.bookings?.find((b: any) => b.id === bookingId);

    // Fallback if URL is invalid
    if (!booking) {
        notFound();
    }

    const bookingInfo: BookingInfo = {
        id: booking.id,
        guestName: booking.guestName,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut
    };

    return (
        <BookingProvider booking={bookingInfo} appData={appData}>
            <ClientLayout basePath={`/b/${bookingInfo.id}`} appData={appData} booking={bookingInfo}>
                {children}
            </ClientLayout>
        </BookingProvider>
    );
}
