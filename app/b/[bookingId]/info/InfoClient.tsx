"use client";

import Link from "next/link";
import { parseTemplateString } from "../../../utils/templateParser";

export default function InfoClient({ appData, booking, basePath }: { appData: any, booking: any, basePath: string }) {
    return (
        <div className="tab-content active" id="info-tab">
            <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="videos-container">
                    {appData.videos.map((video: any, index: number) => (
                        <div key={index} style={{ width: "100%" }} className="group">
                            <Link href={`${basePath}/video/${index}`}>
                                <div
                                    className="video-thumb shadow-sm transition-shadow group-hover:shadow-md"
                                    style={{ backgroundImage: `url('/${video.thumb}')` }}
                                >
                                    <div className="play-overlay">
                                        {/* @ts-ignore */}
                                        <ion-icon name="play-circle"></ion-icon>
                                    </div>
                                </div>
                            </Link>
                            <h4 className="md:text-white text-center font-bold text-xl md:text-2xl" style={{ marginTop: "15px", fontFamily: "Nunito, sans-serif" }}>
                                {parseTemplateString(video.title, booking)}
                            </h4>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

