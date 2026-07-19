import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import { formatBedrag, formatDatumNL } from "./toeristenbelasting";
import type { NachtregistratieData } from "../context/BookingContext";

// Posities (bottom-left x/y in PDF-punten) bepaald via scripts/inspect-pdf-fields.mjs
// (rechthoek van elk AcroForm-veld in het 't Veluws Hof-formulier, 2025-versie).
// Tekst wordt als platte content getekend i.p.v. via AcroForm-velden: pdf-lib's
// text-field auto-sizing bleek de gewenste vaste fontSize te negeren (bedrag-vak
// bleef veel te groot, ook bij expliciete kleinere fontSize) — direct tekenen geeft
// volledige controle en is voorspelbaar in elke PDF-viewer.
const POS = {
    aankomst: { x: 232, y: 671 },
    vertrek: { x: 231, y: 646 },
    verhuurderNaam: { x: 231, y: 576 },
    verhuurderTelefoon: { x: 232, y: 552 },
    staanplaats: { x: 232, y: 530 },
    huurderNaam: { x: 232, y: 459 },
    huurderAdres: { x: 232, y: 436 },
    huurderTelefoon: { x: 232, y: 412 },
    aantalPersonen: { x: 232, y: 388 },
    bedrag: { x: 524, y: 769 },
};
const OPMERKINGEN = { x: 232, y: 370, width: 330, lineHeight: 13 };
const TEKST_KLEUR = rgb(0.267, 0.267, 0.267);
const FONT_SIZE = 11;
const BEDRAG_FONT_SIZE = 10;

const PDF_PATH = path.join(process.cwd(), "app", "assets", "nachtregistratieformulier-2025.pdf");

export type NachtregistratieSettings = {
    verhuurderNaam: string;
    verhuurderTelefoon: string;
    staanplaats: string;
    campingEmail: string;
};

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const regels: string[] = [];
    for (const paragraaf of text.split("\n")) {
        let huidig = "";
        for (const woord of paragraaf.split(" ")) {
            const kandidaat = huidig ? `${huidig} ${woord}` : woord;
            if (font.widthOfTextAtSize(kandidaat, size) > maxWidth && huidig) {
                regels.push(huidig);
                huidig = woord;
            } else {
                huidig = kandidaat;
            }
        }
        regels.push(huidig);
    }
    return regels;
}

export async function vulNachtregistratiePdf(
    reg: NachtregistratieData,
    settings: NachtregistratieSettings
): Promise<Uint8Array> {
    const doc = await PDFDocument.load(await readFile(PDF_PATH));
    const form = doc.getForm();
    form.flatten(); // blanco template vastzetten, geen interactieve velden meer

    const page = doc.getPage(0);
    const font = await doc.embedFont(StandardFonts.Helvetica);

    const schrijf = (tekst: string, x: number, y: number, size = FONT_SIZE) => {
        page.drawText(tekst, { x, y, size, font, color: TEKST_KLEUR });
    };

    schrijf(formatDatumNL(reg.aankomst), POS.aankomst.x, POS.aankomst.y);
    schrijf(formatDatumNL(reg.vertrek), POS.vertrek.x, POS.vertrek.y);
    schrijf(settings.verhuurderNaam, POS.verhuurderNaam.x, POS.verhuurderNaam.y);
    schrijf(settings.verhuurderTelefoon, POS.verhuurderTelefoon.x, POS.verhuurderTelefoon.y);
    schrijf(settings.staanplaats, POS.staanplaats.x, POS.staanplaats.y);
    schrijf(reg.huurderNaam, POS.huurderNaam.x, POS.huurderNaam.y);
    schrijf(`${reg.adres}, ${reg.postcode} ${reg.woonplaats}`, POS.huurderAdres.x, POS.huurderAdres.y);
    schrijf(reg.telefoon, POS.huurderTelefoon.x, POS.huurderTelefoon.y);
    schrijf(String(reg.aantalPersonen), POS.aantalPersonen.x, POS.aantalPersonen.y);
    schrijf(formatBedrag(reg.bedrag).replace("€ ", ""), POS.bedrag.x, POS.bedrag.y, BEDRAG_FONT_SIZE);

    if (reg.opmerkingen) {
        const regels = wrapText(reg.opmerkingen, font, FONT_SIZE, OPMERKINGEN.width);
        regels.forEach((regel, i) => {
            schrijf(regel, OPMERKINGEN.x, OPMERKINGEN.y - i * OPMERKINGEN.lineHeight);
        });
    }

    // Alleen pagina 1 meesturen.
    while (doc.getPageCount() > 1) {
        doc.removePage(doc.getPageCount() - 1);
    }

    return await doc.save();
}
