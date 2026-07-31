import { getAppData, toClientAppData } from "../../utils/db";
import { findBooking } from "../../utils/findBooking";
import { BookingProvider, BookingInfo } from "../../context/BookingContext";
import { notFound } from "next/navigation";
import ClientLayout from "../../components/ClientLayout";
import ExpiredBookingPage from "../../components/ExpiredBookingPage";
import NachtregistratieForm from "../../components/NachtregistratieForm";
import TestBalk from "../../components/TestBalk";
import { cookies } from "next/headers";
import { TEST_COOKIE, leesTestKeuze, pasTestKeuzeToe, TestKeuze } from "../../utils/testModus";

export const revalidate = 60; // Cache guest pages for 60 seconds (ISR)

export default async function BookingLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ bookingId: string }>;
}) {
    const { bookingId: rawId } = await params;
    const appData = await getAppData();

    // Find the current booking
    const booking = findBooking(appData.bookings, rawId);

    // Fallback if URL is invalid
    if (!booking) {
        notFound();
    }

    // Bij de testboeking bepaalt een cookie welke fase we naspelen; de datums
    // worden verschoven zodat alle bestaande logica er vanzelf op reageert.
    const isTest = !!(booking as any).isTest;
    let testKeuze: TestKeuze | null = null;
    let testBooking = booking;
    if (isTest) {
        testKeuze = leesTestKeuze((await cookies()).get(TEST_COOKIE)?.value);
        testBooking = pasTestKeuzeToe(booking, testKeuze);
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

    const language = testBooking.language || 'nl';
    let translatedAppData = appData;
    if (language !== 'nl' && appData.translations && appData.translations[language]) {
        translatedAppData = mergeTranslations(appData, appData.translations[language]);
    }

    // Timezone-aware (Europe/Amsterdam) datum + uur van dit moment
    const { todayAms, hourAms } = (() => {
        const now = new Date();
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Europe/Amsterdam',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', hour12: false,
        }).formatToParts(now);
        const p: Record<string, string> = {};
        parts.forEach(({ type, value }) => { if (type !== 'literal') p[type] = value; });
        return { todayAms: `${p.year}-${p.month}-${p.day}`, hourAms: parseInt(p.hour) };
    })();

    // Check if the booking has expired
    const isExpired = todayAms > testBooking.checkOut ||
        (todayAms === testBooking.checkOut && hourAms >= 12);

    // Vóór (aankomst − 2 dagen) 08:00 uur ziet de gast alleen het nachtregistratieformulier
    const isPreArrival = (() => {
        if ((testBooking as any).nachtregistratie?.status === 'verstuurd') return false;
        const gate = new Date(testBooking.checkIn + "T12:00:00");
        gate.setDate(gate.getDate() - 2);
        const gateDate = gate.toISOString().slice(0, 10);
        if (todayAms < gateDate) return true;
        if (todayAms === gateDate && hourAms < 8) return true;
        return false;
    })();

    const balk = testKeuze ? <TestBalk keuze={testKeuze} /> : null;

    if (isExpired) {
        return (
            <>
            {balk}
            <ExpiredBookingPage
                guestName={testBooking.guestName}
                propertyName={translatedAppData.property?.name || "Veluwe Droom Chalet"}
                content={(translatedAppData as any).expiredPageContent || ""}
                booking={{
                    id: testBooking.id,
                    guestName: testBooking.guestName,
                    checkIn: testBooking.checkIn,
                    checkOut: testBooking.checkOut,
                    keyCode: (translatedAppData?.property as any)?.keyCode || '',
                }}
            />
            </>
        );
    }

    const rawBookingInfo = {
        id: testBooking.id,
        guestName: testBooking.guestName,
        checkIn: testBooking.checkIn,
        checkOut: testBooking.checkOut,
        language: language,
        keyCode: (translatedAppData?.property as any)?.keyCode || '',
        nachtregistratie: (testBooking as any).nachtregistratie || undefined,
    };

    const finalAppData = toClientAppData(translatedAppData);

    const bookingInfo: BookingInfo = rawBookingInfo;

    if (isPreArrival) {
        return (
            <>
            {balk}
            <div style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #f5f0e1 0%, #e8e0cc 50%, #d4cbb0 100%)",
                padding: "20px",
                fontFamily: "'Nunito', sans-serif",
            }}>
                <div style={{ width: "100%", maxWidth: "560px" }}>
                    <NachtregistratieForm
                        bookingId={bookingInfo.id}
                        guestName={bookingInfo.guestName}
                        checkIn={bookingInfo.checkIn}
                        checkOut={bookingInfo.checkOut}
                        lang={language}
                        registratie={bookingInfo.nachtregistratie || null}
                    />
                </div>
            </div>
            </>
        );
    }

    return (
        <BookingProvider booking={bookingInfo} appData={finalAppData}>
            {balk}
            <ClientLayout basePath={`/b/${bookingInfo.id}`} appData={finalAppData} booking={bookingInfo}>
                {children}
            </ClientLayout>
        </BookingProvider>
    );
}
