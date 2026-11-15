"use client";

import { useEffect, useState } from "react";
import { haalLandingspaginaPromos, kiesLandingspaginaPromo, type LandingspaginaPromoStand } from "../actions/landingspaginaActions";

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const dagTekst = (iso: string) => `${Number(iso.slice(8, 10))} ${MAANDEN[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const vandaag = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

export default function LandingspaginaPromo({ toonMelding }: { toonMelding: (melding: string) => void }) {
    const [stand, setStand] = useState<LandingspaginaPromoStand | null>(null);
    const [keuze, setKeuze] = useState("");
    const [bezig, setBezig] = useState(false);

    const laad = async () => {
        try {
            const s = await haalLandingspaginaPromos();
            setStand(s);
            setKeuze(s.actief);
        } catch (e) {
            console.error("Promo's landingspagina laden mislukt:", e);
        }
    };
    useEffect(() => { laad(); }, []);

    const opslaan = async () => {
        setBezig(true);
        toonMelding("⏳ Aan het opslaan...");
        const res = await kiesLandingspaginaPromo(keuze);
        setBezig(false);
        if (res.success) {
            setStand(s => s && { ...s, actief: keuze });
            toonMelding(keuze ? "✅ Promo opgeslagen. Binnen een kwart minuut staat hij op de landingspagina." : "✅ Opgeslagen. De landingspagina toont geen promo meer.");
        } else {
            toonMelding("❌ " + res.error);
        }
    };

    const link: React.CSSProperties = { color: "#4A5D23", fontSize: "0.85rem", fontWeight: "bold", whiteSpace: "nowrap" };
    const rij = (gekozen: boolean): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", border: gekozen ? "1px solid #4A5D23" : "1px solid #ddd", backgroundColor: gekozen ? "#f3f8ec" : "white" });
    const label = (tekst: string, groen: boolean) => <span style={{ marginLeft: "8px", fontSize: "0.72rem", padding: "2px 9px", borderRadius: "12px", fontWeight: "bold", backgroundColor: groen ? "#dcfce7" : "#fee2e2", color: groen ? "#166534" : "#991b1b" }}>{tekst}</span>;

    return (
        <details className="sectie" style={{ border: "1px solid #eee", borderRadius: "12px", padding: "14px 18px" }}>
            <summary className="sectie-kop" style={{ fontSize: "1.15rem", color: "#333", cursor: "pointer", fontWeight: "bold", listStylePosition: "inside", outline: "none" }}>🎬 Promo</summary>
            <div style={{ marginTop: "15px" }}>
                {!stand && <p style={{ color: "#888", fontSize: "0.9rem" }}>Laden...</p>}
                {stand?.fout && (
                    <div style={{ color: "#a3352a", backgroundColor: "#fff4f2", border: "1px solid #e5b4ac", borderRadius: "6px", padding: "8px 10px", fontSize: "0.9rem" }}>
                        {stand.fout} <button onClick={laad} style={{ background: "none", border: "none", padding: 0, color: "#4A5D23", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>Opnieuw proberen</button>
                    </div>
                )}
                {stand && !stand.fout && (
                    <>
                        <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "12px" }}>Een animatie als pop-up op {stand.adres.replace(/^https?:\/\//, "")}. De bezoeker ziet hem direct bij het openen van de pagina. Er staat er hooguit één aan.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <label style={rij(keuze === "")}>
                                <input type="radio" name="landingspagina-promo" value="" checked={keuze === ""} onChange={() => setKeuze("")} />
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <strong>Geen promo</strong>
                                    {stand.actief === "" && label("Actief", true)}
                                </span>
                            </label>
                            {stand.promos.map(p => {
                                const verlopen = !!p.tot && vandaag() > p.tot;
                                return (
                                    <label key={p.id} style={rij(keuze === p.id)}>
                                        <input type="radio" name="landingspagina-promo" value={p.id} checked={keuze === p.id} onChange={() => setKeuze(p.id)} />
                                        <span style={{ flex: 1, minWidth: 0 }}>
                                            <strong>{p.naam}</strong>
                                            {stand.actief === p.id && !verlopen && label("Actief", true)}
                                            {verlopen && label("Verlopen", false)}
                                            {p.omschrijving && <span style={{ display: "block", color: "#666", fontSize: "0.85rem", marginTop: "2px" }}>{p.omschrijving}</span>}
                                            {p.tot && <span style={{ display: "block", color: verlopen ? "#991b1b" : "#666", fontSize: "0.8rem", marginTop: "2px" }}>{verlopen ? `Stopte vanzelf na ${dagTekst(p.tot)}.` : `Stopt vanzelf na ${dagTekst(p.tot)}.`}</span>}
                                        </span>
                                        <a href={`${stand.adres}/#promo-${p.id}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={link}>Bekijken ↗</a>
                                    </label>
                                );
                            })}
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
                            <button onClick={opslaan} disabled={bezig || keuze === stand.actief} style={{ backgroundColor: "#333", color: "white", padding: "10px 20px", borderRadius: "6px", border: "none", fontWeight: "bold", cursor: bezig || keuze === stand.actief ? "default" : "pointer", opacity: bezig || keuze === stand.actief ? 0.5 : 1 }}>Opslaan</button>
                        </div>
                    </>
                )}
            </div>
        </details>
    );
}
