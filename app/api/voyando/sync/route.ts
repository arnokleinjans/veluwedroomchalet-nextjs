import { NextResponse } from "next/server";
import { synchroniseerVoyando, voyandoActief } from "../../../utils/voyando";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Dagelijkse ronde via Vercel Cron. Vercel stuurt CRON_SECRET mee als Bearer-token.
export async function GET(req: Request) {
    const geheim = process.env.CRON_SECRET;
    if (!geheim || req.headers.get("authorization") !== `Bearer ${geheim}`) {
        return NextResponse.json({ error: "Niet toegestaan" }, { status: 401 });
    }
    if (!voyandoActief()) return NextResponse.json({ actief: false });
    const stand = await synchroniseerVoyando({ forceer: true });
    return NextResponse.json({ actief: true, gelukt: stand.gelukt, aantal: stand.aantal, fout: stand.fout });
}
