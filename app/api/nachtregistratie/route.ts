import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getKV, getAppDataFresh, invalidateCache } from '../../utils/db';
import { findBooking } from '../../utils/findBooking';
import { checkRateLimit } from '../../utils/rateLimit';
import { berekenBedrag } from '../../utils/toeristenbelasting';

export async function POST(req: Request) {
    const limit = checkRateLimit('nachtregistratie-api');
    if (!limit.allowed) {
        return NextResponse.json(
            { error: `Te veel verzoeken. Probeer het over ${Math.ceil((limit.retryAfterMs || 0) / 1000)} seconden opnieuw.` },
            { status: 429 }
        );
    }

    try {
        const body = await req.json();
        const bookingId = String(body.bookingId || "");
        const betaalwijze = body.betaalwijze;
        const huurderNaam = String(body.huurderNaam || "").trim();
        const adres = String(body.adres || "").trim();
        const telefoon = String(body.telefoon || "").trim();
        const email = String(body.email || "").trim();
        const aantalPersonen = parseInt(body.aantalPersonen, 10);

        if (betaalwijze !== 'receptie' && betaalwijze !== 'overmaken') {
            return NextResponse.json({ error: "Kies hoe de toeristenbelasting betaald wordt." }, { status: 400 });
        }
        if (!huurderNaam || !adres || !telefoon) {
            return NextResponse.json({ error: "Vul alle verplichte velden in." }, { status: 400 });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
        }
        if (!Number.isInteger(aantalPersonen) || aantalPersonen < 1 || aantalPersonen > 20) {
            return NextResponse.json({ error: "Vul een geldig aantal personen in." }, { status: 400 });
        }

        const appData = await getAppDataFresh();
        const booking = findBooking(appData.bookings as any[], bookingId);
        if (!booking) {
            return NextResponse.json({ error: "Boeking niet gevonden." }, { status: 404 });
        }
        const bestaand = (booking as any).nachtregistratie;
        if (bestaand?.status === 'verstuurd') {
            return NextResponse.json({ error: "Het formulier is al doorgestuurd naar de camping en kan niet meer gewijzigd worden." }, { status: 403 });
        }

        // Door de beheerder gezette velden (datums/bedrag/opmerkingen) behouden bij een her-opslag.
        const registratie = {
            ...(bestaand || {}),
            status: 'ingevuld',
            betaalwijze,
            huurderNaam,
            adres,
            telefoon,
            email,
            aantalPersonen,
            aankomst: bestaand?.aankomst || booking.checkIn,
            vertrek: bestaand?.vertrek || booking.checkOut,
            bedrag: bestaand?.bedrag ?? berekenBedrag(booking.checkIn, booking.checkOut),
            ingevuldOp: new Date().toISOString(),
        };

        const updatedData = { ...appData } as any;
        updatedData.bookings = (appData.bookings as any[]).map((b: any) =>
            b.id === booking.id ? { ...b, nachtregistratie: registratie } : b
        );

        const kv = getKV();
        await kv.set('veluwe_app_data', updatedData);
        invalidateCache();
        revalidatePath("/", "layout");

        return NextResponse.json({ success: true, nachtregistratie: registratie });
    } catch (error: any) {
        console.error("Nachtregistratie save error:", error);
        return NextResponse.json({ error: "Opslaan mislukt. Probeer het opnieuw." }, { status: 500 });
    }
}
