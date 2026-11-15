import { NextResponse } from "next/server";
import { leesPromo } from "../../../utils/landingspagina";

export const dynamic = "force-dynamic";

// Openbaar en alleen-lezen: de landingspagina vraagt hier op welke promo actief is. null betekent geen promo.
export async function GET() {
    const cors = { "Access-Control-Allow-Origin": "*" };
    try {
        const promo = await leesPromo();
        return NextResponse.json({ promo }, { headers: { ...cors, "Cache-Control": "public, max-age=0, s-maxage=15" } });
    } catch (e) {
        console.error("Promo landingspagina lezen mislukt:", e);
        return NextResponse.json({ promo: null }, { headers: { ...cors, "Cache-Control": "no-store" } });
    }
}
