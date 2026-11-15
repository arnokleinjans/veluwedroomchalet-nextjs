import { NextResponse } from "next/server";
import { leesHeader, STANDAARD_HEADER } from "../../../utils/landingspagina";

export const dynamic = "force-dynamic";

// Openbaar en alleen-lezen: de landingspagina vraagt hier op welke header actief is.
export async function GET() {
    const cors = { "Access-Control-Allow-Origin": "*" };
    try {
        const header = await leesHeader();
        return NextResponse.json({ header }, { headers: { ...cors, "Cache-Control": "public, max-age=0, s-maxage=15" } });
    } catch (e) {
        console.error("Header landingspagina lezen mislukt:", e);
        return NextResponse.json({ header: STANDAARD_HEADER }, { headers: { ...cors, "Cache-Control": "no-store" } });
    }
}
