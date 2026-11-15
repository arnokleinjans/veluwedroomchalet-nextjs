"use client";

import { useEffect, useId, useRef, useState } from "react";
import { t } from "../../utils/translations";

type Geluid = "slide" | "ratchet" | "drop" | "chime" | "pick";

function maakSpeler() {
    let ctx: AudioContext | null = null;
    let ruis: AudioBuffer | null = null;

    return (soort: Geluid, vertraging = 0) => {
        let a: AudioContext;
        try {
            if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (ctx.state === "suspended") ctx.resume();
            a = ctx;
        } catch {
            return;
        }
        if (!ruis || ruis.sampleRate !== a.sampleRate) {
            ruis = a.createBuffer(1, a.sampleRate, a.sampleRate);
            const d = ruis.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        const buffer = ruis;
        const t0 = a.currentTime + 0.01 + vertraging;

        const tik = (start: number, piek: number, aan: number, uit: number) => {
            const g = a.createGain();
            g.connect(a.destination);
            g.gain.setValueAtTime(0.0001, start);
            g.gain.linearRampToValueAtTime(piek, start + aan);
            g.gain.exponentialRampToValueAtTime(0.0001, start + aan + uit);
            return g;
        };
        const ruisBron = (naar: AudioNode, start: number, freq: number, q: number, type: BiquadFilterType, duur: number) => {
            const s = a.createBufferSource();
            s.buffer = buffer;
            const f = a.createBiquadFilter();
            f.type = type;
            f.frequency.value = freq;
            f.Q.value = q;
            s.connect(f);
            f.connect(naar);
            s.start(start, Math.random() * 0.5);
            s.stop(start + duur);
            return f;
        };

        if (soort === "slide") {
            const f = ruisBron(tik(t0, 0.22, 0.06, 0.22), t0, 900, 1.4, "bandpass", 0.35);
            f.frequency.exponentialRampToValueAtTime(2600, t0 + 0.3);
        } else if (soort === "pick") {
            ruisBron(tik(t0, 0.18, 0.003, 0.12), t0, 3200, 1.2, "bandpass", 0.15);
        } else if (soort === "drop") {
            ruisBron(tik(t0, 0.4, 0.002, 0.12), t0, 700, 0.8, "lowpass", 0.15);
            const o = a.createOscillator();
            o.frequency.setValueAtTime(140, t0);
            o.frequency.exponentialRampToValueAtTime(60, t0 + 0.12);
            o.connect(tik(t0, 0.3, 0.004, 0.176));
            o.start(t0);
            o.stop(t0 + 0.2);
        } else if (soort === "chime") {
            [[0, 1046.5], [0.09, 1318.5], [0.18, 1568]].forEach(([dd, freq]) => {
                const o = a.createOscillator();
                o.type = "sine";
                o.frequency.value = freq;
                o.connect(tik(t0 + dd, 0.14, 0.005, 0.595));
                o.start(t0 + dd);
                o.stop(t0 + dd + 0.65);
            });
        } else if (soort === "ratchet") {
            [0, 0.035, 0.07].forEach((dd, k) => {
                const tt = t0 + dd;
                const g = tik(tt, k === 2 ? 0.3 : 0.16, 0.001, 0.029);
                ruisBron(g, tt, 3800 + k * 500, 5, "bandpass", 0.04);
                const o = a.createOscillator();
                o.type = "square";
                o.frequency.value = 2300 + k * 260;
                o.connect(g);
                o.start(tt);
                o.stop(tt + 0.012);
            });
        }
    };
}

const WIEL_LINKS = 160;
const WIEL_RUIMTE = 152;
const MAX_WIELEN = 8;

export default function Sleutelkastje({ code, lang = "nl" }: { code: string; lang?: string }) {
    const doel = (code.match(/\d/g) || []).slice(0, MAX_WIELEN).map(Number);
    const begin = doel.map((v, i) => (v - (3 + ((i * 2) % 3)) + 10) % 10);
    const n = doel.length;

    const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
    const [stap, setStap] = useState(0);
    const [cijfers, setCijfers] = useState<number[]>(begin);
    const [open, setOpen] = useState(false);
    const [gepakt, setGepakt] = useState(0);
    const [bezig, setBezig] = useState(false);
    const [geluidAan, setGeluidAan] = useState(true);

    const bezigRef = useRef(false);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const strips = useRef<(SVGGElement | null)[]>([]);
    const speler = useRef<ReturnType<typeof maakSpeler> | null>(null);

    useEffect(() => {
        const lijst = timers.current;
        return () => { lijst.forEach(clearTimeout); };
    }, []);

    if (n === 0) return null;

    const straks = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
    const geluid = (soort: Geluid, vertraging = 0) => {
        if (!geluidAan) return;
        if (!speler.current) speler.current = maakSpeler();
        speler.current(soort, vertraging);
    };
    const zetBezig = (waarde: boolean) => { bezigRef.current = waarde; setBezig(waarde); };

    const rolNaarCode = () => {
        const rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (rustig) {
            setCijfers(doel);
            geluid("ratchet");
            setStap(2);
            return;
        }
        const plan: number[] = [];
        doel.forEach((v, i) => {
            const aantal = (v - begin[i] + 10) % 10;
            for (let k = 0; k < aantal; k++) plan.push(i);
        });
        zetBezig(true);
        let nr = 0;
        const tik = () => {
            if (nr >= plan.length) {
                setStap(2);
                zetBezig(false);
                return;
            }
            const wiel = plan[nr];
            const laatsteVanWiel = plan[nr + 1] !== wiel;
            nr++;
            setCijfers(c => c.map((v, k) => (k === wiel ? (v + 1) % 10 : v)));
            geluid("ratchet");
            strips.current[wiel]?.animate(
                [{ transform: "translateY(40px)" }, { transform: "translateY(0)" }],
                { duration: 115, easing: "ease-out" }
            );
            straks(tik, laatsteVanWiel ? 300 : 125);
        };
        tik();
    };

    const opnieuw = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        zetBezig(false);
        setStap(0);
        setCijfers(begin);
        setOpen(false);
        setGepakt(0);
        geluid("slide");
    };

    const volgende = () => {
        if (bezigRef.current) return;
        if (stap === 0) {
            geluid("slide");
            setStap(1);
        } else if (stap === 1) {
            rolNaarCode();
        } else if (stap === 2) {
            zetBezig(true);
            geluid("drop");
            setStap(3);
            straks(() => {
                setOpen(true);
                geluid("slide");
                geluid("chime", 0.25);
                straks(() => zetBezig(false), 450);
            }, 450);
        } else if (stap === 3) {
            zetBezig(true);
            geluid("pick");
            setGepakt(1);
            straks(() => {
                geluid("pick");
                setGepakt(2);
                setStap(4);
                zetBezig(false);
            }, 320);
        } else {
            opnieuw();
        }
    };

    const pitch = WIEL_RUIMTE / n;
    const wielBreed = pitch - 4;
    const schaal = Math.min(1, (4 / n) * 1.15);
    const klaar = stap === 4;
    const pasTekst = t("skk_pas", lang);
    const pulsen: Record<number, [number, number]> = { 1: [234, 182], 2: [126, 158], 3: [215, 250] };
    const puls = !bezig && !klaar ? pulsen[stap] : undefined;
    const stappen = [t("skk_stap1", lang), t("skk_stap2", lang), t("skk_stap3", lang), t("skk_stap4", lang)];

    return (
        <div className="skk" onClick={volgende}>
            <svg className="skk-svg" viewBox="40 10 340 630" role="img" aria-label={t("skk_aria", lang)}>
                <defs>
                    <filter id={`${uid}a`} x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="2" dy="6" stdDeviation="6" floodColor="#50341e" floodOpacity=".4" />
                    </filter>
                    <filter id={`${uid}b`} x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="1" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity=".45" />
                    </filter>
                    <clipPath id={`${uid}w`}><rect x="100" y="112" width="220" height="140" rx="22" /></clipPath>
                    {doel.map((_, i) => (
                        <clipPath key={i} id={`${uid}c${i}`}>
                            <rect x={WIEL_LINKS + i * pitch} y="126" width={wielBreed} height="112" rx="6" />
                        </clipPath>
                    ))}
                </defs>

                <rect x="150" y="10" width="120" height="630" fill="#E6DCC8" />
                <rect x="150" y="10" width="10" height="630" fill="#D8CDB6" />
                <path d="M70 60 Q70 30 110 26 L310 26 Q350 30 350 60 L362 470 Q362 512 320 514 L100 514 Q58 512 58 470 Z" fill="#1B252B" filter={`url(#${uid}a)`} />

                <g>
                    <rect x="92" y="56" width="236" height="430" rx="26" fill="#0C1215" />
                    <rect x="150" y="96" width="120" height="8" rx="4" fill="#3A474E" />
                    <circle cx="172" cy="100" r="7" fill="#8B969B" />
                    <g className={`skk-item${gepakt >= 1 ? " gone" : ""}`} filter={`url(#${uid}b)`}>
                        <circle cx="172" cy="150" r="27" fill="none" stroke="#E8B65C" strokeWidth="15" />
                        <path d="M165 176 h14 v150 h-14 z M179 262 h22 v14 h-10 v12 h10 v14 h-22 z" fill="#E8B65C" />
                    </g>
                    <g className={`skk-item${gepakt >= 2 ? " gone" : ""}`} filter={`url(#${uid}b)`} transform="rotate(6 262 300)">
                        <rect x="214" y="262" width="100" height="70" rx="8" fill="#8A9B7C" />
                        <rect x="222" y="272" width="84" height="16" fill="#243139" />
                        <text x="264" y="284" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#FFF8EB" {...(pasTekst.length > 11 ? { textLength: 76, lengthAdjust: "spacingAndGlyphs" } : {})}>{pasTekst}</text>
                        <path d="M232 322 v-18" stroke="#243139" strokeWidth="5" />
                        <path d="M232 308 h68" stroke="#C56B50" strokeWidth="6" />
                        <path d="M240 308 h60" stroke="#FFF8EB" strokeWidth="6" strokeDasharray="8 8" />
                    </g>
                </g>

                <g className={`skk-door${open ? " open" : ""}`}>
                    <g className="back">
                        <rect x="84" y="48" width="252" height="446" rx="30" fill="#1B252B" />
                        <rect x="110" y="96" width="200" height="170" rx="14" fill="#AEB5B8" />
                        <rect x="150" y="120" width="120" height="110" rx="8" fill="#DDE2E4" />
                        <rect x="170" y="140" width="22" height="70" rx="6" fill="#243139" />
                        <rect x="228" y="140" width="22" height="70" rx="6" fill="#243139" />
                    </g>
                    <g className="front">
                        <rect x="84" y="48" width="252" height="446" rx="30" fill="#2B3840" filter={`url(#${uid}b)`} />
                        <path d="M300 70 Q328 76 330 110 L334 440 Q332 474 304 482" fill="none" stroke="#3A4A54" strokeWidth="5" strokeLinecap="round" />
                        <rect x="100" y="112" width="220" height="140" rx="22" fill="#CDD2D4" />
                        <g clipPath={`url(#${uid}w)`}>
                            <rect x="110" y="130" width="32" height="104" rx="8" fill="#AEB5B8" />
                            <rect x="148" y="180.5" width="9" height="3.5" fill="#C56B50" />
                            <rect x="310" y="180.5" width="9" height="3.5" fill="#C56B50" />
                            {doel.map((_, i) => {
                                const x = WIEL_LINKS + i * pitch;
                                const d = cijfers[i];
                                return (
                                    <g key={i} clipPath={`url(#${uid}c${i})`}>
                                        <rect x={x} y="126" width={wielBreed} height="112" rx="6" fill="#EEF0F0" />
                                        <rect x={x} y="126" width={wielBreed} height="22" fill="#9AA3A7" opacity=".75" />
                                        <rect x={x} y="216" width={wielBreed} height="22" fill="#9AA3A7" opacity=".75" />
                                        <rect x={x} y="162" width={wielBreed} height="1.5" fill="#B9C0C3" />
                                        <rect x={x} y="202" width={wielBreed} height="1.5" fill="#B9C0C3" />
                                        <g ref={el => { strips.current[i] = el; }}>
                                            {[[142, (d + 9) % 10], [182, d], [222, (d + 1) % 10]].map(([y, waarde], k) => (
                                                <text key={k} x={x + wielBreed / 2} y={y} textAnchor="middle" dominantBaseline="central" fontSize={(k === 1 ? 32 : 26) * schaal} fontWeight="800" fill={k === 1 ? "#11181C" : "#5B666C"}>{waarde}</text>
                                            ))}
                                        </g>
                                    </g>
                                );
                            })}
                            <g className={`skk-knob${stap >= 3 ? " down" : ""}`}>
                                <rect className="k" x="112" y="132" width="28" height="48" rx="6" fill="#11181C" />
                                <rect className="k" x="117" y="152" width="18" height="4" rx="2" fill="#3A474E" />
                            </g>
                        </g>
                        <g className={`skk-cover${stap >= 1 ? " down" : ""}`}>
                            <rect x="94" y="106" width="232" height="152" rx="26" fill="#141C21" filter={`url(#${uid}b)`} />
                            <rect x="170" y="226" width="80" height="9" rx="4.5" fill="#34434C" />
                            <path className="chev" d="M190 160 l20 18 l20 -18 M190 186 l20 18 l20 -18" fill="none" stroke="#E8B65C" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                    </g>
                </g>

                {puls && (stap !== 3 || open) && (
                    <circle key={stap} className="skk-puls" cx={puls[0]} cy={puls[1]} r="30" fill="none" stroke="#E8B65C" strokeWidth="5" />
                )}
            </svg>

            <div className="skk-tekst">
                <p className="skk-intro">{t("skk_intro", lang)}</p>
                <div className="skk-code" aria-label={`${t("skk_code", lang)} ${doel.join(" ")}`}>
                    {doel.map((v, i) => <span key={i}>{v}</span>)}
                </div>
                <div className="skk-knoppen">
                    <button type="button" className="skk-knop" disabled={bezig}>
                        {klaar ? t("skk_opnieuw", lang) : `${t("skk_tik", lang)} ${stap + 1}`}
                    </button>
                    <button
                        type="button"
                        className="skk-geluid"
                        aria-pressed={geluidAan}
                        onClick={e => { e.stopPropagation(); setGeluidAan(v => !v); }}
                    >
                        {geluidAan ? "🔊" : "🔇"} {t(geluidAan ? "skk_geluid_aan" : "skk_geluid_uit", lang)}
                    </button>
                </div>
                <ol className="skk-stappen">
                    {stappen.map((tekst, i) => (
                        <li key={i} className={i < stap ? "done" : i === stap ? "cur" : ""}>{tekst}</li>
                    ))}
                </ol>
                <p className="skk-melding" role="status" aria-live="polite">{klaar ? t("skk_klaar", lang) : ""}</p>
            </div>
        </div>
    );
}
