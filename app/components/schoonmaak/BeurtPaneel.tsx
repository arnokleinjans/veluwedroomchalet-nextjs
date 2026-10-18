"use client";

import { useEffect, useState } from "react";
import { bewaarBeurtActie, verwijderBeurtActie } from "../../actions/schoonmaakActions";
import { STATUS_LABEL, type BeurtMetContext, type BeurtStatus, type SchoonmaakInstellingen, type SchoonmakerPubliek } from "../../utils/schoonmaakTypes";
import { formatDatumNL } from "../../utils/toeristenbelasting";
import ConfirmDialog from "../ConfirmDialog";

const veld: React.CSSProperties = { width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.85rem", backgroundColor: "white", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: "0.78rem", color: "#555", marginBottom: "4px" };
const kolom: React.CSSProperties = { flex: "1 1 150px", minWidth: 0 };

// Automatisch verversen in beheer wacht zolang er een beurt openstaat, anders gaan wijzigingen verloren.
let aantalOpen = 0;
export const beurtPaneelOpen = () => aantalOpen > 0;

export type SchoonmaakBoeking = { id: string; guestName: string; checkIn: string; checkOut: string; isTest?: boolean };

export default function BeurtPaneel({ beurt, schoonmakers, boekingen, instellingen, onSaved, onClose, toon }: {
    beurt?: BeurtMetContext;
    schoonmakers: SchoonmakerPubliek[];
    boekingen: SchoonmaakBoeking[];
    instellingen: SchoonmaakInstellingen;
    onSaved: () => Promise<void> | void;
    onClose?: () => void;
    toon: (melding: string) => void;
}) {
    const nieuw = !beurt;
    const los = nieuw || !beurt.automatisch;
    const [omschrijving, setOmschrijving] = useState(beurt?.omschrijving || "");
    const [bookingId, setBookingId] = useState(beurt?.bookingId || "");
    const [datum, setDatum] = useState(beurt?.datum || "");
    const [vertrektijd, setVertrektijd] = useState(beurt?.vertrektijd || instellingen.vertrektijd);
    const [schoonmakerId, setSchoonmakerId] = useState(beurt?.schoonmakerId || "");
    const [bedrag, setBedrag] = useState(beurt?.bedrag !== undefined ? String(beurt.bedrag) : "");
    const [status, setStatus] = useState<BeurtStatus>(beurt?.status || "open");
    const [bericht, setBericht] = useState(beurt?.berichtAanSchoonmaker || "");
    const [betaald, setBetaald] = useState(!!beurt?.betaald);
    const [betaaldOp, setBetaaldOp] = useState(beurt?.betaaldOp || "");
    const [bezig, setBezig] = useState(false);
    const [verwijderVraag, setVerwijderVraag] = useState(false);

    useEffect(() => {
        aantalOpen++;
        return () => { aantalOpen--; };
    }, []);

    const andereSchoonmaker = (schoonmakerId || "") !== (beurt?.schoonmakerId || "");
    const verleden = !!datum && datum < new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());
    const kiesbaar = schoonmakers.filter(s => s.actief || s.id === beurt?.schoonmakerId);
    const naamVan = (id?: string) => schoonmakers.find(s => s.id === id)?.naam || "onbekend";
    const afwijkendeDatum = !!beurt?.automatisch && !!beurt.vertrekBoeking && datum !== beurt.vertrekBoeking;
    const kanVerwijderen = !nieuw && (!beurt.automatisch || beurt.boekingVerwijderd);

    const kiesSchoonmaker = (id: string) => {
        setSchoonmakerId(id);
        const s = schoonmakers.find(x => x.id === id);
        if (s) setBedrag(String(s.tarief));
    };

    const opslaan = async () => {
        setBezig(true);
        toon("⏳ Schoonmaak opslaan...");
        const res = await bewaarBeurtActie({
            id: beurt?.id,
            bookingId: los ? (bookingId || undefined) : beurt?.bookingId,
            omschrijving: los ? omschrijving : undefined,
            datum,
            vertrektijd: vertrektijd && vertrektijd !== instellingen.vertrektijd ? vertrektijd : undefined,
            schoonmakerId: schoonmakerId || undefined,
            bedrag: bedrag.trim() === "" ? null : Number(bedrag.replace(",", ".")),
            betaald,
            betaaldOp: betaaldOp || undefined,
            status,
            berichtAanSchoonmaker: bericht,
        });
        setBezig(false);
        if (!res.success) {
            toon("❌ " + res.error);
            return;
        }
        toon(res.waarschuwing ? `⚠️ Opgeslagen, maar ${res.waarschuwing}` : "✅ Schoonmaak opgeslagen");
        await onSaved();
        if (nieuw) onClose?.();
    };

    const verwijderen = async () => {
        setVerwijderVraag(false);
        if (!beurt) return;
        setBezig(true);
        const res = await verwijderBeurtActie(beurt.id);
        setBezig(false);
        if (!res.success) {
            toon("❌ " + res.error);
            return;
        }
        toon(res.waarschuwing ? `⚠️ Verwijderd, maar ${res.waarschuwing}` : "✅ Beurt verwijderd");
        await onSaved();
        onClose?.();
    };

    return (
        <div style={{ marginTop: "12px", padding: "14px", backgroundColor: "#f7f9f4", border: "1px solid #dfe7d6", borderRadius: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "8px", flexWrap: "wrap" }}>
                <strong style={{ color: "#4A5D23" }}>🧹 {nieuw ? "Nieuwe schoonmaakbeurt" : los ? "Losse schoonmaakbeurt" : "Schoonmaak na vertrek"}</strong>
                {!nieuw && <span style={{ fontSize: "0.72rem", backgroundColor: STATUS_LABEL[beurt.status].bg, color: STATUS_LABEL[beurt.status].color, padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>{STATUS_LABEL[beurt.status].label}</span>}
            </div>

            {beurt?.boekingVerwijderd && (
                <p style={{ fontSize: "0.82rem", backgroundColor: "#fff7ed", color: "#9a3412", padding: "8px 10px", borderRadius: "6px", margin: "0 0 12px" }}>
                    De boeking bij deze beurt is verwijderd. Verwijder de beurt als hij niet meer nodig is.
                </p>
            )}

            {beurt?.status === "afgekeurd" && !andereSchoonmaker && (
                <p style={{ fontSize: "0.85rem", backgroundColor: "#fee2e2", color: "#b91c1c", padding: "8px 10px", borderRadius: "6px", margin: "0 0 12px" }}>
                    <strong>{naamVan(beurt.schoonmakerId)} heeft afgekeurd</strong>{beurt.redenAfkeuring ? `: ${beurt.redenAfkeuring}` : ""}. Kies hieronder iemand anders en sla op.
                </p>
            )}

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {los && (
                    <div style={{ flex: "2 1 220px", minWidth: 0 }}>
                        <label style={label}>Omschrijving{bookingId ? " (optioneel)" : ""}</label>
                        <input value={omschrijving} onChange={e => setOmschrijving(e.target.value)} placeholder="Bijv: Grote voorjaarsschoonmaak" style={veld} />
                    </div>
                )}
                {los && (
                    <div style={{ flex: "2 1 220px", minWidth: 0 }}>
                        <label style={label}>Hoort bij boeking (optioneel)</label>
                        <select value={bookingId} onChange={e => setBookingId(e.target.value)} style={veld}>
                            <option value="">— geen boeking —</option>
                            {boekingen.filter(b => !b.isTest).sort((a, b) => b.checkIn.localeCompare(a.checkIn)).map(b => (
                                <option key={b.id} value={b.id}>{b.guestName} ({formatDatumNL(b.checkIn)} t/m {formatDatumNL(b.checkOut)})</option>
                            ))}
                        </select>
                    </div>
                )}
                <div style={kolom}>
                    <label style={label}>Datum schoonmaak</label>
                    <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={veld} />
                </div>
                {!los && (
                    <div style={kolom}>
                        <label style={label}>Gast vertrekt om</label>
                        <input type="time" value={vertrektijd} onChange={e => setVertrektijd(e.target.value)} style={veld} />
                    </div>
                )}
                <div style={kolom}>
                    <label style={label}>Schoonmaakster</label>
                    <select value={schoonmakerId} onChange={e => kiesSchoonmaker(e.target.value)} style={veld}>
                        <option value="">— nog niemand —</option>
                        {kiesbaar.map(s => <option key={s.id} value={s.id}>{s.naam}{s.actief ? "" : " (inactief)"}</option>)}
                    </select>
                </div>
                <div style={kolom}>
                    <label style={label}>Bedrag (€)</label>
                    <input inputMode="decimal" value={bedrag} onChange={e => setBedrag(e.target.value)} placeholder="0,00" style={veld} />
                </div>
                <div style={kolom}>
                    <label style={label}>Status</label>
                    {andereSchoonmaker && !verleden ? (
                        <div style={{ ...veld, backgroundColor: "#f0f0f0", color: "#666" }}>{schoonmakerId ? "wordt Toegewezen" : "wordt Open"}</div>
                    ) : (
                        <select value={nieuw && verleden ? "uitgevoerd" : status} onChange={e => setStatus(e.target.value as BeurtStatus)} style={veld} disabled={nieuw}>
                            {(Object.keys(STATUS_LABEL) as BeurtStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s].label}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {afwijkendeDatum && (
                <p style={{ fontSize: "0.78rem", color: "#92400e", margin: "8px 0 0" }}>
                    Afwijkend van de vertrekdatum ({formatDatumNL(beurt!.vertrekBoeking!)}). Deze datum schuift niet meer mee met de boeking.{" "}
                    <button onClick={() => setDatum(beurt!.vertrekBoeking!)} style={{ background: "none", border: "none", color: "#4A5D23", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: "0.78rem" }}>Terug naar vertrekdatum</button>
                </p>
            )}
            {verleden && (
                <p style={{ fontSize: "0.78rem", color: "#666", margin: "8px 0 0" }}>Datum ligt in het verleden: er gaan geen mails naar de schoonmaakster.</p>
            )}
            {!verleden && andereSchoonmaker && beurt?.schoonmakerId && (beurt.status === "toegewezen" || beurt.status === "geaccepteerd") && (
                <p style={{ fontSize: "0.78rem", color: "#666", margin: "8px 0 0" }}>{naamVan(beurt.schoonmakerId)} krijgt een mail dat de beurt is ingetrokken.</p>
            )}
            {!verleden && !andereSchoonmaker && beurt?.schoonmakerId && (beurt.status === "toegewezen" || beurt.status === "geaccepteerd") && status === "vervallen" && (
                <p style={{ fontSize: "0.82rem", color: "#92400e", backgroundColor: "#fffbeb", padding: "6px 10px", borderRadius: "6px", margin: "8px 0 0" }}>📧 {naamVan(beurt.schoonmakerId)} krijgt na opslaan een mail dat de schoonmaak vervalt.</p>
            )}
            {!verleden && !andereSchoonmaker && beurt?.schoonmakerId && beurt.status === "vervallen" && status === "toegewezen" && (
                <p style={{ fontSize: "0.82rem", color: "#666", margin: "8px 0 0" }}>📧 {naamVan(beurt.schoonmakerId)} krijgt na opslaan opnieuw een mail met deze beurt.</p>
            )}

            <div style={{ marginTop: "10px" }}>
                <label style={label}>Bericht aan de schoonmaakster</label>
                <textarea value={bericht} onChange={e => setBericht(e.target.value)} rows={2} placeholder="Bijv: de haren in de put waren de vorige keer niet schoon" style={{ ...veld, fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
                <button
                    type="button"
                    role="switch"
                    aria-checked={betaald}
                    onClick={() => { const nu = !betaald; setBetaald(nu); if (nu && !betaaldOp) setBetaaldOp(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date())); }}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px 8px 8px", borderRadius: "24px", border: betaald ? "2px solid #166534" : "2px solid #d6b56b", backgroundColor: betaald ? "#dcfce7" : "#fffbeb", color: betaald ? "#166534" : "#92400e", fontWeight: "bold", fontSize: "0.9rem", cursor: "pointer" }}
                >
                    <span style={{ width: "40px", height: "22px", borderRadius: "11px", backgroundColor: betaald ? "#166534" : "#d1d5db", position: "relative", transition: "background-color 0.15s", flexShrink: 0 }}>
                        <span style={{ position: "absolute", top: "3px", left: betaald ? "21px" : "3px", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "white", transition: "left 0.15s" }} />
                    </span>
                    {betaald ? "✓ Betaald" : "Nog niet betaald"}
                </button>
                {betaald && (
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#555" }}>
                        op <input type="date" value={betaaldOp} onChange={e => setBetaaldOp(e.target.value)} style={{ ...veld, width: "auto" }} />
                    </label>
                )}
            </div>

            {beurt?.opmerkingSchoonmaker && (
                <div style={{ marginTop: "12px", backgroundColor: "white", borderLeft: "4px solid #4A5D23", borderRadius: "6px", padding: "8px 10px", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                    <div style={{ fontSize: "0.75rem", color: "#4A5D23", fontWeight: "bold", marginBottom: "2px" }}>Opmerking van {naamVan(beurt.schoonmakerId)}</div>
                    {beurt.opmerkingSchoonmaker}
                </div>
            )}

            {beurt && beurt.historie.length > 0 && (
                <details style={{ marginTop: "12px", fontSize: "0.8rem", color: "#666" }}>
                    <summary style={{ cursor: "pointer" }}>Geschiedenis ({beurt.historie.length})</summary>
                    <ul style={{ margin: "6px 0 0", paddingLeft: "18px" }}>
                        {[...beurt.historie].reverse().map((h, i) => (
                            <li key={i} style={{ marginBottom: "2px" }}>
                                {new Date(h.op).toLocaleString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}: {h.actie}
                                {h.schoonmakerId ? ` (${naamVan(h.schoonmakerId)})` : ""}
                                {h.toelichting ? ` — ${h.toelichting}` : ""}
                            </li>
                        ))}
                    </ul>
                </details>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
                <button onClick={opslaan} disabled={bezig} style={{ backgroundColor: "#4A5D23", color: "white", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}>Opslaan</button>
                {onClose && <button onClick={onClose} style={{ backgroundColor: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem" }}>{nieuw ? "Annuleer" : "Sluiten"}</button>}
                {kanVerwijderen && <button onClick={() => setVerwijderVraag(true)} disabled={bezig} style={{ marginLeft: "auto", backgroundColor: "#fee", color: "#c00", border: "1px solid #ecc", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem" }}>Verwijder beurt</button>}
            </div>

            <ConfirmDialog
                open={verwijderVraag}
                title="Beurt verwijderen?"
                message={beurt?.schoonmakerId && (beurt.status === "toegewezen" || beurt.status === "geaccepteerd")
                    ? `De beurt verdwijnt uit het portaal van ${naamVan(beurt.schoonmakerId)}. Zij krijgt een mail dat de schoonmaak vervalt.`
                    : "De beurt verdwijnt definitief."}
                confirmLabel="Ja, verwijderen"
                variant="danger"
                onConfirm={verwijderen}
                onCancel={() => setVerwijderVraag(false)}
            />
        </div>
    );
}
