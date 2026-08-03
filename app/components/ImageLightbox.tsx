"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ImageLightbox({
    src,
    name,
    onClose,
    vullend = false,
}: {
    src: string | null;
    name?: string;
    onClose: () => void;
    vullend?: boolean;
}) {
    const [gemount, setGemount] = useState(false);
    useEffect(() => { setGemount(true); }, []);

    useEffect(() => {
        if (!src) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        // Zonder deze vergrendeling scrolt de pagina eronder door bij inzoomen,
        // waardoor de afbeelding uit beeld kan raken.
        const vorigeOverflow = document.body.style.overflow;
        const vorigeOverscroll = document.body.style.overscrollBehavior;
        document.body.style.overflow = "hidden";
        document.body.style.overscrollBehavior = "contain";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = vorigeOverflow;
            document.body.style.overscrollBehavior = vorigeOverscroll;
        };
    }, [src, onClose]);

    if (!src || !gemount) return null;

    // Een ouder met backdrop-filter (de glazen kaart van de detailpagina) wordt het
    // referentiekader voor position:fixed. Via een portal hangt de overlay direct
    // onder <body> en dekt hij het hele scherm.
    return createPortal((
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)",
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", zIndex: 10050, padding: vullend ? "0" : "24px", cursor: "zoom-out",
                touchAction: "none", overscrollBehavior: "contain",
            }}
        >
            <img
                src={src}
                alt={name || ""}
                onClick={vullend ? undefined : (e) => e.stopPropagation()}
                style={vullend ? {
                    width: "100%", maxHeight: "100dvh", objectFit: "contain", cursor: "zoom-out",
                    backgroundColor: "#fff",
                } : {
                    maxWidth: "100%", maxHeight: "85vh", objectFit: "contain",
                    borderRadius: "8px", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", cursor: "default",
                }}
            />
            {name && (
                <div style={{ color: "#fff", marginTop: "14px", fontSize: "0.9rem", fontWeight: "bold", textAlign: "center" }}>
                    {name}
                </div>
            )}
            <div style={vullend
                ? { position: "absolute", bottom: "14px", left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.75)", fontSize: "0.75rem", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }
                : { color: "rgba(255,255,255,0.6)", marginTop: "6px", fontSize: "0.75rem" }}>
                Klik ergens of druk op Esc om te sluiten
            </div>
        </div>
    ), document.body);
}
