"use client";

import { t } from "../../utils/translations";
import { interactiefOnderdeel } from "./register";
import Sleutelkastje from "./Sleutelkastje";
import IngebeddePagina from "./IngebeddePagina";

type Props = {
    id?: string;
    lang?: string;
    keyCode?: string;
};

export default function InteractiefOnderdeel({ id, lang = "nl", keyCode = "" }: Props) {
    const onderdeel = interactiefOnderdeel(id, lang);
    if (!onderdeel) return null;

    let inhoud = null;
    if (id === "sleutelkastje") {
        if (!/\d/.test(keyCode)) return null;
        inhoud = <Sleutelkastje key={keyCode} code={keyCode} lang={lang} />;
    }
    if (id === "checkin") {
        const code = /^\D*(\d{4})\D*$/.exec(keyCode)?.[1];
        inhoud = <IngebeddePagina src={`/interactief/checkin.html${code ? `#code=${code}` : ""}`} titel="Check-in" />;
    }
    if (id === "checkout") {
        inhoud = <IngebeddePagina src="/interactief/checkout.html" titel="Check-out" />;
    }
    if (!inhoud) return null;

    return (
        <section className={`interactief-onderdeel${onderdeel.alleenDesktop ? " interactief-alleen-desktop" : ""}`}>
            <h3 className="interactief-kop">{t("skk_kop", lang)}</h3>
            {inhoud}
        </section>
    );
}
