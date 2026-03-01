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

    return (
        <div className="tab-content active" style={{ padding: 0 }}>
            {/* Groene header balk */}
            <div style={{
                position: "relative",
                width: "100%",
                backgroundColor: "var(--primary-color)",
                borderRadius: "0 0 16px 16px",
                padding: "24px 20px 20px 60px",
                minHeight: "70px",
                display: "flex",
                alignItems: "center",
            }}>
                <Link
                    href={`/b/${bookingId}`}
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "12px",
                        transform: "translateY(-50%)",
                        backgroundColor: "rgba(255,255,255,0.2)",
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
                <h2 style={{
                    color: "white",
                    margin: 0,
                    fontSize: "1.3rem",
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: "bold",
                }}>
                    {parseTemplateString(item.title, booking)}
                </h2>
            </div>

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
