"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CinemaPlayer({ embedUrl, title, bookingId }: { embedUrl: string, title: string, bookingId: string }) {
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
            backgroundColor: "#000",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.3s ease",
        }}>
            {/* Close button */}
            <button
                onClick={handleClose}
                style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    backgroundColor: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(4px)",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "44px",
                    height: "44px",
                    fontSize: "1.4rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                    transition: "background-color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)")}
            >
                ✕
            </button>

            {/* Title */}
            <h2 style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                color: "rgba(255,255,255,0.9)",
                fontSize: "1.1rem",
                fontWeight: "bold",
                margin: 0,
                maxWidth: "calc(100% - 80px)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
            }}>
                {title}
            </h2>

            {/* Video player */}
            <div style={{
                width: "100%",
                maxWidth: "900px",
                padding: "0 16px",
            }}>
                <div style={{
                    position: "relative",
                    paddingBottom: "56.25%",
                    height: 0,
                    overflow: "hidden",
                    borderRadius: "12px",
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
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            </div>

            {/* Subtle bottom hint */}
            <p style={{
                position: "absolute",
                bottom: "20px",
                color: "rgba(255,255,255,0.3)",
                fontSize: "0.8rem",
                margin: 0,
            }}>
                Tik op ✕ om terug te gaan
            </p>
        </div>
    );
}
