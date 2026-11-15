"use client";

import { useEffect, useRef, useState } from "react";

export default function IngebeddePagina({ src, titel }: { src: string; titel: string }) {
    const ref = useRef<HTMLIFrameElement>(null);
    const [hoogte, setHoogte] = useState(520);

    useEffect(() => {
        const frame = ref.current;
        if (!frame) return;
        let waarnemer: ResizeObserver | null = null;
        const koppel = () => {
            const body = frame.contentDocument?.body;
            if (!body) return;
            waarnemer?.disconnect();
            const meet = () => setHoogte(Math.ceil(body.getBoundingClientRect().height));
            waarnemer = new ResizeObserver(meet);
            waarnemer.observe(body);
            meet();
        };
        frame.addEventListener("load", koppel);
        if (frame.contentDocument?.readyState === "complete") koppel();
        return () => {
            frame.removeEventListener("load", koppel);
            waarnemer?.disconnect();
        };
    }, [src]);

    return (
        <iframe
            ref={ref}
            src={src}
            title={titel}
            loading="lazy"
            className="interactief-frame"
            style={{ height: `${hoogte}px` }}
        />
    );
}
