"use client";

import { useEffect } from "react";

export default function ImageLightbox({
    src,
    name,
    onClose,
}: {
    src: string | null;
    name?: string;
    onClose: () => void;
}) {
    useEffect(() => {
        if (!src) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [src, onClose]);

    if (!src) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)",
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", zIndex: 2100, padding: "24px", cursor: "zoom-out",
            }}
        >
            <img
                src={src}
                alt={name || ""}
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: "100%", maxHeight: "85vh", objectFit: "contain",
                    borderRadius: "8px", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", cursor: "default",
                }}
            />
            {name && (
                <div style={{ color: "#fff", marginTop: "14px", fontSize: "0.9rem", fontWeight: "bold", textAlign: "center" }}>
                    {name}
                </div>
            )}
            <div style={{ color: "rgba(255,255,255,0.6)", marginTop: "6px", fontSize: "0.75rem" }}>
                Klik ergens of druk op Esc om te sluiten
            </div>
        </div>
    );
}
