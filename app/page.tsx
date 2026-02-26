import { appData } from "./utils/mockData";

export default function RootLanding() {
    return (
        <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#f4f4f4", padding: "20px", textAlign: "center" }}>
            <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", maxWidth: "500px" }}>
                <h1 style={{ color: "var(--primary-color)", fontFamily: "'Lora', serif", marginBottom: "15px" }}>Welkom bij {appData.property.name}</h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "25px", lineHeight: "1.6" }}>
                    U heeft een gepersonaliseerde link nodig om uw verblijfsgegevens en de digitale conciërge te openen.
                    <br /><br />
                    Controleer alstublieft het welkomstbericht dat u van <strong>{appData.property.host.name}</strong> heeft ontvangen voor uw unieke toegang-URL.
                </p>
                <div style={{ backgroundColor: "#f9f9f9", padding: "15px", borderRadius: "8px", border: "1px dashed #ccc", fontSize: "0.9rem", color: "#666" }}>
                    Voorbeeld: <em>jouwsite.nl/b/NAAM-ABCD</em>
                </div>
            </div>
        </div>
    );
}
