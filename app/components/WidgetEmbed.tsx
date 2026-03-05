"use client";

import { useEffect, useRef } from "react";

export default function WidgetEmbed({ code }: { code?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !code || code.trim() === "") return;

        const container = containerRef.current;
        container.innerHTML = "";

        // 1. Parse the HTML snippet
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = code;

        // 2. Extract scripts and normal DOM nodes
        const scripts: HTMLScriptElement[] = [];
        const nodesToAppend: Node[] = [];

        Array.from(tempDiv.childNodes).forEach(node => {
            if (node.nodeName === "SCRIPT" || node.nodeName === "CUSTOM-SCRIPT") {
                scripts.push(node as HTMLScriptElement);
            } else if (node.nodeName === "CUSTOM-WIDGET") {
                const realDiv = document.createElement("div");
                Array.from((node as HTMLElement).attributes).forEach(attr => {
                    realDiv.setAttribute(attr.name, attr.value);
                });
                if ((node as HTMLElement).innerHTML) {
                    realDiv.innerHTML = (node as HTMLElement).innerHTML;
                }
                nodesToAppend.push(realDiv);
            } else {
                nodesToAppend.push(node.cloneNode(true));
            }
        });

        // 3. Append the HTML container first (so LodgePilot script can find its target div!)
        nodesToAppend.forEach(node => container.appendChild(node));

        // 4. Append the scripts to the document to force browser execution natively
        const addedScripts: HTMLScriptElement[] = [];

        scripts.forEach(oldScript => {
            const newScript = document.createElement("script");

            // Copy all attributes (src, type, etc)
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });

            // Force synchronous execution so document.currentScript is not null!
            // Essential for LodgePilot and similar DOM-aware scripts.
            newScript.async = false;

            // Copy inline content if it exists
            if (oldScript.innerHTML) {
                newScript.innerHTML = oldScript.innerHTML;
            }

            // Append to body natively. This solves the document.currentScript origin issue
            // that caused crashes inside srcDoc iframes.
            document.body.appendChild(newScript);
            addedScripts.push(newScript);
        });

        // 5. Some rigid widgets expect the page to be "loading". Trigger synthetic events just in case.
        const timer = setTimeout(() => {
            window.dispatchEvent(new Event("DOMContentLoaded"));
            window.dispatchEvent(new Event("load"));
        }, 400);

        return () => {
            clearTimeout(timer);
            container.innerHTML = ""; // Clean up the DOM
            // We intentionally do NOT remove the scripts from body on unmount. 
            // Most widgets inject global CSS/listeners, removing the script tag often doesn't undo that 
            // and can break re-mounting if they expect the script to only load once.
        };

    }, [code]);

    if (!code || code.trim() === "") return null;

    return (
        <div
            ref={containerRef}
            className="widget-embed-container"
            style={{ marginTop: "20px", width: "100%", overflow: "hidden" }}
        />
    );
}
