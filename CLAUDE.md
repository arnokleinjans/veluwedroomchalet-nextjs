<!-- deploy-regel-v1 -->
> **⛔ Deploy-regel (geldt voor ALLE projecten):** Push NOOIT naar GitHub en deploy NOOIT naar Vercel of enige andere hosting/remote, tenzij Arno daar in dít bericht expliciet om vraagt. Lokaal committen en branchen mag; maar `git push`, het aanmaken van remote repos, `vercel`/deploy-commando's, en het wijzigen van remote secrets/omgevingsvariabelen vereisen telkens een nieuwe, expliciete opdracht. Toestemming voor één push/deploy geldt niet voor de volgende. Bij twijfel: eerst vragen.

# Veluwedroomchalet

> **Token-check vóór elke taak:** Beoordeel eerst of de huidige chat al veel context bevat. Als een nieuwe chat token-efficiënter is — meld dat dan **meteen** aan de gebruiker, zonder code te lezen of iets uit te voeren.
>
> Nieuwe chat is slim bij: losse/nieuwe taken, lange conversatiegeschiedenis, wisseling van onderwerp.
> Doorwerken in dezelfde chat is slim bij: directe follow-up op wat net gedaan is.

Next.js web app voor chaletbeheer en gastcommunicatie.

## Stack
- Next.js (App Router), TypeScript, Tailwind CSS
- Dynamische routing: `/b/[bookingId]/` voor per-boeking pagina's
- Chat, info, omgeving, video pagina's per boeking

@AGENTS.md

## Asset Generation (Nano Banana Design)

Voor het genereren van nieuwe 3D bladeren voor de video-instructies, gebruik de volgende prompt template (bijv. in Midjourney, DALL-E of Gemini):

> Ultra-realistic highly detailed 3D render of a single **[NAME]** leaf, **[SPECIFIC SHAPE/CHARACTERISTICS]**, vibrant **[COLORS]**. Macro photography vividly showing thick intricate veins. Flat direct lighting. The leaf is perfectly isolated on a solid #ffffff purely white background with sharp edges.

**Gebruikte bladeren:**
- **Oak:** eikenblad, lobed edges, autumn green/brown
- **Maple:** esdoornblad, pointed lobes, orange/red
- **Monstera:** split-leaf design, deep jungle green
- **Birch:** berkenblad, heart-shaped, summer green
- **Chestnut:** kastanjeblad, spiky/long, fresh green
- **Beech:** beukenblad, rich deep purple/burgundy

---

## Instructies voor Claude

1. **Geen comments schrijven** tenzij de reden niet-voor-de-hand-liggend is.
2. **Niet meteen bouwen** bij vage vragen — eerst de aanpak voorleggen.
3. **Volledige rechten.** De gebruiker heeft Claude toestemming gegeven om alle shell-commando's uit te voeren zonder bevestiging te vragen.
4. **Changelog bijhouden.** Elke aanpassing aan de codebase moet worden geregistreerd in de sectie `## Changelog` onderaan dit bestand. Formaat: datum + korte omschrijving.

---

## Changelog

| Datum | Omschrijving |
|---|---|
| 2026-07-19 (nacht, vervolg) | "← Terug"-link toegevoegd boven het nachtregistratieformulier, consistent met de andere detailpagina's (zelfde stijl als de imageloze variant in info/home/[index]) — maar alleen in `app/b/[bookingId]/nachtregistratie/page.tsx` (de normale detailroute, bereikt via de rode tegel binnen de app). De pre-arrival-gate rendert `NachtregistratieForm` rechtstreeks vanuit layout.tsx buiten die route om, dus tijdens de 2 weken/D-2-periode vóór aankomst blijft het formulier terecht zonder terugknop. Geverifieerd met een tijdelijke testboeking binnen het toegankelijke venster (terugknop + navigatie zichtbaar) en met Karin's boeking (nog in pre-arrival, geen terugknop) — opgeruimd. |
| 2026-07-19 (nacht) | Nachtregistratie-nabranders n.a.v. doorloop Arno. (1) Alias-fallback voor oude slugs weer verwijderd (`app/utils/findBooking.ts` terug naar simpele id-match, `aliases[]` uit adminActions/beheer-UI) — overbodig gebleken, oude boekingen houden gewoon hun bestaande slug. (2) PDF-opmaakbug écht gefixt: AcroForm-tekstvelden bleven ondanks expliciete fontSize/DA-manipulatie auto-sizen (bedrag "47,50" bleef groot, ook bij fontSize 9 — pdf-lib's text-field appearance-regeneratie bleek het niet te respecteren, empirisch vastgesteld met hoge-resolutie pdftoppm-renders i.p.v. de te grove eerdere sips-previews). Nieuwe aanpak in `nachtregistratiePdf.ts`: form.flatten() op het blanco sjabloon, daarna alle waarden met page.drawText() op vaste x/y-posities (uit de bekende veldrechthoeken) — volledig deterministisch, geen AcroForm-gedoe meer. (3) Instellingen-duplicatie opgelost (Arno's melding: Naam verhuurder/Telefoon in de aparte "📋 Nachtregistratie"-sectie overlapten met Naam Huisje/WhatsApp Nummer in "Algemene Informatie"): aparte sectie weg, `verstuurNachtregistratie` leest voortaan `property.name`/`property.host.phone` rechtstreeks; alleen Staanplaats + camping-e-mail (nieuw op `property.staanplaats`/`property.campingEmail`) toegevoegd onderaan Algemene Informatie. Bijvangst: tijdens het herstructureren schoof een Fast-Refresh hook-order-bug een foutieve waarde ("Veluwe Droom Chalet") in staanplaats bij een save vanuit Arno's eigen open tabblad — rechtstreeks in Redis gecorrigeerd naar "Bosrand 18 / Klavergraslaan". (4) Teksten aangepast: "naar de camping" → "naar het recreatiepark", betaal-overmaken-optie ingekort naar "Ik maak het bedrag direct over aan de verhuurder" (nl-only, en/de ongewijzigd). (5) Nieuw icoon `public/icons/clipboard.svg` (zelfde lijnstijl) — wordt automatisch voorgesteld zodra de beheerder een insight-tegel op zichtbaarheid "Nachtregistratieformulier" zet (geen losse URL nodig, de tegel linkt zelf al naar `/b/[id]/nachtregistratie`). (6) Adresvelden gesplitst: gastformulier + beheerpaneel hebben nu ook verplichte Postcode/Woonplaats naast Adres; op de PDF worden ze samengevoegd tot één regel ("straat, postcode plaats"). Alles opnieuw E2E getest (build, PDF hoge-resolutie visueel gecontroleerd, API-validatie 400/200 met tijdelijke testboekingen, opgeruimd). NIET gedeployed. |
| 2026-07-19 (avond) | NACHTREGISTRATIE volledig gebouwd volgens docs/PRD-nachtregistratie.md. Gast: vóór (aankomst−2 dagen) 08:00 toont de gastlink uitsluitend het formulier (gate in layout.tsx, zelfde patroon als ExpiredBookingPage); daarna bereikbaar op /b/[id]/nachtregistratie. Formulier (NachtregistratieForm.tsx, i18n nl/en/de in translations.ts): betaalkeuze receptie/overmaken bovenaan, gast vult alleen naam (voorgevuld)/adres/telefoon/e-mail/personen, datums+kostenberekening (€10 + €6,25/volgnacht, app/utils/toeristenbelasting.ts) automatisch; Opslaan → grijs + Aanpassen; na verstuurd gelockt. Opslag via POST /api/nachtregistratie (rate-limited, zonder PIN, gekeyed op boekingscode). Beheer: statusbadge leeg/ingevuld/verstuurd per gastenlink + filter Nieuw/Verlopen (default Nieuw) + uitklappaneel (NachtregistratieAdminPanel.tsx: alles bewerkbaar, opmerkingen-default per betaalkeuze, Verstuur naar camping) + instellingen-sectie 📋 Nachtregistratie (verhuurdergegevens/camping-e-mail). Verzenden vult het originele PDF-formulier (app/assets/, pdf-lib; veldmapping Text1-26 via scripts/inspect-pdf-fields.mjs; widget-DA's verwijderd + vaste 11pt anders werd opmerkingen enorm; geflattened, alleen p.1) en mailt via nodemailer/Hostnet-SMTP (env SMTP_*). Insight-zichtbaarheidsoptie "📋 Nachtregistratieformulier": rode tegel, alleen zichtbaar zolang status leeg, linkt naar het formulier. Alias-functie van eerder vandaag weer verwijderd (besluit Arno: oude boekingen houden oude slug, geen overgang nodig). E2E lokaal getest: PDF visueel gecontroleerd (PNG), testmail met bijlage naar akleinjans@me.com verstuurd, gate/opslaan/validatie/404 via tijdelijke TEST-NREG-boeking (opgeruimd). Camping-e-mail staat nog op testadres akleinjans@me.com. NIET gedeployed. Naschrift: formulierkaart kreeg display:block-override omdat de globale .card-klasse een flex-rij afdwingt (layout lag eerst door elkaar) + minWidth:0 op flex-kolommen; mobiel (390px) en desktop visueel geverifieerd via puppeteer-screenshots. |
| 2026-07-19 | Voyando-boekingsnummer als slug: beheer heeft nu een veld "Boekingsnummer" bij Nieuwe Link Aanmaken (optioneel — leeg = oude NAAM-XXXX-generatie) én in het Bewerk-paneel per boeking. Bij wijzigen schuift de oude code automatisch naar `aliases[]` zodat al gedeelde links blijven werken (getoond als "Oude link (werkt nog)" in beheer). Nieuwe centrale lookup app/utils/findBooking.ts (id óf alias, case-insensitief) vervangt alle 7 losse `bookings.find`-plekken (layout, db.getTranslatedAppData, info/omgeving/video-subpagina's — die matchten voorheen case-sensitief). Uniekheidscheck op nummer over ids+aliases in addBooking/updateBooking. Afspraak Arno: bestaande boekingen houden hun oude slug; Voyando-nummers pas vanaf boeking "Karin Ram-De Man". SMTP-gegevens Hostnet (info@veluwedroomchalet.nl) in .env.local gezet voor de komende nachtregistratie-mail. Gepubliceerd op expliciete opdracht: commit f7e14269 → GitHub (veluwedroomchalet-nextjs) → Vercel auto-deploy, live geverifieerd op webapp.veluwedroomchalet.nl. |
| 2026-07-19 | PRD toegevoegd: docs/PRD-nachtregistratie.md — gast vult nachtregistratieformulier 't Veluws Hof in via de webapp (vóór D−2 08:00 alleen het formulier zichtbaar), beheerder controleert/verzendt als ingevulde originele PDF (alleen p.1) per Hostnet-SMTP naar de camping; statusbadges leeg/ingevuld/verstuurd + insight-zichtbaarheidsoptie "nachtregistratie". Status: nog niet gebouwd, wacht op akkoord. |
| 2026-07-07 | Drietalige check-out infographic (NL/EN/DE) toegevoegd: public/images/"check out NL-EN-DE.webp" (1588×2246) + zelfde als print-PDF "check out NL-EN-DE.pdf". Nagebouwd in de stijl van "check out NL.webp" (origineel was te lage resolutie om te bewerken); HTML-bron in Claude-artifact, tekst per stap in 🇳🇱/🇬🇧/🇩🇪 met vlaggen. |
| 2026-06-12 | Nieuw icoon public/icons/swimmer.svg (zwemmer/zwembad) in dezelfde lijnstijl als de overige iconen. |
| 2026-06-12 | PRD toegevoegd: docs/PRD-mediabibliotheek.md — plan voor mediabibliotheek in het beheerpaneel (status: geparkeerd, nog niet gebouwd). |
