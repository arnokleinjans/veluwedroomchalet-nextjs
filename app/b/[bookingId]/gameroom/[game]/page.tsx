"use client";

import { useRouter, useParams } from "next/navigation";

const GAMES: Record<string, { title: string; src: string }> = {
    tetris: { title: "Tetris", src: "/Gameroom/tetris/index.html" },
    tetram: { title: "Tetram", src: "/Gameroom/Tetram/index.html" },
    "rocket-man": { title: "Rocket Man", src: "/Gameroom/rocket-man/index.html" },
    yahtzee: { title: "Yahtzee", src: "/Gameroom/yahtzee/index.html" },
    pacman: { title: "Pac-Man", src: "/Gameroom/pacman/index.html" },
};

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

export default function GamePage() {
    const router = useRouter();
    const params = useParams<{ bookingId: string; game: string }>();
    const gameInfo = GAMES[params.game];

    if (!gameInfo) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <p>Game niet gevonden.</p>
                <button onClick={() => router.back()} style={{ ...backBtnStyle, position: "static", borderRadius: "6px", width: "auto", padding: "8px 16px" }}>
                    ← Terug
                </button>
            </div>
        );
    }

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push(`/b/${params.bookingId}/`);
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
                src={gameInfo.src}
                title={gameInfo.title}
                style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                allow="fullscreen"
            />
        </div>
    );
}
