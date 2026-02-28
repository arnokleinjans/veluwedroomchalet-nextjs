"use client";

import Link from "next/link";
import { parseTemplateString } from "../../../utils/templateParser";

export default function InfoClient({ appData, booking, basePath }: { appData: any, booking: any, basePath: string }) {
    return (
        <div className="tab-content active" id="info-tab">
            <div className="video-card" id="videos-container">
                {appData.videos.map((video: any, index: number) => (
                    <div key={index} style={{ width: "100%", marginBottom: "20px" }}>
                        <Link href={`${basePath}/video/${index}`}>
                            <div
                                className="video-thumb"
                                style={{ backgroundImage: `url('/${video.thumb}')` }}
                            >
                                <div className="play-overlay">
                                    {/* @ts-ignore */}
                                    <ion-icon name="play-circle"></ion-icon>
                                </div>
                            </div>
                        </Link>
                        <h4 style={{ marginTop: "10px", fontFamily: "Nunito, sans-serif", fontSize: "1.1rem" }}>
                            {parseTemplateString(video.title, booking)}
                        </h4>
                    </div>
                ))}
            </div>
        </div>
    );
}
