"use client";

import { useEffect, useState } from "react";
import { haalLandingspaginaHeaders, kiesLandingspaginaHeader, type LandingspaginaStand } from "../actions/landingspaginaActions";

export default function LandingspaginaHeader({ toonMelding }: { toonMelding: (melding: string) => void }) {
    const [stand, setStand] = useState<LandingspaginaStand | null>(null);
    const [keuze, setKeuze] = useState("");
    const [bezig, setBezig] = useState(false);

    const laad = async () => {
        try {
            const s = await haalLandingspaginaHeaders();
            setStand(s);
            setKeuze(s.actief);
        } catch (e) {
            console.error("Headers landingspagina laden mislukt:", e);
        }
    };
    useEffect(() => { laad(); }, []);

    const opslaan = async () => {
        setBezig(true);
        toonMelding("⏳ Aan het opslaan...");
        const res = await kiesLandingspaginaHeader(keuze);
        setBezig(false);
        if (res.success) {
            setStand(s => s && { ...s, actief: keuze });
            toonMelding("✅ Header opgeslagen. Binnen een kwart minuut staat hij op de landingspagina.");
        } else {
            toonMelding("❌ " + res.error);
        }
    };

    const link: React.CSSProperties = { color: "#4A5D23", fontSize: "0.85rem", fontWeight: "bold", whiteSpace: "nowrap" };

    return (
        <details className="sectie" style={{ border: "1px solid #eee", borderRadius: "12px", padding: "14px 18px" }}>
            <summary className="sectie-kop" style={{ fontSize: "1.15rem", color: "#333", cursor: "pointer", fontWeight: "bold", listStylePosition: "inside", outline: "none" }}>🖼️ Header</summary>
            <div style={{ marginTop: "15px" }}>
                {!stand && <p style={{ color: "#888", fontSize: "0.9rem" }}>Laden...</p>}
                {stand?.fout && (
                    <div style={{ color: "#a3352a", backgroundColor: "#fff4f2", border: "1px solid #e5b4ac", borderRadius: "6px", padding: "8px 10px", fontSize: "0.9rem" }}>
                        {stand.fout} <button onClick={laad} style={{ background: "none", border: "none", padding: 0, color: "#4A5D23", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>Opnieuw proberen</button>
                    </div>
                )}
                {stand && stand.headers.length > 0 && (
                    <>
                        <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "12px" }}>De header bovenaan {stand.adres.replace(/^https?:\/\//, "")}. Bekijken laat een header zien zonder hem actief te maken.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {stand.headers.map(h => (
                                <label key={h.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", border: keuze === h.id ? "1px solid #4A5D23" : "1px solid #ddd", backgroundColor: keuze === h.id ? "#f3f8ec" : "white" }}>
                                    <input type="radio" name="landingspagina-header" value={h.id} checked={keuze === h.id} onChange={() => setKeuze(h.id)} />
                                    <span style={{ flex: 1, minWidth: 0 }}>
                                        <strong>{h.naam}</strong>
                                        {stand.actief === h.id && <span style={{ marginLeft: "8px", fontSize: "0.72rem", padding: "2px 9px", borderRadius: "12px", fontWeight: "bold", backgroundColor: "#dcfce7", color: "#166534" }}>Actief</span>}
                                        {h.omschrijving && <span style={{ display: "block", color: "#666", fontSize: "0.85rem", marginTop: "2px" }}>{h.omschrijving}</span>}
                                    </span>
                                    <a href={`${stand.adres}/#header-${h.id}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={link}>Bekijken ↗</a>
                                </label>
                            ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginTop: "14px", flexWrap: "wrap" }}>
                            <a href={stand.adres} target="_blank" rel="noopener noreferrer" style={link}>Open de landingspagina ↗</a>
                            <button onClick={opslaan} disabled={bezig || keuze === stand.actief} style={{ backgroundColor: "#333", color: "white", padding: "10px 20px", borderRadius: "6px", border: "none", fontWeight: "bold", cursor: bezig || keuze === stand.actief ? "default" : "pointer", opacity: bezig || keuze === stand.actief ? 0.5 : 1 }}>Opslaan</button>
                        </div>
                    </>
                )}
            </div>
        </details>
    );
}
