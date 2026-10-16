"use client";

import { useMemo, useState } from "react";
import { bewaarSchoonmaakInstellingen, bewaarSchoonmaker, haalPortaalLink, maakNieuwePin } from "../../actions/schoonmaakActions";
import { STATUS_LABEL, formatEuro, type BeurtMetContext, type SchoonmaakInstellingen, type SchoonmakerPubliek } from "../../utils/schoonmaakTypes";
import { formatDatumNL } from "../../utils/toeristenbelasting";
import BeurtPaneel, { type SchoonmaakBoeking } from "./BeurtPaneel";

export type SchoonmaakData = {
    beurten: BeurtMetContext[];
    schoonmakers: SchoonmakerPubliek[];
    instellingen: SchoonmaakInstellingen;
    boekingen: SchoonmaakBoeking[];
};

const veld: React.CSSProperties = { width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.85rem", backgroundColor: "white", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: "0.78rem", color: "#555", marginBottom: "4px" };
const blok: React.CSSProperties = { marginTop: "18px", backgroundColor: "#f8f7f2", borderRadius: "8px", padding: "12px" };
const blokKop: React.CSSProperties = { cursor: "pointer", fontWeight: "bold", color: "#333" };
const groeneKnop: React.CSSProperties = { backgroundColor: "#4A5D23", color: "white", border: "none", borderRadius: "6px", padding: "8px 14px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" };
const grijzeKnop: React.CSSProperties = { backgroundColor: "#e0e0e0", color: "#333", border: "none", borderRadius: "4px", padding: "5px 10px", cursor: "pointer", fontSize: "0.8rem" };

type Filter = "komend" | "zonder" | "afgekeurd" | "onbetaald" | "alle";

function vandaagIso() {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());
}

export function telt(b: BeurtMetContext) {
    return !!b.schoonmakerId && (b.status === "toegewezen" || b.status === "geaccepteerd" || b.status === "uitgevoerd");
}

export default function SchoonmaakSectie({ data, herlaad, toon }: {
    data: SchoonmaakData | null;
    herlaad: () => Promise<void>;
    toon: (melding: string) => void;
}) {
    const [filter, setFilter] = useState<Filter>("komend");
    const [openId, setOpenId] = useState<string | null>(null);
    const [nieuwOpen, setNieuwOpen] = useState(false);
    const [maand, setMaand] = useState(vandaagIso().slice(0, 7));

    if (!data) return <p style={{ fontSize: "0.9rem", color: "#888", marginTop: "15px" }}>⏳ Schoonmaak laden...</p>;

    const vandaag = vandaagIso();
    const naamVan = (id?: string) => data.schoonmakers.find(s => s.id === id)?.naam;
    const filters: Record<Filter, { label: string; test: (b: BeurtMetContext) => boolean }> = {
        komend: { label: "Komend", test: b => b.datum >= vandaag && b.status !== "vervallen" },
        zonder: { label: "Zonder schoonmaakster", test: b => b.datum >= vandaag && b.status === "open" },
        afgekeurd: { label: "Afgekeurd", test: b => b.status === "afgekeurd" },
        onbetaald: { label: "Niet betaald", test: b => telt(b) && !b.betaald && b.datum <= vandaag },
        alle: { label: "Alle", test: () => true },
    };
    const zichtbaar = data.beurten.filter(filters[filter].test);
    const lijst = filter === "alle" || filter === "onbetaald" ? [...zichtbaar].reverse() : zichtbaar;

    return (
        <div style={{ marginTop: "15px" }}>
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
                {(Object.keys(filters) as Filter[]).map(f => {
                    const aantal = data.beurten.filter(filters[f].test).length;
                    const actief = filter === f;
                    const alarm = (f === "afgekeurd" || f === "zonder") && aantal > 0;
                    return (
                        <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: "20px", border: actief ? "1px solid #4A5D23" : alarm ? "1px solid #f5b5b5" : "1px solid #ddd", backgroundColor: actief ? "#4A5D23" : alarm ? "#fff1f1" : "white", color: actief ? "white" : alarm ? "#b91c1c" : "#666", fontSize: "0.82rem", fontWeight: "bold", cursor: "pointer" }}>
                            {filters[f].label} ({aantal})
                        </button>
                    );
                })}
                <button onClick={() => { setNieuwOpen(true); setOpenId(null); }} style={{ ...groeneKnop, marginLeft: "auto" }}>+ Schoonmaak toevoegen</button>
            </div>

            {nieuwOpen && (
                <BeurtPaneel schoonmakers={data.schoonmakers} boekingen={data.boekingen} instellingen={data.instellingen} onSaved={herlaad} onClose={() => setNieuwOpen(false)} toon={toon} />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: nieuwOpen ? "12px" : 0 }}>
                {lijst.map(b => {
                    const st = STATUS_LABEL[b.status];
                    const isOpen = openId === b.id;
                    return (
                        <div key={b.id} style={{ padding: "10px 12px", backgroundColor: "white", borderRadius: "8px", border: b.status === "afgekeurd" ? "1px solid #f5b5b5" : isOpen ? "1px solid #4A5D23" : "1px solid #eee" }}>
                            <div onClick={() => setOpenId(isOpen ? null : b.id)} style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", cursor: "pointer" }}>
                                <span style={{ fontSize: "0.9rem", color: "#4A5D23", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
                                <strong style={{ minWidth: "86px" }}>{formatDatumNL(b.datum)}</strong>
                                <span style={{ flex: "1 1 160px", color: "#444" }}>
                                    {b.gastNaam ? `Vertrek ${b.gastNaam}` : b.omschrijving || "Losse beurt"}
                                    {b.boekingVerwijderd && <span style={{ marginLeft: "6px", fontSize: "0.7rem", backgroundColor: "#fff7ed", color: "#9a3412", padding: "1px 6px", borderRadius: "8px" }}>boeking verwijderd</span>}
                                </span>
                                <span style={{ color: b.schoonmakerId ? "#333" : "#aaa", fontSize: "0.85rem" }}>{naamVan(b.schoonmakerId) || "nog niemand"}</span>
                                <span style={{ fontSize: "0.72rem", backgroundColor: st.bg, color: st.color, padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>{st.label}</span>
                                <span style={{ fontSize: "0.85rem", color: "#555", minWidth: "70px", textAlign: "right" }}>{formatEuro(b.bedrag)}{b.betaald ? " ✓" : ""}</span>
                            </div>
                            {isOpen && (
                                <BeurtPaneel key={b.bijgewerkt} beurt={b} schoonmakers={data.schoonmakers} boekingen={data.boekingen} instellingen={data.instellingen} onSaved={herlaad} onClose={() => setOpenId(null)} toon={toon} />
                            )}
                        </div>
                    );
                })}
                {lijst.length === 0 && <p style={{ fontSize: "0.9rem", color: "#888", fontStyle: "italic" }}>Geen beurten in deze lijst.</p>}
            </div>

            <Maandoverzicht data={data} maand={maand} setMaand={setMaand} />
            <Schoonmaaksters data={data} herlaad={herlaad} toon={toon} />
            <Instellingen instellingen={data.instellingen} herlaad={herlaad} toon={toon} />
        </div>
    );
}

function Maandoverzicht({ data, maand, setMaand }: { data: SchoonmaakData; maand: string; setMaand: (m: string) => void }) {
    const rijen = useMemo(() => {
        const inMaand = data.beurten.filter(b => telt(b) && b.datum.startsWith(maand));
        return data.schoonmakers.map(s => {
            const mijn = inMaand.filter(b => b.schoonmakerId === s.id);
            const totaal = mijn.reduce((t, b) => t + (b.bedrag || 0), 0);
            const betaald = mijn.filter(b => b.betaald).reduce((t, b) => t + (b.bedrag || 0), 0);
            return { s, aantal: mijn.length, totaal, betaald, open: totaal - betaald };
        }).filter(r => r.aantal > 0);
    }, [data, maand]);

    const totaalOpen = data.beurten.filter(b => telt(b) && !b.betaald && b.datum <= vandaagIso()).reduce((t, b) => t + (b.bedrag || 0), 0);
    const cel: React.CSSProperties = { padding: "6px 8px", borderBottom: "1px solid #eee", textAlign: "right" };

    return (
        <details style={blok}>
            <summary style={blokKop}>📅 Maandoverzicht</summary>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", margin: "12px 0", flexWrap: "wrap" }}>
                <input type="month" value={maand} onChange={e => setMaand(e.target.value)} style={{ ...veld, width: "auto" }} />
                <span style={{ fontSize: "0.82rem", color: "#666" }}>Over alle maanden staat nog {formatEuro(totaalOpen)} open voor uitgevoerde of verstreken beurten.</span>
            </div>
            {rijen.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "#888", fontStyle: "italic" }}>Geen beurten in deze maand.</p>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", backgroundColor: "white", borderRadius: "6px" }}>
                        <thead>
                            <tr style={{ color: "#555" }}>
                                <th style={{ ...cel, textAlign: "left" }}>Schoonmaakster</th>
                                <th style={cel}>Beurten</th>
                                <th style={cel}>Totaal</th>
                                <th style={cel}>Betaald</th>
                                <th style={cel}>Nog te betalen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rijen.map(r => (
                                <tr key={r.s.id}>
                                    <td style={{ ...cel, textAlign: "left" }}>{r.s.naam}</td>
                                    <td style={cel}>{r.aantal}</td>
                                    <td style={cel}>{formatEuro(r.totaal)}</td>
                                    <td style={cel}>{formatEuro(r.betaald)}</td>
                                    <td style={{ ...cel, fontWeight: "bold", color: r.open > 0 ? "#b91c1c" : "#166534" }}>{formatEuro(r.open)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p style={{ fontSize: "0.75rem", color: "#888", margin: "8px 0 0" }}>Telt beurten die toegewezen, geaccepteerd of uitgevoerd zijn. Afgekeurde en vervallen beurten tellen niet mee.</p>
        </details>
    );
}

function Schoonmaaksters({ data, herlaad, toon }: { data: SchoonmaakData; herlaad: () => Promise<void>; toon: (m: string) => void }) {
    const leeg = { id: "", naam: "", email: "", telefoon: "", tarief: "", actief: true };
    const [form, setForm] = useState<typeof leeg | null>(null);
    const [toegang, setToegang] = useState<{ naam: string; link: string; pin?: string } | null>(null);
    const [gekopieerd, setGekopieerd] = useState(false);

    const opslaan = async () => {
        if (!form) return;
        toon("⏳ Opslaan...");
        const res = await bewaarSchoonmaker({ id: form.id || undefined, naam: form.naam, email: form.email, telefoon: form.telefoon, tarief: Number(String(form.tarief).replace(",", ".")), actief: form.actief });
        if (!res.success) { toon("❌ " + res.error); return; }
        toon("✅ Schoonmaakster opgeslagen");
        if (res.pin && res.link) setToegang({ naam: form.naam.trim(), link: res.link, pin: res.pin });
        setForm(null);
        await herlaad();
    };

    const nieuwePin = async (s: SchoonmakerPubliek) => {
        const res = await maakNieuwePin(s.id);
        if (!res.success || !res.pin || !res.link) { toon("❌ " + (res.error || "Mislukt")); return; }
        setToegang({ naam: s.naam, link: res.link, pin: res.pin });
        await herlaad();
    };

    const toonLink = async (s: SchoonmakerPubliek) => {
        const link = await haalPortaalLink(s.id);
        if (link) setToegang({ naam: s.naam, link });
    };

    const berichtTekst = toegang ? [
        `Hoi ${toegang.naam},`,
        ``,
        `Via deze link zie je de schoonmaakbeurten die ik aan je toewijs:`,
        toegang.link,
        toegang.pin ? `Je pincode is ${toegang.pin}.` : `Je pincode heb je eerder van me gekregen.`,
        ``,
        `Groet, Kitty`,
    ].join("\n") : "";

    return (
        <details style={blok}>
            <summary style={blokKop}>👩 Schoonmaaksters ({data.schoonmakers.filter(s => s.actief).length})</summary>

            {toegang && (
                <div style={{ marginTop: "12px", backgroundColor: "white", border: "2px solid #4A5D23", borderRadius: "8px", padding: "12px" }}>
                    <strong style={{ color: "#4A5D23" }}>Stuur dit naar {toegang.naam}</strong>
                    {toegang.pin && <p style={{ fontSize: "0.82rem", color: "#92400e", margin: "6px 0" }}>De pincode zie je alleen nu. Kwijt? Maak dan een nieuwe.</p>}
                    <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.85rem", backgroundColor: "#f8f7f2", padding: "10px", borderRadius: "6px", margin: "8px 0" }}>{berichtTekst}</pre>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => { navigator.clipboard.writeText(berichtTekst); setGekopieerd(true); setTimeout(() => setGekopieerd(false), 2000); }} style={groeneKnop}>{gekopieerd ? "✓ Gekopieerd" : "Kopieer bericht"}</button>
                        <button onClick={() => setToegang(null)} style={grijzeKnop}>Sluiten</button>
                    </div>
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                {data.schoonmakers.map(s => (
                    <div key={s.id} style={{ backgroundColor: "white", borderRadius: "8px", padding: "10px 12px", border: "1px solid #eee", opacity: s.actief ? 1 : 0.6, display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 200px" }}>
                            <strong>{s.naam}</strong>{!s.actief && <span style={{ fontSize: "0.72rem", color: "#999", marginLeft: "6px" }}>inactief</span>}
                            <div style={{ fontSize: "0.8rem", color: "#777" }}>{s.email}{s.telefoon ? ` · ${s.telefoon}` : ""} · {formatEuro(s.tarief)} per beurt</div>
                        </div>
                        <button onClick={() => setForm({ id: s.id, naam: s.naam, email: s.email, telefoon: s.telefoon, tarief: String(s.tarief), actief: s.actief })} style={grijzeKnop}>Bewerk</button>
                        <button onClick={() => toonLink(s)} style={grijzeKnop}>Link</button>
                        <button onClick={() => nieuwePin(s)} style={grijzeKnop}>Nieuwe pincode</button>
                    </div>
                ))}
                {data.schoonmakers.length === 0 && <p style={{ fontSize: "0.85rem", color: "#888", fontStyle: "italic", margin: 0 }}>Nog geen schoonmaaksters.</p>}
            </div>

            {form ? (
                <div style={{ marginTop: "12px", backgroundColor: "white", borderRadius: "8px", padding: "12px", border: "1px solid #4A5D23" }}>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 160px" }}><label style={label}>Naam</label><input value={form.naam} onChange={e => setForm({ ...form, naam: e.target.value })} style={veld} /></div>
                        <div style={{ flex: "1 1 200px" }}><label style={label}>E-mailadres</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={veld} /></div>
                        <div style={{ flex: "1 1 140px" }}><label style={label}>Telefoon</label><input value={form.telefoon} onChange={e => setForm({ ...form, telefoon: e.target.value })} style={veld} /></div>
                        <div style={{ flex: "1 1 100px" }}><label style={label}>Tarief per beurt (€)</label><input inputMode="decimal" value={form.tarief} onChange={e => setForm({ ...form, tarief: e.target.value })} style={veld} /></div>
                    </div>
                    {form.id && (
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", marginTop: "10px" }}>
                            <input type="checkbox" checked={form.actief} onChange={e => setForm({ ...form, actief: e.target.checked })} /> Actief (inactief = kan niet meer inloggen en staat niet in de keuzelijst)
                        </label>
                    )}
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                        <button onClick={opslaan} style={groeneKnop}>{form.id ? "Opslaan" : "Toevoegen"}</button>
                        <button onClick={() => setForm(null)} style={grijzeKnop}>Annuleer</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setForm(leeg)} style={{ ...groeneKnop, marginTop: "12px" }}>+ Schoonmaakster toevoegen</button>
            )}
        </details>
    );
}

function Instellingen({ instellingen, herlaad, toon }: { instellingen: SchoonmaakInstellingen; herlaad: () => Promise<void>; toon: (m: string) => void }) {
    const [vertrektijd, setVertrektijd] = useState(instellingen.vertrektijd);
    const [meldingEmail, setMeldingEmail] = useState(instellingen.meldingEmail);

    const opslaan = async () => {
        const res = await bewaarSchoonmaakInstellingen({ vertrektijd, meldingEmail });
        if (!res.success) { toon("❌ " + res.error); return; }
        toon("✅ Instellingen opgeslagen");
        await herlaad();
    };

    return (
        <details style={blok}>
            <summary style={blokKop}>⚙️ Instellingen schoonmaak</summary>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                <div style={{ flex: "1 1 140px" }}>
                    <label style={label}>Standaard vertrektijd gast</label>
                    <input type="time" value={vertrektijd} onChange={e => setVertrektijd(e.target.value)} style={veld} />
                </div>
                <div style={{ flex: "2 1 240px" }}>
                    <label style={label}>E-mail voor meldingen (bijv. bij afkeuren)</label>
                    <input type="email" value={meldingEmail} onChange={e => setMeldingEmail(e.target.value)} style={veld} />
                </div>
            </div>
            <button onClick={opslaan} style={{ ...groeneKnop, marginTop: "12px" }}>Opslaan</button>
        </details>
    );
}
