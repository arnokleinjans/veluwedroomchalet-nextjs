"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CinemaPlayer({ embedUrl, title, bookingId, backText = "Terug" }: { embedUrl: string, title: string, bookingId: string, backText?: string }) {
    const router = useRouter();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(() => router.back(), 300);
    };

    return (
        <>
            <style>{`
                .cinema-overlay {
                    position: fixed;
                    inset: 0;
                    background-color: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    transition: opacity 0.3s ease;
                }

                .cinema-inner {
                    width: 100%;
                    max-width: 900px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    align-items: flex-start;
                    padding: 0 20px;
                    box-sizing: border-box;
                }

                .cinema-back-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background-color: rgba(255,255,255,0.15);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 20px;
                    padding: 10px 18px;
                    font-size: 1rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                .cinema-back-btn:hover {
                    background-color: rgba(255,255,255,0.25);
                    transform: translateX(-4px);
                }

                .cinema-video-wrap {
                    width: 100%;
                    position: relative;
                    padding-bottom: 56.25%;
                    height: 0;
                    overflow: hidden;
                    box-shadow: 0 0 60px rgba(255,255,255,0.05);
                }

                .cinema-video-wrap iframe {
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%;
                    height: 100%;
                    border: none;
                }

                /* Mobiel staand: geen zijdelingse padding, volledige breedte */
                @media (max-width: 640px) {
                    .cinema-inner {
                        padding: 0;
                        gap: 12px;
                    }
                    .cinema-back-btn {
                        margin-left: 16px;
                    }
                }

                /* Mobiel liggend: hoogte-gebaseerd in plaats van breedte */
                @media (orientation: landscape) and (max-height: 500px) {
                    .cinema-overlay {
                        flex-direction: row;
                        justify-content: center;
                        align-items: center;
                        padding: 0;
                    }
                    .cinema-inner {
                        flex-direction: row;
                        align-items: center;
                        justify-content: center;
                        gap: 12px;
                        padding: 0 12px;
                        height: 100%;
                        max-width: 100%;
                    }
                    .cinema-back-btn {
                        margin-left: 0;
                        flex-direction: column;
                        gap: 4px;
                        padding: 10px 12px;
                        writing-mode: vertical-rl;
                        text-orientation: mixed;
                        height: auto;
                        font-size: 0.85rem;
                    }
                    .cinema-video-wrap {
                        /* Vul de volledige viewport-hoogte, breedte volgt 16:9 */
                        height: 100vh;
                        width: calc(100vh * 16 / 9);
                        padding-bottom: 0;
                        flex-shrink: 0;
                        max-width: calc(100vw - 80px);
                    }
                }
            `}</style>

            <div
                className="cinema-overlay"
                style={{ opacity: visible ? 1 : 0 }}
            >
                <div className="cinema-inner">
                    <button className="cinema-back-btn" onClick={handleClose}>
                        <span>←</span>
                        <span>{backText}</span>
                    </button>
                    <div className="cinema-video-wrap">
                        <iframe
                            src={embedUrl}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
