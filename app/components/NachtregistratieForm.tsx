"use client";

import { useState } from "react";
import { t } from "../utils/translations";
import { berekenNachten, TARIEF_EERSTE_NACHT, TARIEF_VOLGENDE_NACHT, formatBedrag, formatDatumNL } from "../utils/toeristenbelasting";
import type { NachtregistratieData } from "../context/BookingContext";

type Props = {
    bookingId: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    lang: string;
    registratie?: NachtregistratieData | null;
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #d5d0c4",
    fontSize: "1rem",
    fontFamily: "inherit",
    backgroundColor: "white",
};

const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "var(--text-primary, #2C3E2D)",
    marginBottom: "6px",
};

export default function NachtregistratieForm({ bookingId, guestName, checkIn, checkOut, lang, registratie }: Props) {
    const [reg, setReg] = useState<NachtregistratieData | null>(registratie || null);
    const [locked, setLocked] = useState(!!registratie);
    const [betaalwijze, setBetaalwijze] = useState<string>(registratie?.betaalwijze || "");
    const [huurderNaam, setHuurderNaam] = useState(registratie?.huurderNaam || guestName);
    const [adres, setAdres] = useState(registratie?.adres || "");
    const [telefoon, setTelefoon] = useState(registratie?.telefoon || "");
    const [email, setEmail] = useState(registratie?.email || "");
    const [aantalPersonen, setAantalPersonen] = useState(registratie?.aantalPersonen ? String(registratie.aantalPersonen) : "");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [justSaved, setJustSaved] = useState(false);

    const verstuurd = reg?.status === "verstuurd";
    const aankomst = reg?.aankomst || checkIn;
    const vertrek = reg?.vertrek || checkOut;
    const nachten = berekenNachten(aankomst, vertrek);
    const bedrag = reg?.bedrag ?? (nachten === 0 ? 0 : TARIEF_EERSTE_NACHT + (nachten - 1) * TARIEF_VOLGENDE_NACHT);

    const disabled = locked || isSaving;

    const handleSave = async () => {
        setError("");
        if (!betaalwijze) { setError(t("nr_err_betaalwijze", lang)); return; }
        if (!huurderNaam.trim() || !adres.trim() || !telefoon.trim()) { setError(t("nr_err_verplicht", lang)); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(t("nr_err_email", lang)); return; }
        const personen = parseInt(aantalPersonen, 10);
        if (!Number.isInteger(personen) || personen < 1) { setError(t("nr_err_personen", lang)); return; }

        setIsSaving(true);
        try {
            const res = await fetch("/api/nachtregistratie", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId, betaalwijze, huurderNaam, adres, telefoon, email, aantalPersonen: personen }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || t("nr_err_opslaan", lang));
            } else {
                setReg(data.nachtregistratie);
                setLocked(true);
                setJustSaved(true);
            }
        } catch {
            setError(t("nr_err_opslaan", lang));
        }
        setIsSaving(false);
    };

    return (
        <div className="card card-glass" style={{ display: "block", padding: "28px", maxWidth: "560px", margin: "0 auto", opacity: 1 }}>
            <h2 style={{ fontFamily: "var(--font-lora), 'Lora', serif", fontSize: "1.5rem", color: "var(--primary-color, #4A5D23)", marginBottom: "6px" }}>
                {t("nr_titel", lang)}
            </h2>
            <p style={{ fontSize: "0.92rem", color: "#666", marginBottom: "20px", lineHeight: 1.5 }}>
                {t("nr_intro", lang)}
            </p>

            {verstuurd && (
                <div style={{ backgroundColor: "#eef4e8", border: "1px solid #4A5D23", borderRadius: "10px", padding: "14px", marginBottom: "20px", fontSize: "0.92rem", color: "#2C3E2D" }}>
                    ✅ {t("nr_verstuurd_melding", lang)}
                </div>
            )}
            {locked && !verstuurd && (
                <div style={{ backgroundColor: "#eef4e8", border: "1px solid #b8c9a3", borderRadius: "10px", padding: "14px", marginBottom: "20px", fontSize: "0.92rem", color: "#2C3E2D" }}>
                    ✅ {justSaved ? t("nr_opgeslagen_melding", lang) : t("nr_al_ingevuld_melding", lang)}
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", opacity: locked ? 0.55 : 1, transition: "opacity 0.2s", pointerEvents: disabled ? "none" : "auto" }}>
                {/* Betaalkeuze */}
                <div style={{ backgroundColor: "#faf8f2", border: "1px solid #e5e0d4", borderRadius: "10px", padding: "14px" }}>
                    <span style={{ ...labelStyle, marginBottom: "10px" }}>{t("nr_betaalvraag", lang)} *</span>
                    <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "8px", cursor: "pointer", fontSize: "0.92rem" }}>
                        <input type="radio" name="betaalwijze" checked={betaalwijze === "receptie"} onChange={() => setBetaalwijze("receptie")} disabled={disabled} style={{ marginTop: "3px" }} />
                        <span>{t("nr_betaal_receptie", lang)}</span>
                    </label>
                    <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer", fontSize: "0.92rem" }}>
                        <input type="radio" name="betaalwijze" checked={betaalwijze === "overmaken"} onChange={() => setBetaalwijze("overmaken")} disabled={disabled} style={{ marginTop: "3px" }} />
                        <span>{t("nr_betaal_overmaken", lang)}</span>
                    </label>
                </div>

                {/* Automatisch ingevulde datums */}
                <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <label style={labelStyle}>{t("nr_aankomst", lang)}</label>
                        <input type="text" value={formatDatumNL(aankomst)} readOnly style={{ ...inputStyle, backgroundColor: "#f2efe8", color: "#666" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <label style={labelStyle}>{t("nr_vertrek", lang)}</label>
                        <input type="text" value={formatDatumNL(vertrek)} readOnly style={{ ...inputStyle, backgroundColor: "#f2efe8", color: "#666" }} />
                    </div>
                </div>

                <div>
                    <label style={labelStyle}>{t("nr_naam", lang)} *</label>
                    <input type="text" value={huurderNaam} onChange={e => setHuurderNaam(e.target.value)} disabled={disabled} style={inputStyle} autoComplete="name" />
                </div>
                <div>
                    <label style={labelStyle}>{t("nr_adres", lang)} *</label>
                    <input type="text" value={adres} onChange={e => setAdres(e.target.value)} disabled={disabled} style={inputStyle} autoComplete="street-address" placeholder={t("nr_adres_hint", lang)} />
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                        <label style={labelStyle}>{t("nr_telefoon", lang)} *</label>
                        <input type="tel" value={telefoon} onChange={e => setTelefoon(e.target.value)} disabled={disabled} style={inputStyle} autoComplete="tel" />
                    </div>
                    <div style={{ flex: "1 1 120px", minWidth: 0 }}>
                        <label style={labelStyle}>{t("nr_personen", lang)} *</label>
                        <input type="number" min={1} max={20} value={aantalPersonen} onChange={e => setAantalPersonen(e.target.value)} disabled={disabled} style={inputStyle} />
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>{t("nr_email", lang)} *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={disabled} style={inputStyle} autoComplete="email" />
                </div>
            </div>

            {/* Kostenberekening */}
            <div style={{ marginTop: "20px", backgroundColor: "#faf8f2", border: "1px solid #e5e0d4", borderRadius: "10px", padding: "14px", fontSize: "0.9rem", color: "#444" }}>
                <strong style={{ display: "block", marginBottom: "6px", color: "var(--primary-color, #4A5D23)" }}>{t("nr_kosten_titel", lang)}</strong>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{t("nr_kosten_eerste", lang)}</span><span>{formatBedrag(TARIEF_EERSTE_NACHT)}</span>
                </div>
                {nachten > 1 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{nachten - 1} × {t("nr_kosten_volgende", lang)}</span><span>{formatBedrag((nachten - 1) * TARIEF_VOLGENDE_NACHT)}</span>
                    </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #ddd", marginTop: "6px", paddingTop: "6px", fontWeight: 700 }}>
                    <span>{t("nr_kosten_totaal", lang)} ({nachten} {t("nr_nachten", lang)})</span><span>{formatBedrag(bedrag)}</span>
                </div>
            </div>

            {error && (
                <div style={{ marginTop: "16px", backgroundColor: "#fdecea", border: "1px solid #e6b3ac", borderRadius: "10px", padding: "12px", fontSize: "0.9rem", color: "#b3362a" }}>
                    {error}
                </div>
            )}

            <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
                {!locked && (
                    <button onClick={handleSave} disabled={isSaving} style={{ flex: 1, backgroundColor: "var(--primary-color, #4A5D23)", color: "white", border: "none", borderRadius: "12px", padding: "14px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        {isSaving ? t("nr_bezig", lang) : t("nr_opslaan", lang)}
                    </button>
                )}
                {locked && !verstuurd && (
                    <button onClick={() => { setLocked(false); setJustSaved(false); }} style={{ flex: 1, backgroundColor: "white", color: "var(--primary-color, #4A5D23)", border: "2px solid var(--primary-color, #4A5D23)", borderRadius: "12px", padding: "14px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        {t("nr_aanpassen", lang)}
                    </button>
                )}
            </div>
        </div>
    );
}
