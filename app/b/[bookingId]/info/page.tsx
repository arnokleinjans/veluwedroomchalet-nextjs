// app/b/[bookingId]/info/page.tsx
"use client";

import { useState } from "react";
import { getAppData } from "../../../utils/db";

export const dynamic = "force-dynamic";

export default async function Info() {
    const appData = await getAppData();
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const getEmbedUrl = (url: string) => {
        // Basic conversion from regular youtube url to embed url
        if (url.includes('youtube.com/watch?v=')) {
            return url.replace('watch?v=', 'embed/');
        }
        return url;
    };

    return (
        <div className="tab-content active" id="info-tab">
            <div className="info-list" id="rules-container">
                {appData.rules.map((rule, index) => (
                    <div key={index} className="info-item">
                        <div>
                            <h4>{rule.title}</h4>
                            <p>{rule.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <h2 style={{ fontSize: "1.4rem", marginBottom: "15px", marginTop: "25px" }}>
                Apparatuur Instructies
            </h2>
            <div className="video-card" id="videos-container">
                {appData.videos.map((video, index) => (
                    <div key={index} style={{ width: "100%", marginBottom: "20px" }}>
                        <div
                            className="video-thumb"
                            style={{ backgroundImage: `url('${video.thumb}')` }}
                            onClick={() => setVideoUrl(getEmbedUrl(video.url))}
                        >
                            <div className="play-overlay">
                                {/* @ts-ignore */}
                                <ion-icon name="play-circle"></ion-icon>
                            </div>
                        </div>
                        <h4 style={{ marginTop: "10px", fontFamily: "Nunito, sans-serif", fontSize: "1.1rem" }}>
                            {video.title}
                        </h4>
                    </div>
                ))}
            </div>

            {videoUrl && (
                <div className="modal show" onClick={() => setVideoUrl(null)}>
                    <div className="modal-content" style={{ padding: "15px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
                        <span
                            className="close-video-btn"
                            onClick={() => setVideoUrl(null)}
                            style={{ position: "absolute", top: "10px", right: "15px", fontSize: "1.8rem", cursor: "pointer", color: "var(--text-secondary)", zIndex: 10 }}
                        >
                            &times;
                        </span>
                        <h2 style={{ margin: "10px 0 15px", fontSize: "1.2rem", paddingLeft: "10px" }}>Instructie Video</h2>
                        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: "8px", background: "#000" }}>
                            <iframe
                                id="video-iframe"
                                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                                src={videoUrl}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
