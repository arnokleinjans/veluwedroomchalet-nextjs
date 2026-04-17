"use client";

import { useRouter } from "next/navigation";

const backBtnStyle: React.CSSProperties = {
    position: "fixed",
    top: "14px",
    left: "14px",
    zIndex: 100,
    backgroundColor: "rgba(0,0,0,0.50)",
    color: "white",
    borderRadius: "50%",
    width: "38px",
    height: "38px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    fontSize: "1.1rem",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    border: "none",
    cursor: "pointer",
};

export default function GameFrame({ title, src, bookingId }: { title: string; src: string; bookingId: string }) {
    const router = useRouter();

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push(`/b/${bookingId}/`);
        }
    };

    return (
        <div style={{ position: "relative", width: "100%", height: "100dvh", overflow: "hidden", background: "#000" }}>
            {/* Transparent shield: prevents iframe from capturing pointer events over the back button */}
            <div style={{ position: "fixed", top: 0, left: 0, width: "62px", height: "62px", zIndex: 99 }} />
            <button onClick={handleBack} style={backBtnStyle} title="Terug">
                ←
            </button>
            <iframe
                src={src}
                title={title}
                style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                allow="fullscreen"
            />
        </div>
    );
}
