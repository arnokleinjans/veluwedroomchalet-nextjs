"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { parseTemplateString } from "../utils/templateParser";
import { t } from "../utils/translations";

import WeatherWidget from "./WeatherWidget";

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
                <h2>{t('welcome', booking?.language)} bij<br />{appData.property.name}</h2>
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
    const isGameroom = pathname.includes("/gameroom/");

    if (isGameroom) return <>{children}</>;

    const subtitle = parseTemplateString(appData.property.subtitle || "Welkom terug", booking);

    // Determine the page title for the compact top bar
    let pageTitle = subtitle;
    const omgevingDetailMatch = pathname.match(/\/omgeving\/(\d+)/);
    const homeDetailMatch = pathname.match(/\/info\/home\/(\d+)/);
    const videoMatch = pathname.match(/\/video\/(\d+)/);
    
    let videoTitle = null;
    if (videoMatch && appData.videos) {
        const idx = parseInt(videoMatch[1], 10);
        if (appData.videos[idx]) {
            videoTitle = parseTemplateString(appData.videos[idx].title, booking);
        }
    }

    // For detail pages, we keep the main category title. The specific item title will be shown inside the card.
    if (videoTitle) pageTitle = videoTitle;
    else if (homeDetailMatch) pageTitle = "";
    else if (pathname.includes("/info")) pageTitle = t('instructions', booking?.language);
    else if (pathname.includes("/omgeving")) pageTitle = t('environment', booking?.language);
    else if (pathname.includes("/chat")) pageTitle = t('chat_bot', booking?.language);
    else if (pathname === basePath || pathname === `${basePath}/`) {
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
                            <Link href={`${basePath}/`} className="text-gray-600 hover:text-gray-900 font-semibold transition-colors">{t('home', booking?.language)}</Link>
                            <Link href={`${basePath}/info`} className="text-gray-600 hover:text-gray-900 font-semibold transition-colors">{t('instructions', booking?.language)}</Link>
                            <Link href={`${basePath}/omgeving`} className="text-gray-600 hover:text-gray-900 font-semibold transition-colors">{t('environment', booking?.language)}</Link>
                            <Link href={`${basePath}/chat`} className="text-gray-600 hover:text-gray-900 font-semibold transition-colors">{t('chat_bot', booking?.language)}</Link>
                        </nav>
                    </div>
                </div>
            </div>

            {isHomePage ? (
                <header className="app-header w-full flex-shrink-0 relative z-[2]" style={{ backgroundImage: `url('/${appData.property.headerImage}')` }}>
                    <div className="header-overlay flex">
                        <div className="welcome-text max-w-[1280px] mx-auto w-full relative h-full flex items-end">
                            
                            {/* Weather Widget + Route Card stacked (TopRight on mobile, TopLeft on desktop) */}
                            <div className="absolute right-0 -top-[120px] md:right-auto md:left-4 xl:left-0 md:-top-[100px] xl:-top-[140px] scale-[0.65] md:scale-100 origin-top-right md:origin-top-left pointer-events-auto flex flex-col gap-3">
                                <WeatherWidget />
                                <style>{`
                                  @keyframes routePinPulse {
                                    0% { transform: scale(0.85); opacity: 0.8; }
                                    100% { transform: scale(2.0); opacity: 0; }
                                  }
                                  .route-pin-ring {
                                    position: absolute;
                                    inset: 0;
                                    border-radius: 50%;
                                    background: rgba(251, 191, 36, 0.35);
                                    animation: routePinPulse 2.4s ease-out infinite;
                                  }
                                  .route-pin-ring2 {
                                    animation-delay: 0.8s;
                                    background: rgba(251, 191, 36, 0.18);
                                  }
                                  .route-widget-link {
                                    display: flex;
                                    align-items: center;
                                    gap: 14px;
                                    text-decoration: none;
                                    color: white;
                                    width: 288px;
                                    background: rgba(0,0,0,0.20);
                                    backdrop-filter: blur(12px);
                                    -webkit-backdrop-filter: blur(12px);
                                    border: 1px solid rgba(255,255,255,0.20);
                                    border-radius: 2rem;
                                    padding: 16px 20px;
                                    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
                                    transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
                                  }
                                  .route-widget-link:hover {
                                    transform: scale(1.02);
                                    background: rgba(0,0,0,0.28);
                                    box-shadow: 0 12px 36px rgba(0,0,0,0.28);
                                  }
                                  .route-widget-link:active {
                                    transform: scale(0.97);
                                  }
                                `}</style>
                                <a
                                    href="https://www.google.com/maps/place/Recreatiepark+'t+Veluws+Hof/@52.1220391,5.9227256,612m/data=!3m2!1e3!4b1!4m6!3m5!1s0x47c7ba241b7b9487:0x8018f4c652072f60!8m2!3d52.1220391!4d5.9227256!16s%2Fg%2F11c59_4ycr?hl=nl-NL&entry=ttu&g_ep=EgoyMDI2MDQxNS4wIKXMDSoASAFQAw%3D%3D"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="route-widget-link"
                                >
                                    {/* Pulsing pin */}
                                    <div style={{ position: "relative", width: 40, height: 40, minWidth: 40, flexShrink: 0 }}>
                                        <div className="route-pin-ring" />
                                        <div className="route-pin-ring route-pin-ring2" />
                                        <div style={{ position: "relative", zIndex: 2, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            {/* @ts-ignore */}
                                            <ion-icon name="location" style={{ fontSize: "20px", color: "#FBBF24" }}></ion-icon>
                                        </div>
                                    </div>
                                    {/* Text */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "rgba(255,255,255,0.60)", marginBottom: 2 }}>Route naar</div>
                                        <div style={{ fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.25, color: "white" }}>&apos;t Veluws Hof</div>
                                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)", marginTop: 2 }}>~5 min rijden</div>
                                    </div>
                                    {/* Navigate icon */}
                                    <div style={{ flexShrink: 0, color: "rgba(255,255,255,0.55)" }}>
                                        {/* @ts-ignore */}
                                        <ion-icon name="navigate-outline" style={{ fontSize: "18px", display: "block" }}></ion-icon>
                                    </div>
                                </a>
                            </div>

                            {/* Welcome Text */}
                            <div className="w-full">
                                <p className="greeting" id="greeting-text">{subtitle}</p>
                                <h1 id="property-name" className="md:hidden">{appData.property.name}</h1>
                            </div>

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
                    <span>{t('home', booking?.language)}</span>
                </Link>
                <Link href={`${basePath}/info`} className={`nav-item ${pathname === `${basePath}/info` ? "active" : ""}`} prefetch={false}>
                    {/* @ts-ignore */}
                    <ion-icon name="videocam-outline"></ion-icon>
                    <span>{t('instructions', booking?.language)}</span>
                </Link>
                <Link href={`${basePath}/omgeving`} className={`nav-item ${pathname === `${basePath}/omgeving` ? "active" : ""}`} prefetch={false}>
                    {/* @ts-ignore */}
                    <ion-icon name="map-outline"></ion-icon>
                    <span>{t('environment', booking?.language)}</span>
                </Link>
                <Link href={`${basePath}/chat`} className={`nav-item ${pathname === `${basePath}/chat` ? "active" : ""}`} prefetch={false}>
                    {/* @ts-ignore */}
                    <ion-icon name="chatbubbles-outline"></ion-icon>
                    <span>{t('chat_bot', booking?.language)}</span>
                </Link>
            </nav>
        </div>
    );
}
