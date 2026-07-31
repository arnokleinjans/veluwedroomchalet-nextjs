"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TEST_COOKIE, TEST_FASES, TestKeuze, schrijfTestKeuze } from "../utils/testModus";
import { TALEN } from "../utils/talen";

export const TEST_BALK_HOOGTE = 42;
const HOOGTE = TEST_BALK_HOOGTE;

export default function TestBalk({ keuze }: { keuze: TestKeuze }) {
    const router = useRouter();
    const [bezig, setBezig] = useState(false);

    const zet = (velden: Partial<TestKeuze>) => {
        const nieuw = { ...keuze, ...velden };
        document.cookie = `${TEST_COOKIE}=${encodeURIComponent(schrijfTestKeuze(nieuw))}; path=/; max-age=31536000; samesite=lax`;
        setBezig(true);
        router.refresh();
        setTimeout(() => setBezig(false), 800);
    };

    const veld: React.CSSProperties = {
        backgroundColor: "#2f3a1c",
        color: "#fff",
        border: "1px solid #5c6e37",
        borderRadius: "5px",
        padding: "3px 6px",
        fontSize: "0.78rem",
        fontFamily: "inherit",
        cursor: "pointer",
        maxWidth: "160px",
    };
    const label: React.CSSProperties = { fontSize: "0.7rem", color: "#c9d6ad", marginRight: "4px", letterSpacing: "0.03em" };

    return (
        <>
            <div style={{
                position: "fixed", top: 0, left: 0, right: 0, height: `${HOOGTE}px`, zIndex: 9999,
                backgroundColor: "#4A5D23", color: "#fff",
                display: "flex", alignItems: "center", gap: "14px",
                padding: "0 12px", overflowX: "auto", whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)", fontFamily: "var(--font-nunito), sans-serif",
            }}>
                <span style={{ fontWeight: 700, fontSize: "0.78rem", flexShrink: 0 }}>
                    🧪 TEST{bezig ? " …" : ""}
                </span>

                <span style={{ flexShrink: 0 }}>
                    <span style={label}>Fase</span>
                    <select style={veld} value={keuze.fase} onChange={e => zet({ fase: e.target.value as TestKeuze["fase"] })}>
                        {TEST_FASES.map(f => <option key={f.waarde} value={f.waarde}>{f.label}</option>)}
                    </select>
                </span>

                <span style={{ flexShrink: 0 }}>
                    <span style={label}>Taal</span>
                    <select style={veld} value={keuze.taal} onChange={e => zet({ taal: e.target.value })}>
                        {TALEN.map(t => <option key={t.code} value={t.code}>{t.naam}</option>)}
                    </select>
                </span>

                <span style={{ flexShrink: 0 }}>
                    <span style={label}>Nachtregistratie</span>
                    <select style={veld} value={keuze.nachtreg} onChange={e => zet({ nachtreg: e.target.value as TestKeuze["nachtreg"] })}>
                        <option value="leeg">leeg</option>
                        <option value="ingevuld">ingevuld</option>
                        <option value="verstuurd">verstuurd</option>
                    </select>
                </span>
            </div>
            <div style={{ height: `${HOOGTE}px`, flexShrink: 0 }} />
        </>
    );
}
