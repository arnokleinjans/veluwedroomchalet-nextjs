import { STATUS_LABEL, type BeurtMetContext, type SchoonmakerPubliek } from "../../utils/schoonmaakTypes";

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const EURO = '"€" #,##0.00';
const GROEN = "FF4A5D23";
const LICHT = "FFEEF2E6";

type Rij = { naam: string; aantal: number; totaal: number; betaald: number; open: number; gepland: number; geplandBedrag: number };

function totalen(beurten: BeurtMetContext[], schoonmakers: SchoonmakerPubliek[]): Rij[] {
    const som = (l: BeurtMetContext[]) => l.reduce((t, b) => t + (b.bedrag || 0), 0);
    return schoonmakers.map(s => {
        const mijn = beurten.filter(b => b.schoonmakerId === s.id);
        const klaar = mijn.filter(b => b.status === "uitgevoerd");
        const plan = mijn.filter(b => b.status === "toegewezen" || b.status === "geaccepteerd");
        return {
            naam: s.naam,
            aantal: klaar.length,
            totaal: som(klaar),
            betaald: som(klaar.filter(b => b.betaald)),
            open: som(klaar.filter(b => !b.betaald)),
            gepland: plan.length,
            geplandBedrag: som(plan),
        };
    }).filter(r => r.aantal > 0 || r.gepland > 0);
}

// Alle beurten van een maand ("2026-10") of een jaar ("2026") als .xlsx, met daaronder de totalen.
// Vervallen beurten staan er niet in. Gastnamen ook niet: die heeft de accountant niet nodig.
export async function exporteerSchoonmaak(periode: string, beurten: BeurtMetContext[], schoonmakers: SchoonmakerPubliek[]) {
    const ExcelJS = (await import("exceljs")).default;
    const isJaar = periode.length === 4;
    const titel = isJaar ? `Schoonmaak ${periode}` : `Schoonmaak ${MAANDEN[Number(periode.slice(5, 7)) - 1]} ${periode.slice(0, 4)}`;
    const lijst = beurten.filter(b => b.datum.startsWith(periode) && b.status !== "vervallen").sort((a, b) => a.datum.localeCompare(b.datum));
    const naamVan = (id?: string) => schoonmakers.find(s => s.id === id)?.naam || "";

    const wb = new ExcelJS.Workbook();
    wb.creator = "Veluwe Droomchalet";
    const ws = wb.addWorksheet("Schoonmaak", { views: [{ state: "frozen", ySplit: 3 }] });
    ws.columns = [
        { key: "datum", width: 13 },
        { key: "kwartaal", width: 10 },
        { key: "omschrijving", width: 30 },
        { key: "schoonmaakster", width: 18 },
        { key: "bedrag", width: 12 },
        { key: "status", width: 15 },
        { key: "betaald", width: 10 },
        { key: "betaaldOp", width: 13 },
    ];

    ws.getCell("A1").value = `${titel} · Veluwe Droomchalet`;
    ws.getCell("A1").font = { bold: true, size: 14, color: { argb: GROEN } };
    ws.getCell("A2").value = `Gemaakt op ${new Date().toLocaleDateString("nl-NL")}. Totalen tellen alleen uitgevoerde beurten.`;
    ws.getCell("A2").font = { italic: true, color: { argb: "FF777777" } };

    const kop = ws.getRow(3);
    kop.values = ["Datum", "Kwartaal", "Omschrijving", "Schoonmaakster", "Bedrag", "Status", "Betaald", "Betaald op"];
    kop.eachCell(c => {
        c.font = { bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GROEN } };
        c.alignment = { vertical: "middle" };
    });

    const datum = (iso: string) => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))));
    for (const b of lijst) {
        const r = ws.addRow({
            datum: datum(b.datum),
            kwartaal: Math.floor((Number(b.datum.slice(5, 7)) - 1) / 3) + 1,
            omschrijving: b.automatisch ? "Schoonmaak na vertrek" : b.omschrijving || "Losse schoonmaak",
            schoonmaakster: naamVan(b.schoonmakerId) || "nog niemand",
            bedrag: b.bedrag ?? null,
            status: STATUS_LABEL[b.status].label,
            betaald: b.betaald ? "ja" : "nee",
            betaaldOp: b.betaald && b.betaaldOp ? datum(b.betaaldOp) : null,
        });
        r.getCell("datum").numFmt = "dd-mm-yyyy";
        r.getCell("betaaldOp").numFmt = "dd-mm-yyyy";
        r.getCell("bedrag").numFmt = EURO;
        r.getCell("kwartaal").alignment = { horizontal: "center" };
    }
    if (lijst.length) ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + lijst.length, column: 8 } };
    else ws.addRow({ omschrijving: "Geen beurten in deze periode." });

    const tabel = (kopTekst: string, rijen: Rij[]) => {
        ws.addRow([]);
        const t = ws.addRow([kopTekst]);
        t.font = { bold: true, size: 12, color: { argb: GROEN } };
        if (!rijen.length) {
            ws.addRow(["Nog geen beurten met een schoonmaakster."]).font = { italic: true, color: { argb: "FF777777" } };
            return;
        }
        const h = ws.addRow(["Schoonmaakster", "Uitgevoerd", "Totaal", "Betaald", "Nog te betalen", "Nog gepland", "Gepland bedrag"]);
        h.eachCell(c => {
            c.font = { bold: true };
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LICHT } };
        });
        const regel = (r: Rij, vet = false) => {
            const x = ws.addRow([r.naam, r.aantal, r.totaal, r.betaald, r.open, r.gepland, r.geplandBedrag]);
            [3, 4, 5, 7].forEach(i => { x.getCell(i).numFmt = EURO; });
            if (vet) x.eachCell(c => { c.font = { bold: true }; c.border = { top: { style: "thin" } }; });
        };
        rijen.forEach(r => regel(r));
        const tot = rijen.reduce((a, r) => ({
            naam: "Totaal", aantal: a.aantal + r.aantal, totaal: a.totaal + r.totaal, betaald: a.betaald + r.betaald,
            open: a.open + r.open, gepland: a.gepland + r.gepland, geplandBedrag: a.geplandBedrag + r.geplandBedrag,
        }), { naam: "Totaal", aantal: 0, totaal: 0, betaald: 0, open: 0, gepland: 0, geplandBedrag: 0 });
        regel(tot, true);
    };

    tabel(isJaar ? `Totalen ${periode}` : `Totalen ${titel.replace("Schoonmaak ", "")}`, totalen(lijst, schoonmakers));
    if (isJaar) {
        for (let k = 1; k <= 4; k++) {
            const inK = lijst.filter(b => Math.floor((Number(b.datum.slice(5, 7)) - 1) / 3) + 1 === k);
            if (inK.length) tabel(`Kwartaal ${k}`, totalen(inK, schoonmakers));
        }
    }

    const buffer = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titel}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return lijst.length;
}
