// Test van de Voyando-koppeling tegen de lokale app en de TEST-Redis. Leest echt uit Voyando, schrijft daar niets.
// Gebruik: node scripts/voyando-test.mjs [poort]   (standaard 3001; de app moet draaien)
// Zet zelf drie situaties klaar in TEST en kijkt of de koppeling ze rechtzet:
// een verschoven vertrek, een in Voyando geannuleerde boeking en een boeking die nog niet in beheer staat.

import { readFileSync } from "node:fs";
import puppeteer from "puppeteer";
import { Redis } from "@upstash/redis";

const BASIS = `http://localhost:${process.argv[2] || 3001}`;
const env = readFileSync(".env.local", "utf8");
const PIN = env.match(/^ADMIN_PIN=(.*)$/m)[1].replace(/^"|"$/g, "");
const SLEUTEL = env.match(/^VOYANDO_API_KEY=(.*)$/m)[1];
const db = new Redis({ url: "http://127.0.0.1:8079", token: "test-token-lokaal" });
const SCHERM = process.env.SCHERMAFDRUK;

let fouten = 0;
const check = (ok, wat, extra = "") => { console.log(`${ok ? "ok  " : "FOUT"} ${wat}${extra ? " · " + extra : ""}`); if (!ok) fouten++; };
const boekingen = async () => (await db.get("veluwe_app_data")).bookings;
const boeking = async (id) => (await boekingen()).find(b => b.id === id);
const beurtVan = async (bookingId) => {
    const ids = await db.smembers("schoonmaak:index");
    for (const id of ids) {
        const b = await db.get(`schoonmaak:${id}`);
        if (b?.bookingId === bookingId && b.automatisch) return b;
    }
    return null;
};
const pasAan = async (fn) => { const app = await db.get("veluwe_app_data"); app.bookings = fn(app.bookings); await db.set("veluwe_app_data", app); };
const wacht = (ms) => new Promise(r => setTimeout(r, ms));

const voy = await (await fetch("https://voyando.com/api/v1/bookings/?page_size=100", { headers: { Authorization: `Bearer ${SLEUTEL}`, "User-Agent": "veluwedroomchalet-test/1.0" } })).json();
const vandaag = new Date().toISOString().slice(0, 10);
const alle = await boekingen();
const inBeheer = (v) => alle.find(b => b.voyando?.id === v.id);
const komend = voy.results.filter(v => v.status === "accepted" && v.check_out > vandaag && inBeheer(v)).sort((a, b) => a.check_in.localeCompare(b.check_in));
const A = komend[0], B = komend[1], NIEUW = komend.filter(v => inBeheer(v).id === String(v.id)).pop();
const GEANNULEERD = voy.results.find(v => v.status === "cancelled" && !alle.some(b => b.id === String(v.id)));
check(!!(A && B && NIEUW && GEANNULEERD), "testgevallen gevonden in Voyando", `A=${A?.id} B=${B?.id} nieuw=${NIEUW?.id} geannuleerd=${GEANNULEERD?.id}`);
const idA = inBeheer(A).id, idB = inBeheer(B).id, idNieuw = inBeheer(NIEUW).id;
const plus = (d, n) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const verAnn = plus(vandaag, 40);

const browser = await puppeteer.launch({ headless: true });
try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 1400 });
    const jsFouten = [];
    page.on("pageerror", e => jsFouten.push(e.message));
    await page.goto(`${BASIS}/beheer-vlp-x9q2w`, { waitUntil: "networkidle2" });
    await page.type("input[type=password]", PIN);
    await page.locator("::-p-text(Inloggen)").click();
    await page.waitForSelector("::-p-text(Geheim Beheer)", { timeout: 20000 });
    await page.locator("::-p-text(Gepersonaliseerde Gasten Links)").click();
    check(!!(await page.waitForSelector("::-p-text(Boekingen komen uit Voyando)", { timeout: 20000 }).catch(() => null)), "statusbalk Voyando zichtbaar");
    const tekst = () => page.evaluate(() => document.body.innerText);
    check(!/CSV/i.test(await tekst()), "CSV-import is weg");
    check((await tekst()).includes("Losse link aanmaken"), "losse link staat ingeklapt");

    // Situaties klaarzetten
    for (const id of await db.smembers("schoonmaak:index")) {
        if ((await db.get(`schoonmaak:${id}`))?.bookingId === String(GEANNULEERD.id)) { await db.del(`schoonmaak:${id}`); await db.srem("schoonmaak:index", id); }
    }
    await pasAan(bs => bs.filter(b => b.id !== idNieuw).map(b => {
        if (b.id === idA) return { ...b, checkOut: plus(A.check_out, 1), voyando: { ...b.voyando, checkOut: plus(A.check_out, 1), updatedAt: "oud" } };
        if (b.id === idB) return { ...b, checkIn: plus(B.check_in, -1) };
        return b;
    }).concat([{ id: String(GEANNULEERD.id), guestName: "Test Annulering", checkIn: plus(verAnn, -3), checkOut: verAnn, language: "nl",
        voyando: { id: GEANNULEERD.id, status: "accepted", kanaal: null, checkIn: plus(verAnn, -3), checkOut: verAnn, volwassenen: 2, kinderen: 0, babys: 0, huisdieren: 0, naam: "Test Annulering", updatedAt: "oud" } }]));
    await page.reload({ waitUntil: "networkidle2" });
    await page.waitForSelector("::-p-text(Geheim Beheer)", { timeout: 20000 });
    await wacht(2500);
    check((await beurtVan(String(GEANNULEERD.id)))?.status === "open", "beurt bestaat voor de boeking die geannuleerd gaat worden");
    check((await beurtVan(idA))?.datum === plus(A.check_out, 1), "beurt A staat op het verschoven vertrek");

    await page.locator("::-p-text(Gepersonaliseerde Gasten Links)").click();
    await page.locator("::-p-text(Laatste wijzigingen)").click();
    await page.locator("::-p-text(Nu ophalen)").click();
    await wacht(300);
    await page.waitForFunction(() => ![...document.querySelectorAll("button")].some(b => b.textContent.trim() === "Bezig…"), { timeout: 90000 });
    await wacht(1500);

    const a = await boeking(idA);
    check(a.checkOut === A.check_out, "vertrek A teruggezet naar Voyando", `${plus(A.check_out, 1)} → ${a.checkOut}`);
    check((await beurtVan(idA))?.datum === A.check_out, "schoonmaakbeurt A schuift mee");
    const g = await boeking(String(GEANNULEERD.id));
    check(g?.geannuleerd === true, "geannuleerde boeking gemarkeerd, niet verwijderd");
    check((await beurtVan(String(GEANNULEERD.id)))?.status === "vervallen", "beurt van de geannuleerde boeking vervallen");
    check((await fetch(`${BASIS}/b/${GEANNULEERD.id}`)).status === 404, "gastlink van geannuleerde boeking geeft 404");
    const n = await boeking(idNieuw);
    check(!!n && n.checkIn === NIEUW.check_in && n.language === "nl", "ontbrekende boeking vanzelf toegevoegd", n?.guestName);
    check(!!(await beurtVan(idNieuw)), "nieuwe boeking heeft een schoonmaakbeurt");
    const b = await boeking(idB);
    check(b.checkIn === plus(B.check_in, -1), "afwijkende aankomst B niet stil overschreven");

    // Overnemen op verzoek
    await page.type("input[placeholder*='Zoek op naam']", idB);
    const knop = await page.waitForSelector("::-p-text(neem over)", { timeout: 10000 }).catch(() => null);
    check(!!knop, "label 'wijkt af van Voyando' zichtbaar bij B");
    if (SCHERM) await page.screenshot({ path: SCHERM.replace(".png", "-afwijking.png") });
    await knop?.click();
    await page.locator("::-p-text(Ja, overnemen)").click();
    await wacht(2500);
    check((await boeking(idB)).checkIn === B.check_in, "na 'neem over' gelijk aan Voyando");

    // Vergrendeling
    const rij = (id) => page.evaluateHandle((id) => [...document.querySelectorAll("a")].find(a => a.textContent.trim().startsWith(`/b/${id} `))?.parentElement?.parentElement, id);
    const knoppen = async (id) => (await rij(id)).evaluate(el => [...el.querySelectorAll("button")].map(b => b.textContent.trim()));
    check(!(await knoppen(idB)).includes("Verwijder"), "geen knop Verwijder bij een Voyando-boeking");
    const rijB = await (await rij(idB)).evaluate(el => ({ knoppen: [...el.querySelectorAll("button")].map(b => b.textContent.trim()), keuzes: el.querySelectorAll("select").length }));
    check(!rijB.knoppen.includes("Bewerk") && rijB.keuzes === 1, "Voyando-boeking heeft een taalkeuze in plaats van Bewerk");
    const taalVoor = (await boeking(idB)).language || "nl";
    await (await rij(idB)).evaluate(el => { const s = el.querySelector("select"); const zet = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set; zet.call(s, "de"); s.dispatchEvent(new Event("change", { bubbles: true })); });
    await wacht(2500);
    const naTaal = await boeking(idB);
    check(naTaal.language === "de" && naTaal.checkIn === B.check_in && naTaal.checkOut === B.check_out, "taal wijzigen via de keuzelijst, datums ongemoeid");
    await pasAan(bs => bs.map(x => x.id === idB ? { ...x, language: taalVoor } : x));
    if (SCHERM) await page.screenshot({ path: SCHERM.replace(".png", "-bewerk.png") });
    await page.click("input[placeholder*='Zoek op naam']", { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await wacht(500);
    if (SCHERM) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: SCHERM }); }
    check(jsFouten.length === 0, "geen JavaScript-fouten", jsFouten.join(" | "));

    // Voorinvulling van een lege nachtregistratie
    const leeg = (await boekingen()).find(x => x.checkIn > plus(vandaag, 3) && !x.nachtregistratie && x.voyando?.telefoon && x.voyando.status === "accepted");
    const gevuld = (await boekingen()).find(x => x.checkOut > vandaag && x.nachtregistratie?.aantalPersonen && x.voyando);
    const waarden = async (id) => { const p2 = await browser.newPage(); await p2.goto(`${BASIS}/b/${id}/nachtregistratie`, { waitUntil: "networkidle2" }); const w = await p2.$$eval("input", els => els.map(e => e.value)); await p2.close(); return w; };
    const wl = await waarden(leeg.id);
    const totaal = String(leeg.voyando.volwassenen + leeg.voyando.kinderen + leeg.voyando.babys);
    check(wl.includes(leeg.voyando.telefoon) && wl.includes(totaal), "leeg gastformulier voorgevuld met telefoon en aantal personen", `${leeg.id}: ${totaal} pers.`);
    check(!(await boeking(leeg.id)).nachtregistratie, "voorinvulling slaat niets op: formulier blijft 'leeg' tot de gast opslaat");
    if (gevuld) check((await waarden(gevuld.id)).includes(String(gevuld.nachtregistratie.aantalPersonen)), "ingevuld formulier toont de eigen gegevens", gevuld.id);

    await page.reload({ waitUntil: "networkidle2" });
    await page.locator("::-p-text(Gepersonaliseerde Gasten Links)").click();
    await page.type("input[placeholder*='Zoek op naam']", leeg.id);
    await page.waitForFunction((id) => [...document.querySelectorAll("a")].some(a => a.textContent.trim().startsWith(`/b/${id} `)), { timeout: 20000 }, leeg.id);
    await (await rij(leeg.id)).evaluate(el => [...el.querySelectorAll("button")].find(b => b.textContent.includes("Formulier leeg")).click());
    await wacht(800);
    const wp = await (await rij(leeg.id)).evaluate(el => [...el.querySelectorAll("input")].map(i => i.value));
    check(wp.includes(leeg.voyando.telefoon) && wp.includes(totaal), "leeg formulier in beheer voorgevuld");
    if (SCHERM) await page.screenshot({ path: SCHERM.replace(".png", "-formulier.png") });

    // Gast opent de link vóór de boeking in beheer staat
    await pasAan(bs => bs.filter(x => x.id !== idNieuw));
    await wacht(2500);
    check((await fetch(`${BASIS}/b/${NIEUW.id}`)).status === 200, "gastlink van een nog onbekende boeking werkt direct");
    check(!!(await boeking(String(NIEUW.id))), "die boeking staat daarna in beheer");
    check((await fetch(`${BASIS}/b/${GEANNULEERD.id + 900000}`)).status === 404, "onbekend nummer blijft 404");
} finally {
    await browser.close();
    await pasAan(bs => bs.filter(b => b.id !== String(GEANNULEERD.id)));
    // De testgevallen staan anders als "laatste wijzigingen" in beheer.
    await db.del("voyando:sync");
}
console.log(fouten ? `\n${fouten} controle(s) mislukt` : "\nAlles in orde");
process.exit(fouten ? 1 : 0);
