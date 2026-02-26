import { getAppData } from "../../../utils/db";

export const dynamic = "force-dynamic";

export default async function Omgeving() {
    const appData = await getAppData();
    return (
        <div className="tab-content active" id="omgeving-tab">
            <div className="info-list" id="restaurants-container">
                {appData.restaurants.map((restaurant, index) => (
                    <div key={index} className="info-item">
                        <div>
                            <h4 style={{ color: "var(--primary-color)" }}>
                                <a href={restaurant.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                                    {restaurant.name}
                                </a>
                            </h4>
                            <p>{restaurant.desc}</p>
                        </div>
                        {/* @ts-ignore */}
                        <ion-icon name="open-outline" style={{ color: "var(--text-secondary)" }}></ion-icon>
                    </div>
                ))}
            </div>
            <div style={{ textAlign: "center", marginTop: "30px", padding: "20px" }}>
                {/* @ts-ignore */}
                <ion-icon name="map-outline" style={{ fontSize: "40px", color: "var(--accent-color)" }}></ion-icon>
                <p style={{ color: "var(--text-secondary)", marginTop: "10px" }}>
                    Meer lokale tips volgen binnenkort!
                </p>
            </div>
        </div>
    );
}
