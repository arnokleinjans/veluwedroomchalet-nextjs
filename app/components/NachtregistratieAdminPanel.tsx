"use client";

import { useState } from "react";
import { adminUpdateNachtregistratie, verstuurNachtregistratie } from "../actions/adminActions";
import { berekenBedrag, formatBedrag, formatDatumNL } from "../utils/toeristenbelasting";

const DEFAULT_OPMERKING: Record<string, string> = {
    receptie: "Huurder betaalt de toeristenbelasting bij aankomst zelf bij de receptie",
    overmaken: "Verhuurder stort de toeristenbelasting op rekening van het Veluws Hof",
};

const veldStyle: React.CSSProperties = { width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.85rem" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.78rem", color: "#555", marginBottom: "4px" };

type Booking = { id: string, guestName: string, checkIn: string, checkOut: string, nachtregistratie?: any };

export default function NachtregistratieAdminPanel({ booking, onSaved, setToast }: {
    booking: Booking,
    onSaved: () => Promise<void>,
    setToast: (msg: string) => void,
}) {
    const reg = booking.nachtregistratie;
    const [betaalwijze, setBetaalwijze] = useState<string>(reg?.betaalwijze || "receptie");
    const [huurderNaam, setHuurderNaam] = useState(reg?.huurderNaam || booking.guestName);
    const [adres, setAdres] = useState(reg?.adres || "");
    const [telefoon, setTelefoon] = useState(reg?.telefoon || "");
    const [email, setEmail] = useState(reg?.email || "");
    const [aantalPersonen, setAantalPersonen] = useState(reg?.aantalPersonen ? String(reg.aantalPersonen) : "");
    const [aankomst, setAankomst] = useState(reg?.aankomst || booking.checkIn);
    const [vertrek, setVertrek] = useState(reg?.vertrek || booking.checkOut);
    const [bedrag, setBedrag] = useState(String(reg?.bedrag ?? berekenBedrag(booking.checkIn, booking.checkOut)));
    const [opmerkingen, setOpmerkingen] = useState<string>(reg?.opmerkingen ?? DEFAULT_OPMERKING[reg?.betaalwijze || "receptie"]);
    const [isBusy, setIsBusy] = useState(false);

    const datumWijktAf = aankomst !== booking.checkIn || vertrek !== booking.checkOut;

    const kiesBetaalwijze = (wijze: string) => {
        // Default-opmerking meebewegen zolang de beheerder hem niet zelf heeft aangepast.
        if (!opmerkingen.trim() || opmerkingen === DEFAULT_OPMERKING[betaalwijze]) {
            setOpmerkingen(DEFAULT_OPMERKING[wijze]);
        }
        setBetaalwijze(wijze);
    };

    const bouwRegistratie = () => ({
        ...(reg || {}),
        status: reg?.status === "verstuurd" ? "verstuurd" : "ingevuld",
        betaalwijze,
        huurderNaam: huurderNaam.trim(),
        adres: adres.trim(),
        telefoon: telefoon.trim(),
        email: email.trim(),
        aantalPersonen: parseInt(aantalPersonen, 10) || 0,
        aankomst,
        vertrek,
        bedrag: parseFloat(bedrag.replace(",", ".")) || 0,
        opmerkingen,
        ingevuldOp: reg?.ingevuldOp || new Date().toISOString(),
    });

    const valideer = (): string | null => {
        if (!huurderNaam.trim() || !adres.trim() || !telefoon.trim()) return "Naam, adres en telefoonnummer zijn verplicht.";
        const p = parseInt(aantalPersonen, 10);
        if (!Number.isInteger(p) || p < 1) return "Vul een geldig aantal personen in.";
        return null;
    };

    const handleSave = async () => {
        const fout = valideer();
        if (fout) { setToast("❌ " + fout); return; }
        setIsBusy(true);
        setToast("⏳ Opslaan...");
        const res = await adminUpdateNachtregistratie(booking.id, bouwRegistratie());
        setIsBusy(false);
        setToast(res.success ? "✅ Nachtregistratie opgeslagen!" : "❌ " + res.error);
        if (res.success) await onSaved();
    };

    const handleVerstuur = async () => {
        const fout = valideer();
        if (fout) { setToast("❌ " + fout); return; }
        if (reg?.status === "verstuurd") {
            const wanneer = reg.verstuurdOp ? new Date(reg.verstuurdOp).toLocaleString("nl-NL") : "eerder";
            if (!confirm(`Dit formulier is al verstuurd op ${wanneer}. Opnieuw versturen?`)) return;
        } else if (!confirm("Formulier als PDF mailen naar de camping?")) {
            return;
        }
        setIsBusy(true);
        setToast("⏳ PDF genereren en mailen...");
        const res = await verstuurNachtregistratie(booking.id, bouwRegistratie());
        setIsBusy(false);
        setToast(res.success ? "✅ Nachtregistratie verstuurd naar de camping!" : "❌ " + res.error);
        if (res.success) await onSaved();
    };

    return (
        <div style={{ marginTop: "12px", padding: "14px", backgroundColor: "#faf8f2", border: "1px solid #e5e0d4", borderRadius: "8px" }}>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "12px", fontSize: "0.85rem" }}>
                <label style={{ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer" }}>
                    <input type="radio" checked={betaalwijze === "receptie"} onChange={() => kiesBetaalwijze("receptie")} />
                    Gast betaalt zelf bij receptie
                </label>
                <label style={{ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer" }}>
                    <input type="radio" checked={betaalwijze === "overmaken"} onChange={() => kiesBetaalwijze("overmaken")} />
                    Gast maakt over, wij betalen
                </label>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ flex: "2 1 180px" }}>
                    <label style={labelStyle}>Naam huurder</label>
                    <input type="text" value={huurderNaam} onChange={e => setHuurderNaam(e.target.value)} style={veldStyle} />
                </div>
                <div style={{ flex: "2 1 200px" }}>
                    <label style={labelStyle}>Adres</label>
                    <input type="text" value={adres} onChange={e => setAdres(e.target.value)} style={veldStyle} />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                    <label style={labelStyle}>Telefoonnummer</label>
                    <input type="text" value={telefoon} onChange={e => setTelefoon(e.target.value)} style={veldStyle} />
                </div>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ flex: "2 1 180px" }}>
                    <label style={labelStyle}>E-mail gast (alleen intern)</label>
                    <input type="text" value={email} onChange={e => setEmail(e.target.value)} style={veldStyle} />
                </div>
                <div style={{ flex: "1 1 90px" }}>
                    <label style={labelStyle}>Personen</label>
                    <input type="number" min={1} value={aantalPersonen} onChange={e => setAantalPersonen(e.target.value)} style={veldStyle} />
                </div>
                <div style={{ flex: "1 1 120px" }}>
                    <label style={labelStyle}>Aankomst</label>
                    <input type="date" value={aankomst} onChange={e => { setAankomst(e.target.value); setBedrag(String(berekenBedrag(e.target.value, vertrek))); }} style={veldStyle} />
                </div>
                <div style={{ flex: "1 1 120px" }}>
                    <label style={labelStyle}>Vertrek</label>
                    <input type="date" value={vertrek} onChange={e => { setVertrek(e.target.value); setBedrag(String(berekenBedrag(aankomst, e.target.value))); }} style={veldStyle} />
                </div>
                <div style={{ flex: "1 1 90px" }}>
                    <label style={labelStyle}>Bedrag (€)</label>
                    <input type="text" value={bedrag} onChange={e => setBedrag(e.target.value)} style={veldStyle} />
                </div>
            </div>
            {datumWijktAf && (
                <p style={{ fontSize: "0.78rem", color: "#b45309", marginBottom: "10px" }}>
                    ⚠️ Datums wijken af van de boeking ({formatDatumNL(booking.checkIn)} t/m {formatDatumNL(booking.checkOut)}).
                </p>
            )}
            <div style={{ marginBottom: "12px" }}>
                <label style={labelStyle}>Opmerkingen/Bijzonderheden (gaat mee naar de camping, gast ziet dit niet)</label>
                <textarea value={opmerkingen} onChange={e => setOpmerkingen(e.target.value)} rows={2} style={{ ...veldStyle, resize: "vertical", fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={handleSave} disabled={isBusy} style={{ backgroundColor: "#e0e0e0", color: "#333", border: "none", borderRadius: "4px", padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold" }}>
                    Opslaan
                </button>
                <button onClick={handleVerstuur} disabled={isBusy} style={{ backgroundColor: "#4A5D23", color: "white", border: "none", borderRadius: "4px", padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold" }}>
                    📧 Verstuur naar camping
                </button>
                <span style={{ fontSize: "0.78rem", color: "#888" }}>
                    Berekend: {formatBedrag(berekenBedrag(aankomst, vertrek))}
                    {reg?.verstuurdOp && ` · verstuurd ${new Date(reg.verstuurdOp).toLocaleString("nl-NL")}`}
                </span>
            </div>
        </div>
    );
}
