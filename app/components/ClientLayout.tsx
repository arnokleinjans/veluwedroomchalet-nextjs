"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { appData } from "../utils/mockData";

export default function ClientLayout({ children, basePath = "" }: { children: React.ReactNode, basePath?: string }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [accessCode, setAccessCode] = useState("");
    const [error, setError] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setIsMounted(true);
        const auth = localStorage.getItem("veluwe_auth");
        if (auth === "true") {
            setIsAuthenticated(true);
        }
    }, []);

    const handleLogin = () => {
        if (accessCode === appData.accessCode) {
            setIsAuthenticated(true);
            setError(false);
            localStorage.setItem("veluwe_auth", "true");
        } else {
            setError(true);
        }
    };

    if (!isMounted) return null; // Prevent hydration mismatch

    // If a basePath is provided (we are in a personalized /b/[id] route), skip the general access code login
    if (!isAuthenticated && !basePath) {
        return (
            <div className="login-overlay active">
                {/* ... login overlay JSX ... */}
                <h2>Welkom bij<br />{appData.property.name}</h2>
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p style={{ color: "#EEE" }}>Voer uw toegangscode in:</p>
                    <input
                        type="password"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        style={{ padding: "10px", width: "100%", fontSize: "16px", textAlign: "center", borderRadius: "8px", border: "none" }}
                        placeholder="bijv. VELUWE2026"
                    />
                    {error && <p style={{ color: "#FFA1A1", fontSize: "14px" }}>Onjuiste code. Probeer het opnieuw.</p>}
                    <button onClick={handleLogin} style={{ backgroundColor: "var(--primary-color)", color: "white", padding: "10px 20px", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px", marginTop: "10px" }}>Open App</button>
                    <p style={{ fontSize: "12px", color: "#AAA", marginTop: "10px" }}>U vindt de code in uw welkomstbericht.</p>
                </div>
            </div>
        );
    }

    // Determine if we are on the home page of the current booking
    const isHomePage = pathname === basePath || pathname === `${basePath}/`;

    // Determine the page title for the compact top bar
    let pageTitle = "Welkom terug";
    if (pathname.includes("/info")) pageTitle = "Info & Regels";
    else if (pathname.includes("/omgeving")) pageTitle = "In de Omgeving";
    else if (pathname.includes("/chat")) pageTitle = "Digitale Conciërge";

    return (
        <div className="app-container" id="main-app-container">
            {isHomePage ? (
                <header className="app-header" style={{ backgroundImage: `url('/${appData.property.headerImage}')` }}>
                    <div className="header-overlay">
                        <div className="welcome-text">
                            <p className="greeting" id="greeting-text">Welkom terug</p>
                            <h1 id="property-name">{appData.property.name}</h1>
                        </div>
                    </div>
                </header>
            ) : (
                <header className="app-header-compact">
                    <h2>{pageTitle}</h2>
                </header>
            )}

            <main className="app-content" id="main-content">
                {children}
            </main>

            <nav className="bottom-nav">
                <Link href={`${basePath}/`} className={`nav-item ${pathname === `${basePath}/` || pathname === basePath ? "active" : ""}`} prefetch={false}>
                    {/* @ts-ignore */}
                    <ion-icon name="home-outline"></ion-icon>
                    <span>Home</span>
                </Link>
                <Link href={`${basePath}/info`} className={`nav-item ${pathname === `${basePath}/info` ? "active" : ""}`} prefetch={false}>
                    {/* @ts-ignore */}
                    <ion-icon name="information-circle-outline"></ion-icon>
                    <span>Info & Regels</span>
                </Link>
                <Link href={`${basePath}/omgeving`} className={`nav-item ${pathname === `${basePath}/omgeving` ? "active" : ""}`} prefetch={false}>
                    {/* @ts-ignore */}
                    <ion-icon name="map-outline"></ion-icon>
                    <span>Omgeving</span>
                </Link>
                <Link href={`${basePath}/chat`} className={`nav-item ${pathname === `${basePath}/chat` ? "active" : ""}`} prefetch={false}>
                    {/* @ts-ignore */}
                    <ion-icon name="chatbubbles-outline"></ion-icon>
                    <span>Conciërge</span>
                </Link>
            </nav>
        </div>
    );
}
