"use client";

import Link from "next/link";
import { parseTemplateString } from "../../../utils/templateParser";

export default function InfoClient({ appData, booking, basePath }: { appData: any, booking: any, basePath: string }) {
    return (
        <div className="tab-content active" id="info-tab">
            <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="videos-container">
                    {appData.videos.map((video: any, index: number) => {
                        const leafIndex = index % 6;
                        const defaultLeaf = ['leaf-oak', 'leaf-maple', 'leaf-monstera', 'leaf-birch', 'leaf-chestnut', 'leaf-beech'][leafIndex];
                        const leafStyle = video.leafStyle || defaultLeaf;

                        let leafTransform = 'none';
                        if (leafStyle === 'leaf-oak') {
                            leafTransform = 'translate(-30%, 15%) rotate(200deg) scale(1)'; 
                        } else if (leafStyle === 'leaf-birch') {
                            leafTransform = 'translate(0%, 15%) rotate(290deg) scale(1.2)'; 
                        } else if (leafStyle === 'leaf-beech') {
                            leafTransform = 'translate(0%, 15%) rotate(290deg) scale(1.2)'; 
                        }

                        if (video.leafRotate !== undefined || video.leafScale !== undefined || video.leafTranslateX !== undefined || video.leafTranslateY !== undefined) {
                            const defs = leafStyle === 'leaf-oak' ? { r: 200, s: 1, tx: -30, ty: 15 } 
                                       : leafStyle === 'leaf-birch' ? { r: 290, s: 1.2, tx: 0, ty: 15 }
                                       : leafStyle === 'leaf-beech' ? { r: 290, s: 1.2, tx: 0, ty: 15 }
                                       : { r: 0, s: 1, tx: 0, ty: 0 };
                            
                            const rx = video.leafRotate ?? defs.r;
                            const s = video.leafScale ?? defs.s;
                            const tx = video.leafTranslateX ?? defs.tx;
                            const ty = video.leafTranslateY ?? defs.ty;
                            leafTransform = `translate(${tx}%, ${ty}%) rotate(${rx}deg) scale(${s})`;
                        }
                        return (
                            <div key={index} style={{ width: "100%" }}>
                                <Link href={`${basePath}/video/${index}`} style={{ display: 'block', textDecoration: 'none' }}>
                                    <div
                                        className="shadow-md rounded-[20px] relative overflow-hidden group transition-transform hover:scale-[1.02]"
                                        style={{
                                            backgroundImage: `url('/${video.thumb}')`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            width: '100%',
                                            height: '220px',
                                            boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
                                        }}
                                    >
                                        {/* Play Button - Centered Left */}
                                        <div style={{
                                            position: 'absolute',
                                            left: '25%',
                                            top: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            width: '60px',
                                            height: '60px',
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(237, 232, 219, 0.9)',
                                            backdropFilter: 'blur(4px)',
                                            WebkitBackdropFilter: 'blur(4px)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                            transition: 'transform 0.2sease',
                                            zIndex: 2
                                        }} className="group-hover:scale-110">
                                            {/* @ts-ignore */}
                                            <ion-icon name="play" style={{ color: '#4A5D23', fontSize: '32px', marginLeft: '6px' }}></ion-icon>
                                        </div>

                                        {/* Abstract background gradient shadow inside the container for text legibility if leaf doesn't cover */}
                                        <div style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: 0,
                                            width: '60%',
                                            height: '100%',
                                            background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.4))',
                                            zIndex: 1
                                        }}></div>

                                        {/* 3D Leaf Overlay Background */}
                                        <div style={{
                                            position: 'absolute',
                                            right: '0%',
                                            top: '-15%',
                                            height: '130%',
                                            width: '80%',
                                            alignItems: 'center',
                                            backgroundImage: `url('/images/leaves/${leafStyle}.webp')`,
                                            backgroundSize: 'contain',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'center right',
                                            filter: 'drop-shadow(-8px 10px 20px rgba(0,0,0,0.6))',
                                            transform: leafTransform,
                                            zIndex: 3,
                                            pointerEvents: 'none'
                                        }}></div>

                                        {/* Text Overlay Container - Strictly on the right half */}
                                        <div style={{
                                            position: 'absolute',
                                            right: '0%',
                                            top: '0',
                                            height: '100%',
                                            width: '55%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 4,
                                            padding: '0 10px'
                                        }}>
                                            <h4 style={{
                                                color: '#EDEFDF',
                                                fontFamily: "'Lora', serif",
                                                fontSize: '1.25rem',
                                                fontWeight: 'bold',
                                                textAlign: 'center',
                                                textShadow: '2px 2px 8px rgba(0,0,0,0.7)',
                                                wordWrap: 'break-word',
                                                lineHeight: '1.2',
                                                marginBottom: '6px'
                                            }}>
                                                {parseTemplateString(video.title, booking).toUpperCase()}
                                            </h4>
                                            {video.subtitle && (
                                                <p style={{
                                                    color: '#f4f4f4',
                                                    fontFamily: "'Nunito', sans-serif",
                                                    fontSize: '0.9rem',
                                                    textAlign: 'center',
                                                    textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
                                                    lineHeight: '1.3'
                                                }}>
                                                    {parseTemplateString(video.subtitle, booking)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

