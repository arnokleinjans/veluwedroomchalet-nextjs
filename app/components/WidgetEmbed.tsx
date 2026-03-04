"use client";

import { useEffect, useRef, useState } from "react";

export default function WidgetEmbed({ code }: { code?: string }) {
    const [height, setHeight] = useState(200); // Standaard start-hoogte
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const id = useRef(`widget-${Math.random().toString(36).substring(2, 9)}`).current;

    useEffect(() => {
        // Luister naar resize-berichten vanuit de 'sandbox' iframe
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === "widget-resize" && event.data.id === id) {
                // Soms geven widgets een hele kleine hoogte terug voordat ze laden
                if (event.data.height > 50) {
                    setHeight(event.data.height);
                }
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [id]);

    if (!code || code.trim() === "") return null;

    // We bouwen een virtueel geïsoleerd document, zodat widgets (zoals LodgePilot) 
    // exact het gedrag krijgen van een normale webpagina.
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <base target="_parent"> <!-- Zorgt dat links buiten de iframe openen -->
            <style>
                html, body { 
                    margin: 0; 
                    padding: 0; 
                    background: transparent; 
                    overflow: hidden; 
                    font-family: sans-serif;
                }
            </style>
        </head>
        <body>
            ${code}
            
            <script>
                // Observeer de hoogte van dit document en stuur deze naar de React app
                const notify = () => {
                    const h = document.body.scrollHeight || document.documentElement.scrollHeight;
                    window.parent.postMessage({ type: 'widget-resize', id: '${id}', height: h }, '*');
                };
                
                // Houd wijzigingen in de gaten (bijv. als LodgePilot z'n iframe inlaadt)
                const observer = new ResizeObserver(notify);
                observer.observe(document.body);
                
                // Fallbacks voor onzichtbare/late aanpassingen
                window.addEventListener('load', notify);
                setTimeout(notify, 500);
                setTimeout(notify, 2000);
                setTimeout(notify, 5000);
            </script>
        </body>
        </html>
    `;

    return (
        <iframe
            ref={iframeRef}
            srcDoc={html}
            style={{
                width: "100%",
                height: `${height}px`,
                border: "none",
                marginTop: "15px",
                transition: "height 0.3s ease-out",
                overflow: "hidden",
                display: "block",
            }}
            scrolling="no"
            title="Widget Embed"
        />
    );
}
