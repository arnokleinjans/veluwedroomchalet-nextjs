import { getAppData } from "../../../utils/db";
import { parseTemplateString } from "../../../utils/templateParser";

export const dynamic = "force-dynamic";

export default async function Omgeving({ params }: { params: { bookingId: string } }) {
    const resolvedParams = await Promise.resolve(params);
    const bookingId = (resolvedParams.bookingId || "").toUpperCase();

    const appData = await getAppData();
    const booking = appData.bookings.find((b: any) => b.id === bookingId) || null;

    return (
        <div className="tab-content active" id="omgeving-tab">
            <div className="info-list" id="restaurants-container">
                {appData.restaurants.map((restaurant: any, index: number) => (
                    <a
                        key={index}
                        href={restaurant.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="info-item"
                        style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", cursor: "pointer" }}
                    >
                        <div style={{ flex: 1 }}>
                            <h4 style={{ color: "var(--primary-color)" }}>
                                {parseTemplateString(restaurant.name, booking)}
                            </h4>
                            <p>{parseTemplateString(restaurant.desc, booking)}</p>
                        </div>
                        {/* @ts-ignore */}
                        <ion-icon name="chevron-forward-outline" style={{ fontSize: "1.2rem", color: "var(--text-secondary)", flexShrink: 0, marginLeft: "10px" }}></ion-icon>
                    </a>
                ))}
            </div>
        </div>
    );
}
