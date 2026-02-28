import { getAppData } from "../../../utils/db";
import { parseTemplateString } from "../../../utils/templateParser";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Omgeving({ params }: { params: { bookingId: string } }) {
    const resolvedParams = await Promise.resolve(params);
    const bookingId = (resolvedParams.bookingId || "").toUpperCase();

    const appData = await getAppData();
    const booking = appData.bookings.find((b: any) => b.id === bookingId) || null;
    const items = (appData as any).omgeving || (appData as any).restaurants || [];

    return (
        <div className="tab-content active" id="omgeving-tab">
            <div className="info-list" id="omgeving-container">
                {items.map((tip: any, index: number) => (
                    <Link
                        key={index}
                        href={`/b/${bookingId}/omgeving/${index}`}
                        className="info-item"
                        style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", cursor: "pointer", gap: "14px", padding: "12px" }}
                    >
                        {tip.image ? (
                            <img
                                src={`/${tip.image}`}
                                alt={tip.name}
                                style={{
                                    width: "80px",
                                    height: "80px",
                                    borderRadius: "10px",
                                    objectFit: "cover",
                                    flexShrink: 0,
                                }}
                            />
                        ) : (
                            <div style={{
                                width: "80px",
                                height: "80px",
                                borderRadius: "10px",
                                backgroundColor: "var(--primary-color)",
                                opacity: 0.15,
                                flexShrink: 0,
                            }} />
                        )}
                        <h4 style={{ color: "var(--primary-color)", flex: 1, margin: 0 }}>
                            {parseTemplateString(tip.name, booking)}
                        </h4>
                        {/* @ts-ignore */}
                        <ion-icon name="chevron-forward-outline" style={{ fontSize: "1.2rem", color: "var(--text-secondary)", flexShrink: 0 }}></ion-icon>
                    </Link>
                ))}
            </div>
        </div>
    );
}
