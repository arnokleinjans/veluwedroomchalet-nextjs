// Rooktest na updates: loopt gastpagina's, API's, beheer, Excel-export, mediabibliotheek en het schoonmaakportaal
// (inclusief een mail) na tegen de lokale TEST-omgeving. Maakt tijdelijk een schoonmaakster en beurt aan en ruimt die op.
// Vereist: npm run testdb:start en een dev-server op poort 3001.
// Gebruik: node scripts/rooktest.mjs <map-voor-downloads>
import puppeteer from "puppeteer";
import { Redis } from "@upstash/redis";
import { readFileSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import ExcelJS from "exceljs";

const B = "http://localhost:3001";
const DL = process.argv[2];
const PIN = readFileSync(".env.local", "utf8").match(/^ADMIN_PIN=(.*)$/m)[1].replace(/^"|"$/g, "");
const kv = new Redis({ url: "http://127.0.0.1:8079", token: "test-token-lokaal" });
const fouten = [];
const check = (ok, wat) => { console.log(ok ? "  ✅" : "  ❌", wat); if (!ok) fouten.push(wat); };
const wacht = ms => new Promise(r => setTimeout(r, ms));
const status = async (pad, opts) => (await fetch(B + pad, opts)).status;

// ---------- 1. Gastpagina's ----------
console.log("1. Gastpagina's");
const app = await kv.get("veluwe_app_data");
const echte = app.bookings.filter(b => !b.isTest);
let goed = 0; const slecht = [];
for (const b of echte) { const s = await status(`/b/${b.id}`); s === 200 ? goed++ : slecht.push(`${b.id}:${s}`); }
check(slecht.length === 0, `alle ${echte.length} gastlinks geven 200 (${goed} goed${slecht.length ? ", fout: " + slecht.join(" ") : ""})`);
for (const p of ["/b/TEST/info", "/b/TEST/omgeving", "/b/TEST/info/home/0", "/b/TEST/omgeving/0", "/b/TEST/video/0", "/b/TEST/nachtregistratie", "/b/TEST/chat", "/", "/schoonmaak"]) {
    check(await status(p) === 200, `${p} 200`);
}
check(await status("/b/BESTAATNIET123") === 404, "onbekende gastlink 404");
check(await status("/schoonmaak/bestaatniet") === 404, "onbekende portaallink 404");

// ---------- 2. API's ----------
console.log("2. API's");
const post = (pad, body) => status(pad, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
check(await post("/api/translate", {}) === 401, "vertalen zonder inlog 401");
check(await post("/api/summarize", { url: "https://example.com" }) === 401, "samenvatten zonder inlog 401");
const chat = await fetch(B + "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Hoe laat moet ik uitchecken?", history: [], guestContext: { bookingId: "TEST" } }) });
const chatTekst = await chat.text();
check(chat.status === 200 && chatTekst.length > 20, `chatbot antwoordt (${chat.status}, ${chatTekst.length} tekens)`);

// ---------- tijdelijke testdata ----------
const z = randomBytes(16).toString("hex");
const tmpS = { id: "tmpupd", naam: "Tijdelijk Update", email: "tijdelijk@voorbeeld.nl", telefoon: "", tarief: 12, actief: true, linkCode: "tmpupd1", pinHash: `${z}:${scryptSync("11111", z, 32).toString("hex")}`, pinVersie: 1 };
const tmpB = { id: "tmpupdb", omschrijving: "Updatetest", datum: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10), datumHandmatig: true, schoonmakerId: tmpS.id, bedrag: 12, betaald: false, status: "toegewezen", historie: [], bijgewerkt: "x" };
await kv.set("schoonmakers", [...((await kv.get("schoonmakers")) || []), tmpS]);
await kv.set("schoonmaak:tmpupdb", tmpB); await kv.sadd("schoonmaak:index", "tmpupdb");

const browser = await puppeteer.launch({ headless: true });
try {
    // ---------- 3. Beheer ----------
    console.log("3. Beheer");
    const page = await browser.newPage();
    const cdp = await page.createCDPSession();
    rmSync(DL, { recursive: true, force: true }); mkdirSync(DL, { recursive: true });
    await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL });
    const consoleFouten = [];
    page.on("pageerror", e => consoleFouten.push(e.message));
    const acties = [];
    page.on("request", r => { if (r.headers()["next-action"]) acties.push({ url: r.url(), headers: r.headers(), body: r.postData() }); });
    await page.setViewport({ width: 1100, height: 1000 });
    await page.goto(B + "/beheer-vlp-x9q2w", { waitUntil: "networkidle2" });
    await page.type("input[type=password]", PIN);
    await page.locator("::-p-text(Inloggen)").click();
    await page.waitForSelector("::-p-text(Geheim Beheer)", { timeout: 20000 });
    await wacht(3000);
    check(true, "inloggen beheer");

    const zonderCookie = [...new Map(acties.filter(a => a.body === "[]").map(a => [a.headers["next-action"], a])).values()];
    let lek = 0, metData = 0;
    const cookie = (await page.cookies()).map(c => `${c.name}=${c.value}`).join("; ");
    for (const a of zonderCookie) {
        const { cookie: _c, ...h } = a.headers;
        const met = await (await fetch(a.url, { method: "POST", headers: { ...h, cookie }, body: "[]" })).text();
        const zonder = await (await fetch(a.url, { method: "POST", headers: h, body: "[]" })).text();
        if (/guestName|linkCode/.test(met)) { metData++; if (/guestName|linkCode/.test(zonder)) lek++; }
    }
    check(metData > 0 && lek === 0, `server-acties: ${metData} geven data met inlog, ${lek} zonder inlog`);

    await page.locator("::-p-xpath(//summary[contains(.,'Gepersonaliseerde Gasten Links')])").click();
    check(!!(await page.waitForSelector("::-p-text(Kirsten Dekker)", { timeout: 10000 }).catch(() => null)), "boekingenlijst laadt");
    const velden = await page.$$("::-p-xpath(//label[normalize-space()='Aankomst']/following-sibling::div[1]/input)");
    await velden[0].click();
    check(!!(await page.waitForSelector("::-p-text(Kies de aankomstdatum)", { timeout: 5000 }).catch(() => null)), "agenda aankomst/vertrek opent");
    await page.keyboard.press("Escape");

    await page.locator("::-p-xpath(//summary[contains(.,'Algemene Informatie')])").click();
    await wacht(500);
    const knop = await page.$("::-p-xpath(//summary[contains(.,'Algemene Informatie')]/ancestor::details[1]//button[contains(.,'Opslaan')])");
    if (knop) {
        await knop.click(); await wacht(2500);
        const toast = await page.evaluate(() => [...document.querySelectorAll("span")].map(s => s.textContent).find(t => /opgeslagen|❌/.test(t || "")) || "");
        check(/succesvol opgeslagen/.test(toast), `Algemene Informatie opslaan (${toast || "geen melding"})`);
    } else check(false, "opslaanknop Algemene Informatie niet gevonden");

    await page.locator("::-p-xpath(//summary[starts-with(normalize-space(),'🧹 Schoonmaak')])").click();
    check(!!(await page.waitForSelector("::-p-text(Aandacht:)", { timeout: 10000 }).catch(() => null)), "schoonmaaksectie laadt");
    await page.locator("::-p-text(📅 Maandoverzicht)").click();
    await page.locator("::-p-xpath(//button[starts-with(normalize-space(),'⬇ Excel 20')])").click();
    await wacht(4000);
    const xlsx = readdirSync(DL).find(f => f.endsWith(".xlsx"));
    if (xlsx) {
        const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(`${DL}/${xlsx}`);
        check(wb.getWorksheet("Schoonmaak").rowCount > 5, `Excel-export (${xlsx}, ${wb.getWorksheet("Schoonmaak").rowCount} rijen)`);
    } else check(false, "Excel-export gedownload");

    await page.locator("::-p-xpath(//summary[contains(.,'Mediabibliotheek')])").click();
    check(!!(await page.waitForSelector("::-p-xpath(//*[contains(text(),'.webp')])", { timeout: 20000 }).catch(() => null)), "mediabibliotheek laadt afbeeldingen");
    check(consoleFouten.length === 0, `geen JavaScript-fouten in beheer${consoleFouten.length ? ": " + consoleFouten.slice(0, 2).join(" / ") : ""}`);

    // ---------- 4. Portaal + mail via nodemailer 10 ----------
    console.log("4. Portaal en mail");
    const p2 = await (await browser.createBrowserContext()).newPage();
    await p2.goto(`${B}/schoonmaak/${tmpS.linkCode}`, { waitUntil: "networkidle2" });
    await p2.type("input[type=password]", "11111");
    await p2.locator("::-p-text(Inloggen)").click();
    await p2.locator("::-p-xpath(//button[normalize-space()='Accepteren'])").setTimeout(20000).click();
    await p2.waitForSelector("::-p-text(Schoonmaak is klaar)", { timeout: 20000 });
    await wacht(500);
    const na = await kv.get("schoonmaak:tmpupdb");
    const mailRegel = na.historie.find(h => /Melding acceptatie/.test(h.actie))?.actie || "";
    check(na.status === "geaccepteerd", "portaal: accepteren");
    check(/verstuurd naar/.test(mailRegel) && !/NIET/.test(mailRegel), `mail via nodemailer 10: ${mailRegel || "geen regel"}`);
} finally {
    await browser.close();
    await kv.del("schoonmaak:tmpupdb"); await kv.srem("schoonmaak:index", "tmpupdb");
    await kv.set("schoonmakers", ((await kv.get("schoonmakers")) || []).filter(x => x.id !== tmpS.id));
    console.log("\nopgeruimd, schoonmaaksters:", ((await kv.get("schoonmakers")) || []).map(x => x.naam).join(", "));
}
console.log(fouten.length ? `\n${fouten.length} fout(en): ${fouten.join("; ")}` : "\nAlle controles geslaagd");
