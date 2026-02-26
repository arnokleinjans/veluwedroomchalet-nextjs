import { appData } from "../../utils/mockData";
import { BookingProvider, BookingInfo } from "../../context/BookingContext";
import { notFound } from "next/navigation";
import ClientLayout from "../../components/ClientLayout";

export const dynamic = "force-dynamic"; // CRUCIAL: Forces Vercel to read params live instead of serving a static 404 fallback

export default async function BookingLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ bookingId: string }>;
}) {
    const { bookingId } = await params;
    // Find the current booking
    const booking = appData.bookings?.find(b => b.id === bookingId);

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
        <BookingProvider booking={bookingInfo}>
            <ClientLayout basePath={`/b/${bookingInfo.id}`}>
                {children}
            </ClientLayout>
        </BookingProvider>
    );
}
