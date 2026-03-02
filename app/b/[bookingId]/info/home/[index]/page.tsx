import { getAppData } from "../../../../../utils/db";
import { parseTemplateString } from "../../../../../utils/templateParser";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomeItemDetail({ params }: { params: { bookingId: string, index: string } }) {
    const resolvedParams = await Promise.resolve(params);
    const bookingId = (resolvedParams.bookingId || "").toUpperCase();
    const itemIndex = parseInt(resolvedParams.index, 10);

    const appData = await getAppData();
    const booking = appData.bookings.find((b: any) => b.id === bookingId) || null;
    const insights = appData.insights || [];
    const item = insights[itemIndex] as any;

    if (!item || !item.detailContent) {
        return (
            <div className="tab-content active" style={{ padding: "20px", textAlign: "center" }}>
                <p>Item niet gevonden.</p>
                <Link href={`/b/${bookingId}`} style={{ color: "var(--primary-color)" }}>← Terug naar Home</Link>
            </div>
        );
    }

    const hasImage = item.image && item.image.length > 0;

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
                <div
                    className="rich-content"
                    dangerouslySetInnerHTML={{ __html: parseTemplateString(item.detailContent || "", booking) }}
                />
            </div>
        </div>
    );
}
