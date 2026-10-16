"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { loginSchoonmaker, logoutSchoonmaker, reageerOpBeurt } from "../../actions/schoonmaakPortaalActions";
import { STATUS_LABEL, datumLang, formatEuro, metHoofdletter, type BeurtVoorSchoonmaker } from "../../utils/schoonmaakTypes";

const GROEN = "#4A5D23";

const knop = (kleur: string, licht = false): React.CSSProperties => ({
    flex: "1 1 auto",
    padding: "12px 16px",
    borderRadius: "10px",
    border: licht ? `1px solid ${kleur}` : "none",
    backgroundColor: licht ? "white" : kleur,
    color: licht ? kleur : "white",
    fontWeight: "bold",
    fontSize: "1rem",
    cursor: "pointer",
});

const tekstvak: React.CSSProperties = {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    fontFamily: "inherit",
    boxSizing: "border-box",
};

type Data = { naam: string; komend: BeurtVoorSchoonmaker[]; afgelopen: BeurtVoorSchoonmaker[] } | null;

type Filter = "tedoen" | "klaar" | "alles";
const FILTERS: Record<Filter, { label: string; leeg: string }> = {
    tedoen: { label: "Te doen", leeg: "Er staat niets voor je klaar. 🎉" },
    klaar: { label: "Klaar", leeg: "Nog geen afgeronde beurten." },
    alles: { label: "Alles", leeg: "Er staan geen beurten op jouw naam." },
};
const FILTER_OPSLAG = "vdc_schoonmaak_filter";

function leesOpgeslagenFilter(): Filter | null {
    try {
        const f = localStorage.getItem(FILTER_OPSLAG);
        return f && f in FILTERS ? (f as Filter) : null;
    } catch {
        return null;
    }
}
const geenAbonnement = () => () => { };

export default function SchoonmaakPortaal({ code, naam, data }: { code: string; naam: string; data: Data }) {
    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f4f6f0", padding: "24px 16px 60px" }}>
            <div style={{ maxWidth: "560px", margin: "0 auto" }}>
                {data ? <Overzicht code={code} data={data} /> : <Inloggen code={code} naam={naam} />}
            </div>
        </div>
    );
}

function Inloggen({ code, naam }: { code: string; naam: string }) {
    const router = useRouter();
    const [pin, setPin] = useState("");
    const [fout, setFout] = useState("");
    const [bezig, setBezig] = useState(false);

    const inloggen = async () => {
        setBezig(true);
        const res = await loginSchoonmaker(code, pin);
        setBezig(false);
        if (res.success) router.refresh();
        else setFout(res.error || "Inloggen mislukt.");
    };

    return (
        <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px 24px", boxShadow: "0 8px 24px rgba(0,0,0,0.06)", textAlign: "center", marginTop: "10vh" }}>
            <h1 style={{ fontFamily: "'Lora', serif", color: GROEN, margin: "0 0 8px", fontSize: "1.6rem" }}>Hoi {naam}</h1>
            <p style={{ color: "#666", margin: "0 0 20px" }}>Vul je pincode in om je schoonmaakbeurten te zien.</p>
            <input
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === "Enter" && inloggen()}
                placeholder="Pincode"
                style={{ ...tekstvak, textAlign: "center", fontSize: "1.4rem", letterSpacing: "0.3em", marginBottom: "12px" }}
            />
            {fout && <p style={{ color: "#b91c1c", margin: "0 0 12px" }}>{fout}</p>}
            <button onClick={inloggen} disabled={bezig || !pin} style={{ ...knop(GROEN), width: "100%", opacity: bezig || !pin ? 0.6 : 1 }}>
                {bezig ? "Bezig..." : "Inloggen"}
            </button>
        </div>
    );
}

function Overzicht({ code, data }: { code: string; data: NonNullable<Data> }) {
    const router = useRouter();
    const opgeslagen = useSyncExternalStore(geenAbonnement, leesOpgeslagenFilter, () => null);
    const [gekozen, setGekozen] = useState<Filter | null>(null);
    const filter: Filter = gekozen ?? opgeslagen ?? "tedoen";
    const vandaag = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());

    const kies = (f: Filter) => {
        setGekozen(f);
        try { localStorage.setItem(FILTER_OPSLAG, f); } catch { }
    };

    // Te doen: alles wat nog niet klaar is. Een verstreken beurt die nog niet is afgemeld, blijft hier staan.
    const lijsten: Record<Filter, BeurtVoorSchoonmaker[]> = {
        tedoen: [...data.afgelopen.filter(b => b.status === "geaccepteerd" || b.status === "toegewezen").reverse(), ...data.komend.filter(b => b.status !== "uitgevoerd")],
        klaar: [...data.komend.filter(b => b.status === "uitgevoerd").reverse(), ...data.afgelopen.filter(b => b.status === "uitgevoerd")],
        alles: [...data.komend, ...data.afgelopen],
    };

    // Elke minuut en bij terugkeren naar de app de beurten opnieuw ophalen. Wat ze aan het typen is, blijft staan.
    useEffect(() => {
        const vernieuw = () => { if (document.visibilityState === "visible") router.refresh(); };
        const timer = setInterval(vernieuw, 60_000);
        document.addEventListener("visibilitychange", vernieuw);
        window.addEventListener("focus", vernieuw);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", vernieuw);
            window.removeEventListener("focus", vernieuw);
        };
    }, [router]);
    const uitloggen = async () => {
        await logoutSchoonmaker(code);
        router.refresh();
    };

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px" }}>
                <div>
                    <h1 style={{ fontFamily: "'Lora', serif", color: GROEN, margin: 0, fontSize: "1.6rem" }}>Hoi {data.naam}</h1>
                    <p style={{ color: "#666", margin: "4px 0 0" }}>Jouw schoonmaakbeurten bij het Veluwe Droomchalet</p>
                </div>
                <button onClick={uitloggen} style={{ background: "none", border: "1px solid #ccc", borderRadius: "8px", padding: "8px 12px", color: "#666", cursor: "pointer", flexShrink: 0 }}>Uitloggen</button>
            </div>

            <div role="tablist" style={{ display: "flex", gap: "6px", backgroundColor: "white", borderRadius: "14px", padding: "5px", marginBottom: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", position: "sticky", top: "8px", zIndex: 5 }}>
                {(Object.keys(FILTERS) as Filter[]).map(f => {
                    const actief = filter === f;
                    return (
                        <button key={f} role="tab" aria-selected={actief} onClick={() => kies(f)} style={{ flex: 1, padding: "11px 6px", borderRadius: "10px", border: "none", backgroundColor: actief ? GROEN : "transparent", color: actief ? "white" : "#555", fontWeight: "bold", fontSize: "0.95rem", cursor: "pointer" }}>
                            {FILTERS[f].label} <span style={{ opacity: 0.8, fontWeight: "normal" }}>({lijsten[f].length})</span>
                        </button>
                    );
                })}
            </div>

            {lijsten[filter].length === 0 && (
                <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "24px", color: "#666", textAlign: "center" }}>
                    {FILTERS[filter].leeg}
                </div>
            )}
            <div style={{ display: "grid", gap: "16px" }}>
                {lijsten[filter].map(b => <BeurtKaart key={b.id} code={code} beurt={b} afgelopen={b.datum < vandaag} />)}
            </div>
        </>
    );
}

function Regel({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
            <span style={{ color: "#777" }}>{label}</span>
            <span style={{ fontWeight: 600, textAlign: "right" }}>{children}</span>
        </div>
    );
}

function BeurtKaart({ code, beurt, afgelopen = false }: { code: string; beurt: BeurtVoorSchoonmaker; afgelopen?: boolean }) {
    const router = useRouter();
    const [bezig, setBezig] = useState(false);
    const [melding, setMelding] = useState("");
    const [afkeurOpen, setAfkeurOpen] = useState(false);
    const [reden, setReden] = useState("");
    const [opmerking, setOpmerking] = useState(beurt.opmerkingSchoonmaker || "");
    const status = STATUS_LABEL[beurt.status];

    const doe = async (actie: "accepteren" | "afkeuren" | "uitgevoerd" | "opmerking", tekst?: string) => {
        setBezig(true);
        setMelding("");
        const res = await reageerOpBeurt(code, beurt.id, actie, tekst);
        setBezig(false);
        if (!res.success) {
            setMelding("❌ " + (res.error || "Er ging iets mis."));
            return;
        }
        setAfkeurOpen(false);
        setMelding(res.waarschuwing ? "⚠️ " + res.waarschuwing : actie === "opmerking" ? "✅ Opmerking opgeslagen" : "");
        router.refresh();
    };

    return (
        <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "18px", boxShadow: "0 4px 14px rgba(0,0,0,0.05)", opacity: afgelopen && beurt.status !== "geaccepteerd" && beurt.status !== "toegewezen" ? 0.85 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                <strong style={{ fontSize: "1.1rem" }}>{metHoofdletter(datumLang(beurt.datum))}</strong>
                <span style={{ fontSize: "0.8rem", backgroundColor: status.bg, color: status.color, padding: "3px 10px", borderRadius: "12px", fontWeight: "bold", whiteSpace: "nowrap" }}>{status.label}</span>
            </div>

            {beurt.omschrijving && <Regel label="Wat">{beurt.omschrijving}</Regel>}
            {!beurt.omschrijving && <Regel label="Gast vertrekt">{beurt.vertrektijd} uur</Regel>}
            <Regel label="Volgende gast komt">{beurt.volgendeAankomst ? datumLang(beurt.volgendeAankomst) : "nog niet bekend"}</Regel>
            {!beurt.omschrijving && <Regel label="Aantal personen">{beurt.aantalPersonen ?? "nog niet bekend"}</Regel>}
            <Regel label="Bedrag">{formatEuro(beurt.bedrag)}{beurt.betaald ? " · betaald ✓" : ""}</Regel>

            {beurt.berichtAanSchoonmaker && (
                <div style={{ backgroundColor: "#f4f6f0", borderLeft: `4px solid ${GROEN}`, borderRadius: "8px", padding: "10px 12px", marginTop: "12px", whiteSpace: "pre-wrap" }}>
                    <div style={{ fontSize: "0.8rem", color: GROEN, fontWeight: "bold", marginBottom: "4px" }}>Bericht van Kitty</div>
                    {beurt.berichtAanSchoonmaker}
                </div>
            )}

            {beurt.status === "afgekeurd" && (
                <p style={{ backgroundColor: "#fee2e2", color: "#b91c1c", borderRadius: "8px", padding: "10px 12px", marginTop: "12px" }}>
                    Je hebt deze beurt afgekeurd{beurt.redenAfkeuring ? `: ${beurt.redenAfkeuring}` : ""}. Kitty zoekt iemand anders.
                </p>
            )}

            {afgelopen && (beurt.status === "geaccepteerd" || beurt.status === "toegewezen") && (
                <div style={{ display: "flex", marginTop: "14px" }}>
                    <button disabled={bezig} onClick={() => doe("uitgevoerd", opmerking)} style={knop(GROEN)}>Schoonmaak is klaar</button>
                </div>
            )}

            {!afgelopen && (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
                    {beurt.status === "toegewezen" && !afkeurOpen && <>
                        <button disabled={bezig} onClick={() => doe("accepteren")} style={knop(GROEN)}>Accepteren</button>
                        <button disabled={bezig} onClick={() => setAfkeurOpen(true)} style={knop("#b91c1c", true)}>Afkeuren</button>
                    </>}
                    {beurt.status === "geaccepteerd" && !afkeurOpen && <>
                        <button disabled={bezig} onClick={() => doe("uitgevoerd", opmerking)} style={knop(GROEN)}>Schoonmaak is klaar</button>
                        <button disabled={bezig} onClick={() => setAfkeurOpen(true)} style={knop("#b91c1c", true)}>Toch afkeuren</button>
                    </>}
                    {beurt.status === "afgekeurd" && (
                        <button disabled={bezig} onClick={() => doe("accepteren")} style={knop(GROEN, true)}>Toch accepteren</button>
                    )}
                </div>
            )}

            {afkeurOpen && (
                <div style={{ marginTop: "14px" }}>
                    <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px" }}>Waarom kun je niet?</label>
                    <textarea value={reden} onChange={e => setReden(e.target.value)} rows={2} style={tekstvak} placeholder="Bijvoorbeeld: ik ben op vakantie" />
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                        <button disabled={bezig || !reden.trim()} onClick={() => doe("afkeuren", reden)} style={{ ...knop("#b91c1c"), opacity: !reden.trim() ? 0.6 : 1 }}>Afkeuren</button>
                        <button onClick={() => setAfkeurOpen(false)} style={knop("#666", true)}>Terug</button>
                    </div>
                </div>
            )}

            {beurt.status === "uitgevoerd" && beurt.opmerkingSchoonmaker && (
                <div style={{ marginTop: "16px" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: "bold", marginBottom: "6px", color: "#888" }}>Jouw opmerking voor Kitty</div>
                    <div style={{ ...tekstvak, backgroundColor: "#f0f0f0", color: "#777", borderColor: "#e0e0e0", whiteSpace: "pre-wrap" }}>{beurt.opmerkingSchoonmaker}</div>
                </div>
            )}

            {beurt.status !== "vervallen" && beurt.status !== "uitgevoerd" && (
                <div style={{ marginTop: "16px" }}>
                    <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "bold", marginBottom: "6px", color: "#444" }}>Opmerking voor Kitty</label>
                    <textarea value={opmerking} onChange={e => setOpmerking(e.target.value)} rows={2} style={tekstvak} placeholder="Bijvoorbeeld: de thee was op" />
                    {opmerking !== (beurt.opmerkingSchoonmaker || "") && (
                        <button disabled={bezig} onClick={() => doe("opmerking", opmerking)} style={{ ...knop(GROEN, true), marginTop: "8px", width: "100%" }}>Opmerking opslaan</button>
                    )}
                </div>
            )}

            {melding && <p style={{ marginTop: "10px", color: melding.startsWith("❌") ? "#b91c1c" : "#444" }}>{melding}</p>}
        </div>
    );
}
