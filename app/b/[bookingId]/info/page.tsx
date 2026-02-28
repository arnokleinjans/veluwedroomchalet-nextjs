// app/b/[bookingId]/info/page.tsx
import { getAppData } from "../../../utils/db";
import InfoClient from "./InfoClient";

export const dynamic = "force-dynamic";

export default async function Info({ params }: { params: { bookingId: string } }) {
    const resolvedParams = await Promise.resolve(params);
    const bookingId = (resolvedParams.bookingId || "").toUpperCase();

    // 1. Fetch data securely on the Vercel server edge
    const appData = await getAppData();

    // 2. Find specific booking context
    const booking = appData.bookings.find((b: any) => b.id === bookingId) || null;

    // 3. Pass serialized data JSON to the React client handler
    return <InfoClient appData={appData} booking={booking} basePath={`/b/${bookingId}`} />;
}
