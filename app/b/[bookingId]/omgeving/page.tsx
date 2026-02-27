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
                    <div key={index} className="info-item">
                        <div>
                            <h4 style={{ color: "var(--primary-color)" }}>
                                <a href={restaurant.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                                    {parseTemplateString(restaurant.name, booking)}
                                </a>
                            </h4>
                            <p>{parseTemplateString(restaurant.desc, booking)}</p>
                        </div>
                        {/* @ts-ignore */}
                        <ion-icon name="open-outline" style={{ color: "var(--text-secondary)" }}></ion-icon>
                    </div>
                ))}
            </div>
        </div>
    );
}
