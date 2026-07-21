import nodemailer from "nodemailer";
import { formatBedrag, formatDatumNL } from "./toeristenbelasting";
import type { NachtregistratieData } from "../context/BookingContext";

function getTransport() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        throw new Error("SMTP-instellingen ontbreken (SMTP_HOST/SMTP_USER/SMTP_PASS).");
    }
    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || "587"),
        secure: false, // STARTTLS op 587
        auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
}

export async function verstuurNachtregistratieMail(
    naar: string,
    reg: NachtregistratieData,
    pdf: Uint8Array
): Promise<void> {
    const periode = `${formatDatumNL(reg.aankomst)} t/m ${formatDatumNL(reg.vertrek)}`;
    const body = [
        `Beste receptie,`,
        ``,
        `Hierbij het ingevulde nachtregistratieformulier voor onze verhuur:`,
        ``,
        `Huurder: ${reg.huurderNaam}`,
        `Aankomstdatum: ${formatDatumNL(reg.aankomst)}`,
        `Vertrekdatum: ${formatDatumNL(reg.vertrek)}`,
        `Aantal personen: ${reg.aantalPersonen}`,
        `Bedrag park-/servicekosten: ${formatBedrag(reg.bedrag)}`,
        ``,
        reg.opmerkingen ? `Opmerkingen: ${reg.opmerkingen}` : ``,
        ``,
        `Met vriendelijke groet,`,
        `Veluwe Droom Chalet, Kitty van der Pijll`,
    ].filter((r, i, arr) => !(r === `` && arr[i - 1] === ``)).join("\n");

    await getTransport().sendMail({
        from: `"Veluwe Droom Chalet" <${process.env.SMTP_USER}>`,
        to: naar,
        bcc: "info@veluwedroomchalet.nl",
        subject: `Nachtregistratie Bosrand 18 — ${periode} (${reg.huurderNaam})`,
        text: body,
        attachments: [
            {
                filename: `Nachtregistratie ${reg.huurderNaam} ${reg.aankomst}.pdf`,
                content: Buffer.from(pdf),
                contentType: "application/pdf",
            },
        ],
    });
}
