"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { parseTemplateString } from "../utils/templateParser";

export default function ClientLayout({ children, basePath = "", appData, booking = null }: { children: React.ReactNode, basePath?: string, appData: any, booking?: any }) {
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

    const subtitle = parseTemplateString(appData.property.subtitle || "Welkom terug", booking);

    // Determine the page title for the compact top bar
    let pageTitle = subtitle;
    const omgevingDetailMatch = pathname.match(/\/omgeving\/(\d+)/);
    const homeDetailMatch = pathname.match(/\/info\/home\/(\d+)/);
    
    // For detail pages, we keep the main category title. The specific item title will be shown inside the card.
    if (pathname.includes("/info")) pageTitle = "Videoinstructies";
    else if (pathname.includes("/omgeving")) pageTitle = "In de Omgeving";
    else if (pathname.includes("/chat")) pageTitle = "Digitale Conciërge";
    else if (pathname === basePath || pathname === `${basePath}/` || homeDetailMatch) {
        pageTitle = subtitle;
    }

    const headerImage = appData.property?.headerImage;

    return (
        <div className="font-sans text-[var(--text-primary)] antialiased min-h-screen app-container" id="main-app-container">
            {/* Watermark background — desktop only */}
            {headerImage && (
                <div
                    className="hidden md:block fixed inset-0 pointer-events-none z-[1]"
                    style={{
                        backgroundImage: `url('/${headerImage}')`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        opacity: 0.6,
                        filter: "blur(2px) grayscale(30%)",
                    }}
                />
            )}
            {/* Desktop Top Nav */}
            <div className="hidden md:block fixed top-0 left-0 right-0 z-[60] w-full bg-[rgba(253,251,247,0.85)] backdrop-blur-md border-b border-[var(--border-color)]">
                <div className="desktop-nav-inner flex items-center relative">
                    <div className="flex-1 flex justify-start">
                        <h1 className="text-xl font-bold" style={{ color: "var(--primary-color)" }}>{appData.property.name}</h1>
                    </div>
                    {!isHomePage && (
                        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 justify-center w-auto text-center pointer-events-none">
                            <h2 className="text-xl font-bold" style={{ color: "var(--primary-color)" }}>{pageTitle}</h2>
                        </div>
                    )}
                    <div className="flex-1 flex justify-end flex-shrink-0">
                        <nav className="flex items-center gap-6 whitespace-nowrap">
                            <Link href={`${basePath}/`} className="text-gray-600 hover:text-gray-900 font-semibold transition-colors">Home</Link>
                            <Link href={`${basePath}/info`} className="text-gray-600 hover:text-gray-900 font-semibold transition-colors">Video's</Link>
                            <Link href={`${basePath}/omgeving`} className="text-gray-600 hover:text-gray-900 font-semibold transition-colors">Omgeving</Link>
                            <Link href={`${basePath}/chat`} className="text-gray-600 hover:text-gray-900 font-semibold transition-colors">Conciërge</Link>
                        </nav>
                    </div>
                </div>
            </div>

            {isHomePage ? (
                <header className="app-header w-full flex-shrink-0" style={{ backgroundImage: `url('/${appData.property.headerImage}')` }}>
                    <div className="header-overlay flex md:justify-center md:items-center">
                        <div className="welcome-text max-w-[1280px] mx-auto w-full md:text-center">
                            <p className="greeting" id="greeting-text">{subtitle}</p>
                            <h1 id="property-name" className="md:hidden">{appData.property.name}</h1>
                        </div>
                    </div>
                </header>
            ) : (
                <header className="app-header-compact md:!hidden">
                    <h2>{pageTitle}</h2>
                </header>
            )}

            <main className={`app-content w-full relative z-[2] ${!isHomePage ? 'detail-page' : ''}`} id="main-content">
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
                    <ion-icon name="videocam-outline"></ion-icon>
                    <span>Videoinstructies</span>
                </Link>
                <Link href={`${basePath}/omgeving`} className={`nav-item ${pathname === `${basePath}/omgeving` ? "active" : ""}`} prefetch={false}>
                    {/* @ts-ignore */}
                    <ion-icon name="map-outline"></ion-icon>
                    <span>Omgeving</span>
                </Link>
                <Link href={`${basePath}/chat`} className={`nav-item ${pathname === `${basePath}/chat` ? "active" : ""}`} prefetch={false}>
                    {/* @ts-ignore */}
                    <ion-icon name="chatbubbles-outline"></ion-icon>
                    <span>Digitale Conciërge</span>
                </Link>
            </nav>
        </div>
    );
}
