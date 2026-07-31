import { getTranslatedAppData } from "../../../utils/db";
import { findBooking } from "../../../utils/findBooking";
import { metTestOverride } from "../../../utils/testModusServer";
import { parseTemplateString } from "../../../utils/templateParser";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Omgeving({ params }: { params: { bookingId: string } }) {
    const resolvedParams = await Promise.resolve(params);
    const bookingId = (resolvedParams.bookingId || "").toUpperCase();

    const appData = await getTranslatedAppData(bookingId);
    const rawBooking = (await metTestOverride(findBooking(appData.bookings, bookingId))).booking;
    const booking = rawBooking ? { ...rawBooking, keyCode: (appData?.property as any)?.keyCode || '' } : null;
    const items = (appData as any).omgeving || (appData as any).restaurants || [];

    return (
        <div className="tab-content active" id="omgeving-tab">
            <div className="py-6 md:py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="omgeving-container">
                    {items.map((tip: any, index: number) => (
                        <Link
                            key={index}
                            href={`/b/${bookingId}/omgeving/${index}`}
                            className="card clickable m-0 relative overflow-hidden transition-transform z-10 hover:scale-[1.02]"
                            style={{
                                textDecoration: "none",
                                color: "inherit",
                                display: "block",
                                padding: 0,
                                height: "280px",
                                backgroundImage: tip.image ? `url('/${tip.image}')` : 'none',
                                backgroundColor: tip.image ? 'transparent' : '#eee',
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                borderRadius: "16px",
                                boxSizing: "border-box",
                                border: "none"
                            }}
                        >
                            {!tip.image && (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                    {/* @ts-ignore */}
                                    <ion-icon name="image-outline" style={{ fontSize: "3rem" }}></ion-icon>
                                </div>
                            )}

                            {/* Floating glassmorphism overlay box matched to hugging mockup design */}
                            <div className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] w-fit backdrop-blur-md rounded-[18px] shadow-lg border border-white/50 z-20" style={{ backgroundColor: "rgba(237, 232, 219, 0.70)", padding: "20px 24px" }}>
                                {/* Row 1: Title and Arrow */}
                                <div className="flex justify-between items-start mb-2 w-full">
                                    <h4 className="m-0 text-[#3a471b] font-semibold text-[1.05rem] leading-snug flex-1 mr-4">
                                        {parseTemplateString(tip.name, booking)}
                                    </h4>
                                    {/* @ts-ignore */}
                                    <ion-icon name="chevron-forward-outline" style={{ fontSize: "1.3rem", color: "#444" }}></ion-icon>
                                </div>

                                {/* Row 2 + 3 Wrapper */}
                                <div>
                                    {/* Row 2: Compass distance */}
                                    {tip.distance && (
                                        <div className="flex items-center gap-1.5 text-[0.9rem] text-gray-700 mb-2">
                                            {/* @ts-ignore */}
                                            <ion-icon name="compass-outline" style={{ fontSize: "1.1rem", flexShrink: 0, color: "#555" }}></ion-icon>
                                            {tip.distance} km
                                        </div>
                                    )}
                                    
                                    {/* Row 3: Travel Times */}
                                    {(tip.walkTime || tip.bikeTime || tip.carTime) && (
                                        <div className="flex items-center gap-4 text-[0.85rem] text-[#555]">
                                            {tip.walkTime && (
                                                <div className="flex items-center gap-1 min-w-0">
                                                    {/* @ts-ignore */}
                                                    <ion-icon name="walk-outline" style={{ fontSize: "1.15rem", color: "#666", flexShrink: 0 }}></ion-icon>
                                                    <span className="whitespace-nowrap">{tip.walkTime} min</span>
                                                </div>
                                            )}
                                            {tip.bikeTime && (
                                                <div className="flex items-center gap-1 min-w-0">
                                                    {/* @ts-ignore */}
                                                    <ion-icon name="bicycle-outline" style={{ fontSize: "1.15rem", color: "#666", flexShrink: 0 }}></ion-icon>
                                                    <span className="whitespace-nowrap">{tip.bikeTime} min</span>
                                                </div>
                                            )}
                                            {tip.carTime && (
                                                <div className="flex items-center gap-1 min-w-0">
                                                    {/* @ts-ignore */}
                                                    <ion-icon name="car-outline" style={{ fontSize: "1.15rem", color: "#666", flexShrink: 0 }}></ion-icon>
                                                    <span className="whitespace-nowrap">{tip.carTime} min</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
