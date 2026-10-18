"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const GROEN = "#4A5D23";
const BEREIK = "#e7eedb";
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const DAGEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];

function iso(j: number, m: number, d: number) {
    return `${j}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function vandaagIso() {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());
}
function toonDatum(v: string) {
    if (!v) return "";
    const [j, m, d] = v.split("-");
    return `${d}-${m}-${j}`;
}
function nachten(van: string, tot: string) {
    return Math.round((Date.parse(tot + "T12:00:00Z") - Date.parse(van + "T12:00:00Z")) / 86400000);
}

type Fase = "aankomst" | "vertrek";

// Eén agenda voor aankomst én vertrek: eerst de aankomstdatum aanklikken, daarna de vertrekdatum.
// Geeft twee flex-items terug, zodat het in bestaande formulierrijen past op de plek van twee datumvelden.
export default function DatumBereik({ aankomst, vertrek, onChange, labelStyle, veldStyle, flex = "1 1 120px" }: {
    aankomst: string;
    vertrek: string;
    onChange: (aankomst: string, vertrek: string) => void;
    labelStyle: React.CSSProperties;
    veldStyle: React.CSSProperties;
    flex?: string;
}) {
    const [open, setOpen] = useState(false);
    const [fase, setFase] = useState<Fase>("aankomst");
    const [hover, setHover] = useState("");
    const [maand, setMaand] = useState(() => {
        const basis = aankomst || vandaagIso();
        return { j: Number(basis.slice(0, 4)), m: Number(basis.slice(5, 7)) - 1 };
    });
    const [positie, setPositie] = useState<{ top: number; left: number; breed: boolean } | null>(null);
    const ankerRef = useRef<HTMLDivElement>(null);
    const vertrekRef = useRef<HTMLDivElement>(null);
    const popRef = useRef<HTMLDivElement>(null);

    const openen = (f: Fase) => {
        const basis = (f === "vertrek" && vertrek) || aankomst || vandaagIso();
        setMaand({ j: Number(basis.slice(0, 4)), m: Number(basis.slice(5, 7)) - 1 });
        setFase(f === "vertrek" && !aankomst ? "aankomst" : f);
        setOpen(true);
    };

    useLayoutEffect(() => {
        if (!open) return;
        const plaats = () => {
            const r = ankerRef.current?.getBoundingClientRect();
            if (!r) return;
            const breed = window.innerWidth >= 640;
            const popBreedte = breed ? 600 : Math.min(320, window.innerWidth - 16);
            const left = Math.max(8, Math.min(r.left, window.innerWidth - popBreedte - 8));
            setPositie({ top: r.bottom + 6, left, breed });
        };
        plaats();
        window.addEventListener("resize", plaats);
        window.addEventListener("scroll", plaats, true);
        return () => {
            window.removeEventListener("resize", plaats);
            window.removeEventListener("scroll", plaats, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const buiten = (e: MouseEvent) => {
            const t = e.target as Node;
            if (popRef.current?.contains(t) || ankerRef.current?.contains(t) || vertrekRef.current?.contains(t)) return;
            setOpen(false);
        };
        const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", buiten);
        document.addEventListener("keydown", esc);
        return () => {
            document.removeEventListener("mousedown", buiten);
            document.removeEventListener("keydown", esc);
        };
    }, [open]);

    const kies = (dag: string) => {
        if (fase === "aankomst" || !aankomst || dag <= aankomst) {
            onChange(dag, vertrek && vertrek > dag ? vertrek : "");
            setFase("vertrek");
            return;
        }
        onChange(aankomst, dag);
        setHover("");
        setOpen(false);
    };

    const verschuif = (stap: number) => setMaand(({ j, m }) => {
        const n = new Date(j, m + stap, 1);
        return { j: n.getFullYear(), m: n.getMonth() };
    });

    const eind = fase === "vertrek" && aankomst && hover > aankomst ? hover : vertrek;
    const vandaag = vandaagIso();

    const maandBlok = (j: number, m: number) => {
        const eerste = (new Date(j, m, 1).getDay() + 6) % 7;
        const aantal = new Date(j, m + 1, 0).getDate();
        const vakjes: (string | null)[] = [...Array(eerste).fill(null), ...Array.from({ length: aantal }, (_, i) => iso(j, m, i + 1))];
        return (
            <div key={`${j}-${m}`} style={{ width: "266px" }}>
                <div style={{ textAlign: "center", fontWeight: "bold", color: "#333", marginBottom: "8px", textTransform: "capitalize" }}>{MAANDEN[m]} {j}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 38px)", rowGap: "2px" }}>
                    {DAGEN.map(d => <div key={d} style={{ textAlign: "center", fontSize: "0.72rem", color: "#999", paddingBottom: "4px" }}>{d}</div>)}
                    {vakjes.map((dag, i) => {
                        if (!dag) return <div key={i} />;
                        const isBegin = dag === aankomst;
                        const isEind = !!eind && dag === eind;
                        const binnen = !!aankomst && !!eind && dag > aankomst && dag < eind;
                        const randVan = (isBegin && eind && eind > aankomst) || binnen || (isEind && aankomst);
                        return (
                            <div key={dag} style={{
                                height: "38px",
                                backgroundColor: randVan ? BEREIK : "transparent",
                                borderTopLeftRadius: isBegin ? "19px" : 0, borderBottomLeftRadius: isBegin ? "19px" : 0,
                                borderTopRightRadius: isEind ? "19px" : 0, borderBottomRightRadius: isEind ? "19px" : 0,
                            }}>
                                <button
                                    type="button"
                                    onClick={() => kies(dag)}
                                    onMouseEnter={() => setHover(dag)}
                                    style={{
                                        width: "38px", height: "38px", borderRadius: "50%", cursor: "pointer", fontSize: "0.88rem",
                                        border: dag === vandaag && !isBegin && !isEind ? `1px solid ${GROEN}` : "1px solid transparent",
                                        backgroundColor: isBegin || isEind ? GROEN : "transparent",
                                        color: isBegin || isEind ? "white" : "#333",
                                        fontWeight: isBegin || isEind ? "bold" : "normal",
                                    }}
                                >{Number(dag.slice(8))}</button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const veld = (f: Fase, waarde: string, label: string) => {
        const actief = open && fase === f;
        return (
            <div style={{ flex }} ref={f === "aankomst" ? ankerRef : vertrekRef}>
                <label style={labelStyle}>{label}</label>
                <button
                    type="button"
                    onClick={() => openen(f)}
                    style={{
                        ...veldStyle,
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px",
                        backgroundColor: "white", cursor: "pointer", textAlign: "left", font: "inherit", fontSize: veldStyle.fontSize,
                        color: waarde ? "#333" : "#999",
                        borderColor: actief ? GROEN : undefined,
                        boxShadow: actief ? `0 0 0 2px ${GROEN}33` : undefined,
                    }}
                >
                    <span>{waarde ? toonDatum(waarde) : "dd-mm-jjjj"}</span>
                    <span aria-hidden style={{ fontSize: "0.9em" }}>📅</span>
                </button>
            </div>
        );
    };

    const volgende = new Date(maand.j, maand.m + 1, 1);

    return (
        <>
            {veld("aankomst", aankomst, "Aankomst")}
            {veld("vertrek", vertrek, "Vertrek")}
            {open && positie && createPortal(
                <div ref={popRef} style={{ position: "fixed", top: positie.top, left: positie.left, zIndex: 10000, backgroundColor: "white", borderRadius: "12px", boxShadow: "0 12px 32px rgba(0,0,0,0.18)", padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <button type="button" onClick={() => verschuif(-1)} aria-label="Vorige maand" style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: GROEN, padding: "0 8px" }}>‹</button>
                        <span style={{ fontSize: "0.85rem", color: "#666" }}>
                            {fase === "aankomst" ? "Kies de aankomstdatum" : "Kies de vertrekdatum"}
                        </span>
                        <button type="button" onClick={() => verschuif(1)} aria-label="Volgende maand" style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: GROEN, padding: "0 8px" }}>›</button>
                    </div>
                    <div style={{ display: "flex", gap: "28px" }} onMouseLeave={() => setHover("")}>
                        {maandBlok(maand.j, maand.m)}
                        {positie.breed && maandBlok(volgende.getFullYear(), volgende.getMonth())}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", borderTop: "1px solid #eee", paddingTop: "10px", gap: "10px" }}>
                        <span style={{ fontSize: "0.85rem", color: "#444" }}>
                            {aankomst && vertrek ? `${toonDatum(aankomst)} t/m ${toonDatum(vertrek)} · ${nachten(aankomst, vertrek)} ${nachten(aankomst, vertrek) === 1 ? "nacht" : "nachten"}` : aankomst ? `Aankomst ${toonDatum(aankomst)}` : ""}
                        </span>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button type="button" onClick={() => { onChange("", ""); setFase("aankomst"); }} style={{ background: "none", border: "none", color: "#666", textDecoration: "underline", cursor: "pointer", fontSize: "0.85rem" }}>Wissen</button>
                            <button type="button" onClick={() => setOpen(false)} style={{ backgroundColor: GROEN, color: "white", border: "none", borderRadius: "6px", padding: "6px 14px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}>Klaar</button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
