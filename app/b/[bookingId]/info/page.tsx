// app/b/[bookingId]/info/page.tsx
import { getTranslatedAppData, toClientAppData } from "../../../utils/db";
import { findBooking } from "../../../utils/findBooking";
import InfoClient from "./InfoClient";

export const dynamic = "force-dynamic";

export default async function Info({ params }: { params: { bookingId: string } }) {
    const resolvedParams = await Promise.resolve(params);
    const bookingId = (resolvedParams.bookingId || "").toUpperCase();

    // 1. Fetch data securely and translate on the Vercel server edge
    const appData = await getTranslatedAppData(bookingId);

    // 2. Find specific booking context
    const booking = findBooking(appData.bookings, bookingId);

    // 3. Pass serialized data JSON to the React client handler
    return <InfoClient appData={toClientAppData(appData)} booking={booking} basePath={`/b/${bookingId}`} />;
}
