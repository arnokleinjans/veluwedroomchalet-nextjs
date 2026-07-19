import { getTranslatedAppData } from "../../../../../utils/db";
import { findBooking } from "../../../../../utils/findBooking";
import { parseTemplateString } from "../../../../../utils/templateParser";
import Link from "next/link";
import WidgetEmbed from "../../../../../components/WidgetEmbed";

export const dynamic = "force-dynamic";

export default async function HomeItemDetail({ params }: { params: { bookingId: string, index: string } }) {
    const resolvedParams = await Promise.resolve(params);
    const bookingId = (resolvedParams.bookingId || "").toUpperCase();
    const itemIndex = parseInt(resolvedParams.index, 10);

    const appData = await getTranslatedAppData(bookingId);
    const rawBooking = findBooking(appData.bookings, bookingId);
    const booking = rawBooking ? { ...rawBooking, keyCode: (appData?.property as any)?.keyCode || '' } : null;
    const insights = appData.insights || [];
    const item = insights[itemIndex] as any;
    const hasContent = (item?.detailContent && item.detailContent.trim() !== '' && item.detailContent.trim() !== '<p></p>' && item.detailContent.trim() !== '<p><br></p>') || (item?.widgetCode && item.widgetCode.trim() !== '');

    if (!item || !hasContent) {
        return (
            <div className="tab-content active" style={{ padding: "20px", textAlign: "center" }}>
                <p>Item niet gevonden.</p>
                <Link href={`/b/${bookingId}`} style={{ color: "var(--primary-color)" }}>← Terug naar Home</Link>
            </div>
        );
    }

    const hasImage = item.image && item.image.length > 0;

    return (
        <div className="tab-content active" style={{ padding: 0, display: "flex", justifyItems: "center", justifyContent: "center" }}>
            <div className="max-w-4xl w-full min-h-screen md:min-h-[auto] md:rounded-2xl md:shadow-sm md:overflow-hidden" style={{ background: "rgba(237, 232, 219, 0.70)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "none" }}>
                {/* Header met afbeelding */}
                {hasImage ? (
                    <div className="rounded-b-[16px] md:rounded-none" style={{
                        position: "relative",
                        width: "100%",
                        height: "200px",
                        overflow: "hidden",
                    }}>
                        <img
                            src={`/${item.image}`}
                            alt={item.title}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />
                        <Link
                            href={`/b/${bookingId}`}
                            style={{
                                position: "absolute",
                                top: "12px",
                                left: "12px",
                                backgroundColor: "rgba(0,0,0,0.45)",
                                color: "white",
                                borderRadius: "50%",
                                width: "36px",
                                height: "36px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                textDecoration: "none",
                                fontSize: "1.2rem",
                                backdropFilter: "blur(4px)",
                            }}
                        >
                            ←
                        </Link>
                    </div>
                ) : (
                    <div style={{ padding: "12px 12px 0" }}>
                        <Link
                            href={`/b/${bookingId}`}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                color: "var(--primary-color)",
                                textDecoration: "none",
                                fontSize: "0.95rem",
                                fontWeight: "bold",
                            }}
                        >
                            ← Terug
                        </Link>
                    </div>
                )}

                {/* Content */}
                <div style={{ padding: "20px" }}>
                    <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: "var(--primary-color)" }}>
                        {parseTemplateString(item.title || "", booking)}
                    </h2>
                    <div className="rich-content">
                        <WidgetEmbed code={parseTemplateString(item.detailContent || "", booking)} />
                    </div>
                </div>
            </div>
        </div>
    );
}
