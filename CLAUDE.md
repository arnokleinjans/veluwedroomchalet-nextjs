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
| 2026-07-19 | Voyando-boekingsnummer als slug: beheer heeft nu een veld "Boekingsnummer" bij Nieuwe Link Aanmaken (optioneel — leeg = oude NAAM-XXXX-generatie) én in het Bewerk-paneel per boeking. Bij wijzigen schuift de oude code automatisch naar `aliases[]` zodat al gedeelde links blijven werken (getoond als "Oude link (werkt nog)" in beheer). Nieuwe centrale lookup app/utils/findBooking.ts (id óf alias, case-insensitief) vervangt alle 7 losse `bookings.find`-plekken (layout, db.getTranslatedAppData, info/omgeving/video-subpagina's — die matchten voorheen case-sensitief). Uniekheidscheck op nummer over ids+aliases in addBooking/updateBooking. Afspraak Arno: bestaande boekingen houden hun oude slug; Voyando-nummers pas vanaf boeking "Karin Ram-De Man". SMTP-gegevens Hostnet (info@veluwedroomchalet.nl) in .env.local gezet voor de komende nachtregistratie-mail. |
| 2026-07-19 | PRD toegevoegd: docs/PRD-nachtregistratie.md — gast vult nachtregistratieformulier 't Veluws Hof in via de webapp (vóór D−2 08:00 alleen het formulier zichtbaar), beheerder controleert/verzendt als ingevulde originele PDF (alleen p.1) per Hostnet-SMTP naar de camping; statusbadges leeg/ingevuld/verstuurd + insight-zichtbaarheidsoptie "nachtregistratie". Status: nog niet gebouwd, wacht op akkoord. |
| 2026-07-07 | Drietalige check-out infographic (NL/EN/DE) toegevoegd: public/images/"check out NL-EN-DE.webp" (1588×2246) + zelfde als print-PDF "check out NL-EN-DE.pdf". Nagebouwd in de stijl van "check out NL.webp" (origineel was te lage resolutie om te bewerken); HTML-bron in Claude-artifact, tekst per stap in 🇳🇱/🇬🇧/🇩🇪 met vlaggen. |
| 2026-06-12 | Nieuw icoon public/icons/swimmer.svg (zwemmer/zwembad) in dezelfde lijnstijl als de overige iconen. |
| 2026-06-12 | PRD toegevoegd: docs/PRD-mediabibliotheek.md — plan voor mediabibliotheek in het beheerpaneel (status: geparkeerd, nog niet gebouwd). |
