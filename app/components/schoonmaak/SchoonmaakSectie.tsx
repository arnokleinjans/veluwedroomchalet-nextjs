"use client";

import { useMemo, useState } from "react";
import { bewaarSchoonmaakInstellingen, bewaarSchoonmaker, haalPortaalLink, maakNieuwePin } from "../../actions/schoonmaakActions";
import { STATUS_LABEL, formatEuro, type BeurtMetContext, type BeurtStatus, type SchoonmaakInstellingen, type SchoonmakerPubliek } from "../../utils/schoonmaakTypes";
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

type Periode = "komend" | "afgelopen" | "alles";
type Betaling = "alle" | "tebetalen" | "betaald";
type StatusKeuze = BeurtStatus | "alle" | "nietafgemeld";

const PERIODES: Record<Periode, string> = { komend: "Komend", afgelopen: "Afgelopen", alles: "Alles" };

function vandaagIso() {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());
}

export function gepland(b: BeurtMetContext) {
    return !!b.schoonmakerId && (b.status === "toegewezen" || b.status === "geaccepteerd");
}

// Betalen gebeurt pas als het werk gedaan is: alleen een uitgevoerde, onbetaalde beurt is te betalen.
export function teBetalen(b: BeurtMetContext) {
    return !!b.schoonmakerId && b.status === "uitgevoerd" && !b.betaald;
}

// Datum voorbij, maar door niemand als klaar gemeld. Zonder deze melding zou zo'n beurt nergens opvallen.
export function nietAfgemeld(b: BeurtMetContext, vandaag: string) {
    return gepland(b) && b.datum < vandaag;
}

const keuzeStijl: React.CSSProperties = { padding: "7px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "0.85rem", backgroundColor: "white", cursor: "pointer" };

export default function SchoonmaakSectie({ data, herlaad, toon }: {
    data: SchoonmaakData | null;
    herlaad: () => Promise<void>;
    toon: (melding: string) => void;
}) {
    const [periode, setPeriode] = useState<Periode>("komend");
    const [status, setStatus] = useState<StatusKeuze>("alle");
    const [betaling, setBetaling] = useState<Betaling>("alle");
    const [wie, setWie] = useState<string>("alle");
    const [openId, setOpenId] = useState<string | null>(null);
    const [nieuwOpen, setNieuwOpen] = useState(false);
    const [maand, setMaand] = useState(vandaagIso().slice(0, 7));

    if (!data) return <p style={{ fontSize: "0.9rem", color: "#888", marginTop: "15px" }}>⏳ Schoonmaak laden...</p>;

    const vandaag = vandaagIso();
    const naamVan = (id?: string) => data.schoonmakers.find(s => s.id === id)?.naam;

    const inPeriode = (b: BeurtMetContext) => periode === "alles" || (periode === "komend" ? b.datum >= vandaag : b.datum < vandaag);
    const inBetaling = (b: BeurtMetContext) => betaling === "alle" || (betaling === "betaald" ? b.betaald : teBetalen(b));
    const vanWie = (b: BeurtMetContext) => wie === "alle" || (wie === "niemand" ? !b.schoonmakerId : b.schoonmakerId === wie);
    const basis = data.beurten.filter(b => inPeriode(b) && inBetaling(b) && vanWie(b));
    const gefilterd = basis.filter(b => status === "alle" || (status === "nietafgemeld" ? nietAfgemeld(b, vandaag) : b.status === status));
    const lijst = periode === "komend" ? gefilterd : [...gefilterd].reverse();

    const zonderKomend = data.beurten.filter(b => b.datum >= vandaag && b.status === "open").length;
    const afgekeurd = data.beurten.filter(b => b.status === "afgekeurd").length;
    const openstaand = data.beurten.filter(teBetalen);
    const vergeten = data.beurten.filter(b => nietAfgemeld(b, vandaag)).length;
    const openBedrag = openstaand.reduce((t, b) => t + (b.bedrag || 0), 0);

    const zet = (p: Periode, st: StatusKeuze, bet: Betaling, w = "alle") => {
        setPeriode(p); setStatus(st); setBetaling(bet); setWie(w); setOpenId(null);
    };
    const standaard = periode === "komend" && status === "alle" && betaling === "alle" && wie === "alle";

    const aandacht = [
        zonderKomend > 0 && { tekst: `${zonderKomend} zonder schoonmaakster`, kleur: "#b91c1c", bg: "#fee2e2", klik: () => zet("komend", "open", "alle") },
        afgekeurd > 0 && { tekst: `${afgekeurd} afgekeurd`, kleur: "#b91c1c", bg: "#fee2e2", klik: () => zet("alles", "afgekeurd", "alle") },
        vergeten > 0 && { tekst: `${vergeten} niet afgemeld`, kleur: "#1e40af", bg: "#dbeafe", klik: () => zet("afgelopen", "nietafgemeld", "alle") },
        openstaand.length > 0 && { tekst: `${openstaand.length} nog te betalen (${formatEuro(openBedrag)})`, kleur: "#92400e", bg: "#fef3c7", klik: () => zet("alles", "alle", "tebetalen") },
    ].filter(Boolean) as { tekst: string; kleur: string; bg: string; klik: () => void }[];

    return (
        <div style={{ marginTop: "15px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "14px" }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: "0.82rem", color: "#666", fontWeight: "bold" }}>Aandacht:</span>
                {aandacht.length === 0 && <span style={{ fontSize: "0.82rem", color: "#166534", backgroundColor: "#dcfce7", padding: "5px 12px", borderRadius: "20px", fontWeight: "bold" }}>✓ Alles is geregeld</span>}
                {aandacht.map(a => (
                    <button key={a.tekst} onClick={a.klik} title="Toon deze beurten" style={{ fontSize: "0.8rem", color: a.kleur, backgroundColor: a.bg, border: "none", padding: "5px 10px", borderRadius: "20px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}>{a.tekst}</button>
                ))}
            </div>
                <button onClick={() => { setNieuwOpen(true); setOpenId(null); }} style={{ ...groeneKnop, flexShrink: 0, whiteSpace: "nowrap" }}>+ Schoonmaak toevoegen</button>
            </div>

            <div style={{ backgroundColor: "#f8f7f2", borderRadius: "10px", padding: "10px", marginBottom: "12px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", backgroundColor: "white", borderRadius: "8px", border: "1px solid #ddd", overflow: "hidden" }}>
                        {(Object.keys(PERIODES) as Periode[]).map(p => (
                            <button key={p} onClick={() => setPeriode(p)} style={{ padding: "7px 14px", border: "none", backgroundColor: periode === p ? "#4A5D23" : "white", color: periode === p ? "white" : "#555", fontWeight: "bold", fontSize: "0.85rem", cursor: "pointer" }}>{PERIODES[p]}</button>
                        ))}
                    </div>
                    <select value={wie} onChange={e => setWie(e.target.value)} style={keuzeStijl} aria-label="Schoonmaakster">
                        <option value="alle">Alle schoonmaaksters</option>
                        <option value="niemand">Nog niemand</option>
                        {data.schoonmakers.map(s => <option key={s.id} value={s.id}>{s.naam}</option>)}
                    </select>
                    <select value={betaling} onChange={e => setBetaling(e.target.value as Betaling)} style={keuzeStijl} aria-label="Betaling">
                        <option value="alle">Betaald en onbetaald</option>
                        <option value="tebetalen">Nog te betalen</option>
                        <option value="betaald">Betaald</option>
                    </select>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                    {(["alle", ...Object.keys(STATUS_LABEL), ...(status === "nietafgemeld" ? ["nietafgemeld"] : [])] as StatusKeuze[]).map(st => {
                        const aantal = st === "alle" ? basis.length : st === "nietafgemeld" ? basis.filter(b => nietAfgemeld(b, vandaag)).length : basis.filter(b => b.status === st).length;
                        const actief = status === st;
                        const kleur = st === "alle" ? { bg: "#eee", color: "#444" } : st === "nietafgemeld" ? { bg: "#dbeafe", color: "#1e40af" } : STATUS_LABEL[st];
                        return (
                            <button key={st} onClick={() => setStatus(st)} disabled={aantal === 0 && !actief} style={{ padding: "5px 12px", borderRadius: "20px", border: actief ? `2px solid ${kleur.color}` : "2px solid transparent", backgroundColor: actief ? kleur.bg : "white", color: kleur.color, fontSize: "0.8rem", fontWeight: "bold", cursor: aantal === 0 && !actief ? "default" : "pointer", opacity: aantal === 0 && !actief ? 0.4 : 1 }}>
                                {st === "alle" ? "Alle statussen" : st === "nietafgemeld" ? "Niet afgemeld" : STATUS_LABEL[st].label} ({aantal})
                            </button>
                        );
                    })}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px", visibility: standaard ? "hidden" : "visible" }}>
                    <button onClick={() => zet("komend", "alle", "alle")} style={{ background: "none", border: "none", color: "#4A5D23", textDecoration: "underline", cursor: "pointer", fontSize: "0.82rem", padding: 0 }}>Filters wissen</button>
                </div>
            </div>

            {nieuwOpen && (
                <BeurtPaneel schoonmakers={data.schoonmakers} boekingen={data.boekingen} instellingen={data.instellingen} onSaved={herlaad} onClose={() => setNieuwOpen(false)} toon={toon} />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: nieuwOpen ? "12px" : 0 }}>
                {lijst.map(b => {
                    const st = STATUS_LABEL[b.status];
                    const isOpen = openId === b.id;
                    const moetBetaald = teBetalen(b);
                    return (
                        <div key={b.id} style={{ padding: "10px 12px", backgroundColor: "white", borderRadius: "8px", border: b.status === "afgekeurd" ? "1px solid #f5b5b5" : isOpen ? "1px solid #4A5D23" : "1px solid #eee", opacity: b.status === "vervallen" && !isOpen ? 0.6 : 1 }}>
                            <div onClick={() => setOpenId(isOpen ? null : b.id)} style={{ display: "grid", gridTemplateColumns: "14px 96px minmax(0, 1fr) 125px 100px 135px", gap: "10px", alignItems: "center", cursor: "pointer" }}>
                                <span style={{ fontSize: "0.9rem", color: "#4A5D23", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
                                <strong style={{ whiteSpace: "nowrap" }}>{formatDatumNL(b.datum)}</strong>
                                <span style={{ color: "#444", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={b.gastNaam ? `Vertrek ${b.gastNaam}` : b.omschrijving}>
                                    {!b.automatisch && <span style={{ fontSize: "0.68rem", backgroundColor: "#eef2e6", color: "#4A5D23", padding: "1px 6px", borderRadius: "8px", marginRight: "6px", fontWeight: "bold" }}>los</span>}
                                    {b.automatisch ? b.gastNaam : b.omschrijving || b.gastNaam || "Losse beurt"}
                                    {b.boekingVerwijderd && <span style={{ marginLeft: "6px", fontSize: "0.7rem", backgroundColor: "#fff7ed", color: "#9a3412", padding: "1px 6px", borderRadius: "8px" }}>boeking verwijderd</span>}
                                </span>
                                <span style={{ color: b.schoonmakerId ? "#333" : "#aaa", fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{naamVan(b.schoonmakerId) || "nog niemand"}</span>
                                <span style={{ fontSize: "0.72rem", backgroundColor: st.bg, color: st.color, padding: "2px 8px", borderRadius: "10px", fontWeight: "bold", justifySelf: "start" }}>{st.label}</span>
                                <span style={{ fontSize: "0.85rem", color: "#555", whiteSpace: "nowrap", display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }}>
                                    {formatEuro(b.bedrag)}
                                    {b.betaald && <span style={{ fontSize: "0.7rem", backgroundColor: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>Betaald</span>}
                                    {moetBetaald && <span style={{ fontSize: "0.7rem", backgroundColor: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>Te betalen</span>}
                                </span>
                            </div>
                            {isOpen && (
                                <BeurtPaneel key={b.bijgewerkt} beurt={b} schoonmakers={data.schoonmakers} boekingen={data.boekingen} instellingen={data.instellingen} onSaved={herlaad} onClose={() => setOpenId(null)} toon={toon} />
                            )}
                        </div>
                    );
                })}
                {lijst.length === 0 && (
                    <p style={{ fontSize: "0.9rem", color: "#888", fontStyle: "italic" }}>
                        Geen beurten met deze filters.{!standaard && <> <button onClick={() => zet("komend", "alle", "alle")} style={{ background: "none", border: "none", color: "#4A5D23", textDecoration: "underline", cursor: "pointer", fontSize: "0.9rem", padding: 0 }}>Filters wissen</button></>}
                    </p>
                )}
            </div>

            <Maandoverzicht data={data} maand={maand} setMaand={setMaand} />
            <Schoonmaaksters data={data} herlaad={herlaad} toon={toon} />
            <Instellingen instellingen={data.instellingen} herlaad={herlaad} toon={toon} />
        </div>
    );
}

function Maandoverzicht({ data, maand, setMaand }: { data: SchoonmaakData; maand: string; setMaand: (m: string) => void }) {
    const som = (lijst: BeurtMetContext[]) => lijst.reduce((t, b) => t + (b.bedrag || 0), 0);
    const rijen = useMemo(() => {
        const inMaand = data.beurten.filter(b => b.datum.startsWith(maand));
        return data.schoonmakers.map(s => {
            const mijn = inMaand.filter(b => b.schoonmakerId === s.id);
            const klaar = mijn.filter(b => b.status === "uitgevoerd");
            const plan = mijn.filter(gepland);
            return {
                s,
                aantal: klaar.length,
                totaal: som(klaar),
                betaald: som(klaar.filter(b => b.betaald)),
                open: som(klaar.filter(b => !b.betaald)),
                gepland: plan.length,
                geplandBedrag: som(plan),
            };
        }).filter(r => r.aantal > 0 || r.gepland > 0);
    }, [data, maand]);

    const totaal = rijen.reduce((t, r) => ({
        aantal: t.aantal + r.aantal, totaal: t.totaal + r.totaal, betaald: t.betaald + r.betaald,
        open: t.open + r.open, gepland: t.gepland + r.gepland, geplandBedrag: t.geplandBedrag + r.geplandBedrag,
    }), { aantal: 0, totaal: 0, betaald: 0, open: 0, gepland: 0, geplandBedrag: 0 });
    const totaalOpen = som(data.beurten.filter(teBetalen));
    const cel: React.CSSProperties = { padding: "6px 8px", borderBottom: "1px solid #eee", textAlign: "right", whiteSpace: "nowrap" };
    const grijs: React.CSSProperties = { ...cel, color: "#999", borderLeft: "1px solid #eee" };

    const regel = (naam: string, r: typeof totaal, vet = false) => (
        <tr key={naam} style={vet ? { fontWeight: "bold", backgroundColor: "#fafaf7" } : undefined}>
            <td style={{ ...cel, textAlign: "left" }}>{naam}</td>
            <td style={cel}>{r.aantal}</td>
            <td style={cel}>{formatEuro(r.totaal)}</td>
            <td style={cel}>{formatEuro(r.betaald)}</td>
            <td style={{ ...cel, fontWeight: "bold", color: r.open > 0 ? "#b91c1c" : "#166534" }}>{formatEuro(r.open)}</td>
            <td style={grijs}>{r.gepland ? `${r.gepland} · ${formatEuro(r.geplandBedrag)}` : "—"}</td>
        </tr>
    );

    return (
        <details style={blok}>
            <summary style={blokKop}>📅 Maandoverzicht</summary>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", margin: "12px 0", flexWrap: "wrap" }}>
                <input type="month" value={maand} onChange={e => setMaand(e.target.value)} style={{ ...veld, width: "auto" }} />
                <span style={{ fontSize: "0.82rem", color: "#666" }}>Over alle maanden staat nog {formatEuro(totaalOpen)} open voor uitgevoerde beurten.</span>
            </div>
            {rijen.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "#888", fontStyle: "italic" }}>Geen beurten in deze maand.</p>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", backgroundColor: "white", borderRadius: "6px" }}>
                        <thead>
                            <tr style={{ color: "#555" }}>
                                <th style={{ ...cel, textAlign: "left" }}>Schoonmaakster</th>
                                <th style={cel}>Uitgevoerd</th>
                                <th style={cel}>Totaal</th>
                                <th style={cel}>Betaald</th>
                                <th style={cel}>Nog te betalen</th>
                                <th style={{ ...grijs, color: "#888" }}>Nog gepland</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rijen.map(r => regel(r.s.naam, r))}
                            {rijen.length > 1 && regel("Totaal", totaal, true)}
                        </tbody>
                    </table>
                </div>
            )}
            <p style={{ fontSize: "0.75rem", color: "#888", margin: "8px 0 0" }}>Totaal, betaald en nog te betalen tellen alleen uitgevoerde beurten. Nog gepland zijn toegewezen en geaccepteerde beurten in deze maand.</p>
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
