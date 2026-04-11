"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CinemaPlayer({ embedUrl, title, bookingId, backText = "Terug" }: { embedUrl: string, title: string, bookingId: string, backText?: string }) {
    const router = useRouter();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Fade-in animation
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(() => router.back(), 300);
    };

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.3s ease",
        }}>
            <div style={{ width: "100%", maxWidth: "900px", padding: "0 20px", display: "flex", flexDirection: "column", gap: "20px", alignItems: "flex-start" }}>
                {/* Professional Back Button */}
                <button
                    onClick={handleClose}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        backgroundColor: "rgba(255,255,255,0.15)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        color: "white",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "20px",
                        padding: "10px 18px",
                        fontSize: "1rem",
                        fontWeight: "bold",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.25)";
                        e.currentTarget.style.transform = "translateX(-4px)";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)";
                        e.currentTarget.style.transform = "none";
                    }}
                >
                    <span>←</span>
                    <span>{backText}</span>
                </button>

                {/* Video player */}
                <div style={{ width: "100%", padding: "0" }}>
                    <div style={{
                        position: "relative",
                        paddingBottom: "56.25%",
                        height: 0,
                        overflow: "hidden",
                        borderRadius: "0",
                        boxShadow: "0 0 60px rgba(255,255,255,0.05)",
                    }}>
                        <iframe
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                border: "none",
                            }}
                            src={embedUrl}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
