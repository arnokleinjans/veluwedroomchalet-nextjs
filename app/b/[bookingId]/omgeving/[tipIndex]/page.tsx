import { getAppData } from "../../../../utils/db";
import { parseTemplateString } from "../../../../utils/templateParser";
import Link from "next/link";
import WidgetEmbed from "../../../../components/WidgetEmbed";

export const dynamic = "force-dynamic";

export default async function OmgevingDetail({ params }: { params: { bookingId: string, tipIndex: string } }) {
    const resolvedParams = await Promise.resolve(params);
    const bookingId = (resolvedParams.bookingId || "").toUpperCase();
    const tipIndex = parseInt(resolvedParams.tipIndex, 10);

    const appData = await getAppData();
    const booking = appData.bookings.find((b: any) => b.id === bookingId) || null;
    const items = (appData as any).omgeving || (appData as any).restaurants || [];
    const tip = items[tipIndex];

    if (!tip) {
        return (
            <div className="tab-content active" style={{ padding: "20px", textAlign: "center" }}>
                <p>Tip niet gevonden.</p>
                <Link href={`/b/${bookingId}/omgeving`} style={{ color: "var(--primary-color)" }}>← Terug naar Omgeving</Link>
            </div>
        );
    }

    const hasImage = tip.image && tip.image.length > 0;

    return (
        <div className="tab-content active" style={{ padding: 0 }}>
            {/* Header met afbeelding */}
            {hasImage ? (
                <div style={{
                    position: "relative",
                    width: "100%",
                    height: "200px",
                    borderRadius: "0 0 16px 16px",
                    overflow: "hidden",
                }}>
                    <img
                        src={`/${tip.image}`}
                        alt={tip.name}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                    <Link
                        href={`/b/${bookingId}/omgeving`}
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
                        href={`/b/${bookingId}/omgeving`}
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
                <div className="rich-content">
                    <WidgetEmbed code={parseTemplateString(tip.desc, booking)} />
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "20px" }}>
                    {tip.url && tip.url.length > 0 && (
                        <a
                            href={tip.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "10px 20px",
                                backgroundColor: "var(--primary-color)",
                                color: "white",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontWeight: "bold",
                                fontSize: "0.95rem",
                            }}
                        >
                            🌐 Bekijk website
                        </a>
                    )}
                    {tip.adres && tip.adres.length > 0 && (
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tip.adres)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "10px 20px",
                                backgroundColor: "var(--secondary-color)",
                                color: "white",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontWeight: "bold",
                                fontSize: "0.95rem",
                            }}
                        >
                            📍 Route
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
