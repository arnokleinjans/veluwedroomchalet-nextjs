import { PDFDocument, PDFName, StandardFonts } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import { formatBedrag, formatDatumNL } from "./toeristenbelasting";
import type { NachtregistratieData } from "../context/BookingContext";

// Veldnamen in het AcroForm van 't Veluws Hof-formulier (2025-versie),
// mapping bepaald via scripts/inspect-pdf-fields.mjs (positie per veld).
const VELD = {
    aankomst: "Text1",
    vertrek: "Text13",
    verhuurderNaam: "Text16",
    verhuurderTelefoon: "Text17",
    staanplaats: "Text18",
    huurderNaam: "Text21",
    huurderAdres: "Text22",
    huurderTelefoon: "Text23",
    aantalPersonen: "Text24",
    opmerkingen: "Text25",
    bedrag: "Text26",
};

const PDF_PATH = path.join(process.cwd(), "app", "assets", "nachtregistratieformulier-2025.pdf");

export type NachtregistratieSettings = {
    verhuurderNaam: string;
    verhuurderTelefoon: string;
    staanplaats: string;
    campingEmail: string;
};

export async function vulNachtregistratiePdf(
    reg: NachtregistratieData,
    settings: NachtregistratieSettings
): Promise<Uint8Array> {
    const doc = await PDFDocument.load(await readFile(PDF_PATH));
    const form = doc.getForm();
    const helvetica = await doc.embedFont(StandardFonts.Helvetica);

    const zet = (veld: string, waarde: string) => {
        const f = form.getTextField(veld);
        f.setText(waarde);
        // Widget-DA's dwingen auto-size af (opmerkingenvak werd enorm); veld-DA met vaste maat wint pas na verwijdering.
        for (const w of f.acroField.getWidgets()) w.dict.delete(PDFName.of("DA"));
        f.setFontSize(11);
    };
    zet(VELD.aankomst, formatDatumNL(reg.aankomst));
    zet(VELD.vertrek, formatDatumNL(reg.vertrek));
    zet(VELD.verhuurderNaam, settings.verhuurderNaam);
    zet(VELD.verhuurderTelefoon, settings.verhuurderTelefoon);
    zet(VELD.staanplaats, settings.staanplaats);
    zet(VELD.huurderNaam, reg.huurderNaam);
    zet(VELD.huurderAdres, reg.adres);
    zet(VELD.huurderTelefoon, reg.telefoon);
    zet(VELD.aantalPersonen, String(reg.aantalPersonen));
    zet(VELD.opmerkingen, reg.opmerkingen || "");
    zet(VELD.bedrag, formatBedrag(reg.bedrag).replace("€ ", ""));

    // Niet meer bewerkbaar maken en alleen pagina 1 meesturen.
    form.updateFieldAppearances(helvetica);
    form.flatten({ updateFieldAppearances: false });
    while (doc.getPageCount() > 1) {
        doc.removePage(doc.getPageCount() - 1);
    }

    return await doc.save();
}
