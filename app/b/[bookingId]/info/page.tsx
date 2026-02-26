// app/b/[bookingId]/info/page.tsx
import { getAppData } from "../../../utils/db";
import InfoClient from "./InfoClient";

export const dynamic = "force-dynamic";

export default async function Info() {
    // 1. Fetch data securely on the Vercel server edge
    const appData = await getAppData();

    // 2. Pass serialized data JSON to the React client handler
    return <InfoClient appData={appData} />;
}
