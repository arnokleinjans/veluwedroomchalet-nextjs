"use client";

import { useState } from "react";
import ImageLightbox from "./ImageLightbox";

export type Stap = {
    image?: string;
    tekst?: string;
    volleBreedte?: boolean;
};

export default function Stappenplan({ stappen }: { stappen?: Stap[] }) {
    const [vergroot, setVergroot] = useState<string | null>(null);
    const items = (stappen || []).filter(s => (s.tekst && s.tekst.trim()) || (s.image && s.image.trim()));
    if (items.length === 0) return null;

    return (
        <>
            <div className="stappenplan">
                {items.map((stap, i) => {
                    const beeld = stap.image ? `/${stap.image}` : "";
                    return (
                        <div key={i} className={`stappenplan-kaart${stap.volleBreedte ? " stappenplan-breed" : ""}`}>
                            {beeld && (
                                <button
                                    type="button"
                                    className="stappenplan-beeld"
                                    onClick={() => setVergroot(beeld)}
                                    aria-label="Bekijk afbeelding op volledig scherm"
                                >
                                    <img src={beeld} alt="" />
                                    <span className="stappenplan-vergroot" aria-hidden="true">⤢</span>
                                </button>
                            )}
                            <div className="stappenplan-kop">
                                <span className="stappenplan-nummer">{i + 1}</span>
                                {stap.tekst && <p className="stappenplan-tekst">{stap.tekst}</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
            <ImageLightbox src={vergroot} onClose={() => setVergroot(null)} />
        </>
    );
}
