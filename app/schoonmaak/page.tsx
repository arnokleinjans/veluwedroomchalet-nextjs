import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Schoonmaak · Veluwe Droomchalet",
    robots: { index: false, follow: false },
};

export default function SchoonmaakZonderLink() {
    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f4f6f0", padding: "16px" }}>
            <p style={{ maxWidth: "420px", textAlign: "center", color: "#555" }}>
                Gebruik de persoonlijke link die je van Kitty hebt gekregen.
            </p>
        </div>
    );
}
