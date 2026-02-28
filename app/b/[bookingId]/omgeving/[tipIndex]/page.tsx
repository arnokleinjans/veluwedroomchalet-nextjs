import { getAppData } from "../../../../utils/db";
import { parseTemplateString } from "../../../../utils/templateParser";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OmgevingDetail({ params }: { params: { bookingId: string, tipIndex: string } }) {
    const resolvedParams = await Promise.resolve(params);
    const bookingId = (resolvedParams.bookingId || "").toUpperCase();
    const tipIndex = parseInt(resolvedParams.tipIndex, 10);

    const appData = await getAppData();
    const booking = appData.bookings.find((b: any) => b.id === bookingId) || null;
    const items = appData.omgeving || appData.restaurants || [];
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
            {/* Header met afbeelding en terugknop */}
            <div style={{
                position: "relative",
                width: "100%",
                height: "200px",
                backgroundColor: hasImage ? "transparent" : "var(--primary-color)",
                borderRadius: "0 0 16px 16px",
                overflow: "hidden",
            }}>
                {hasImage && (
                    <img
                        src={`/${tip.image}`}
                        alt={tip.name}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                )}
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

            {/* Content */}
            <div style={{ padding: "20px" }}>
                <h2 style={{ color: "var(--primary-color)", marginBottom: "12px", fontSize: "1.4rem" }}>
                    {parseTemplateString(tip.name, booking)}
                </h2>
                <div
                    className="rich-content"
                    dangerouslySetInnerHTML={{ __html: parseTemplateString(tip.desc, booking) }}
                />

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
