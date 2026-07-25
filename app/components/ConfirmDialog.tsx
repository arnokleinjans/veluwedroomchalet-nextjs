"use client";

import { useEffect } from "react";

export type ConfirmDialogProps = {
    open: boolean;
    title: string;
    message?: string;
    /** Regels die als lijst onder de boodschap komen (bv. locaties waar iets gebruikt wordt). */
    details?: string[];
    confirmLabel?: string;
    cancelLabel?: string;
    /** "danger" = rode bevestigknop (verwijderen), "primary" = groen (gewone actie). */
    variant?: "danger" | "primary";
    /** Weglaten voor een melding met alleen een sluitknop (vervanger van alert()). */
    onConfirm?: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
    open,
    title,
    message,
    details,
    confirmLabel = "Ja, doorgaan",
    cancelLabel = "Annuleren",
    variant = "primary",
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
            if (e.key === "Enter" && onConfirm) onConfirm();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onConfirm, onCancel]);

    if (!open) return null;

    const accent = variant === "danger" ? "#d9534f" : "#4A5D23";

    return (
        <div
            onClick={onCancel}
            style={{
                position: "fixed", inset: 0, backgroundColor: "rgba(26,26,26,0.45)",
                backdropFilter: "blur(3px)", display: "flex", alignItems: "center",
                justifyContent: "center", zIndex: 2000, padding: "20px",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#fff", borderRadius: "16px", padding: "28px",
                    maxWidth: "440px", width: "100%",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
                    animation: "vdcDialogIn 0.18s ease-out",
                }}
            >
                <style>{`@keyframes vdcDialogIn { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }`}</style>

                <h3 style={{ margin: 0, fontFamily: "Lora, serif", fontSize: "1.25rem", color: accent }}>{title}</h3>

                {message && (
                    <p style={{ marginTop: "12px", marginBottom: 0, fontSize: "0.92rem", color: "#555", lineHeight: 1.5 }}>{message}</p>
                )}

                {details && details.length > 0 && (
                    <ul style={{ marginTop: "12px", marginBottom: 0, paddingLeft: "18px", fontSize: "0.85rem", color: "#666", lineHeight: 1.6 }}>
                        {details.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                )}

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px", flexWrap: "wrap" }}>
                    <button
                        onClick={onCancel}
                        style={{
                            backgroundColor: onConfirm ? "#f0f0f0" : accent,
                            color: onConfirm ? "#555" : "white",
                            border: "none", borderRadius: "8px", padding: "10px 20px",
                            cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem",
                        }}
                    >
                        {onConfirm ? cancelLabel : "Sluiten"}
                    </button>
                    {onConfirm && (
                        <button
                            onClick={onConfirm}
                            style={{
                                backgroundColor: accent, color: "white", border: "none",
                                borderRadius: "8px", padding: "10px 20px", cursor: "pointer",
                                fontWeight: "bold", fontSize: "0.9rem",
                            }}
                        >
                            {confirmLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
