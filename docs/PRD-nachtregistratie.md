# PRD — Nachtregistratie

**Status:** concept, akkoord Arno nodig · **Datum:** 19-07-2026

## 1. Doel & context

Recreatiepark 't Veluws Hof eist dat vóór elke particuliere verhuur een volledig ingevuld
nachtregistratieformulier bij de receptie ligt (uiterlijk bij aankomst, max. 3 weken vooraf,
mag per e-mail). Nu gebeurt dat handmatig. We willen:

1. De **gast** het formulier laten invullen en zelf controleren in de bestaande webapp
   (gepersonaliseerde link `webapp.veluwedroomchalet.nl/b/<CODE>`).
2. De **beheerder** het ingevulde formulier laten controleren, aanvullen en met één klik
   als **ingevulde originele PDF** mailen naar de camping.

Het originele invulbare PDF-formulier ("nachtregistratie+formulier+2025+invulbaar.pdf")
is leidend voor de velden en het verzendformat.

## 2. Gastflow

### 2.1 Pre-arrival gate (nieuw toegangsregime)

- **Vóór (aankomstdatum − 2 dagen) 08:00 uur** (Europe/Amsterdam): de gastlink toont
  **uitsluitend** het nachtregistratieformulier, paginavullend, zonder navigatie/menu
  (zelfde patroon als `ExpiredBookingPage`).
- **Vanaf D−2 08:00**: de volledige webapp zoals nu, met het formulier bereikbaar op
  `/b/<CODE>/nachtregistratie`.
- **Na vertrek**: bestaand gedrag (ExpiredBookingPage) blijft ongewijzigd.

### 2.2 Het formulier

Bovenaan een **verplichte betaalkeuze** (radio):

| Keuze | Betekenis |
|---|---|
| `receptie` | Gast betaalt de toeristenbelasting bij aankomst zelf bij de receptie |
| `overmaken` | Gast maakt het bedrag over aan de verhuurder; verhuurder betaalt de camping |

Daarna de velden. De gast vult **alleen** in (alles verplicht):

- **Naam** — voorgevuld met `guestName`, aanpasbaar
- **Adres**
- **Telefoonnummer**
- **E-mailadres** — alleen intern vastgelegd; gaat níét mee naar de camping en staat níét op de PDF
- **Aantal personen** — geheel getal ≥ 1

Automatisch ingevuld (gast ziet ze, niet bewerkbaar):

- **Aankomstdatum / vertrekdatum** — uit de boeking (`checkIn`/`checkOut`)
- **Bedrag toeristenbelasting** — berekend, zie §4, met korte uitleg van de opbouw

**Niet op het gastformulier** (wel in de PDF naar de camping, §6):

- Gegevens verhuurder (vaste waarden)
- Opmerkingen/Bijzonderheden (alleen beheerder, §3.2)

### 2.3 Opslaan / Aanpassen

- **Opslaan** kan pas als alle verplichte velden geldig zijn (client-side validatie +
  server-side check). Na opslaan: formulier wordt grijs/uitgeschakeld, status → `ingevuld`,
  knop **"Aanpassen"** heropent het formulier.
- Na status `verstuurd` (beheerder heeft gemaild): formulier blijft grijs **zonder**
  Aanpassen-knop, met melding "Uw nachtregistratie is doorgestuurd naar de camping.
  Wijzigingen? Neem contact met ons op." (beheerder kan altijd nog bewerken en opnieuw
  verzenden).
- Meertalig: alle labels/meldingen via `t()` in `app/utils/translations.ts` (nl/en/de).

### 2.4 Rode homepage-tegel (insight)

- Nieuwe zichtbaarheidsoptie **`nachtregistratie`** voor insight-tegels, in de bestaande
  dropdown van de insight-editor (naast "Altijd" / "T/m aankomstdag" / "Vertrekdag
  (+ avond ervoor)") met label **"Nachtregistratieformulier"**: tegel is alleen zichtbaar
  zolang de status van de boeking `leeg` is.
- Een tegel met deze optie linkt **altijd rechtstreeks** naar `/b/<CODE>/nachtregistratie`
  (onafhankelijk van detailContent).
- Arno maakt de tegel zelf aan via de bestaande beheer-UI ("U dient de nachtregistratie
  nog in te vullen", rode opmaak via icoon/titel).

## 3. Beheerflow (beheer-vlp-x9q2w)

### 3.1 Gastenlijst: status in één oogopslag

In "Gepersonaliseerde Gasten Links" per boeking een statusbadge:

| Status | Badge |
|---|---|
| `leeg` | grijs "Leeg" |
| `ingevuld` | amber "Ingevuld" |
| `verstuurd` | groen "Verstuurd ✓" (+ datum) |

### 3.2 Uitklappaneel per gast

Uitklappijltje per boekingsrij → volledig formulier, **alle** velden bewerkbaar door de
beheerder (incl. datums, betaalkeuze, bedrag-override) plus:

- **Opmerkingen/Bijzonderheden** (alleen hier, niet bij de gast). Default-tekst op basis
  van de betaalkeuze, daarna vrij aan te passen/aan te vullen:
  - `receptie` → *"Huurder betaalt de toeristenbelasting bij aankomst zelf bij de receptie"*
  - `overmaken` → *"Verhuurder stort de toeristenbelasting op rekening van het Veluws Hof"*
- Knop **"Verzenden naar camping"** → vult de PDF, mailt hem (§6), zet status
  `verstuurd` + `verstuurdOp`. Succes/fout via de bestaande toast (`saveMessage`);
  SMTP-fouten worden getoond en laten de status ongemoeid.
- Opnieuw verzenden blijft mogelijk (bevestigingsvraag "al verstuurd op …, opnieuw?").

### 3.3 Instellingen-sectie "Nachtregistratie"

Nieuw accordion in beheer met globale waarden (opgeslagen in de blob):

- Verhuurder naam — default **"Veluwe Droom Chalet, Arno Kleinjans"**
- Verhuurder telefoonnummer — default **"06-82287283"**
- Staanplaats accommodatie — default **"Bosrand 18, Klavergraslaan"**
- **E-mailadres camping** (ontvanger) — door Arno in te vullen

## 4. Berekening toeristenbelasting/parkkosten

```
nachten = vertrekdatum − aankomstdatum (in dagen)
bedrag  = €10,00 + (nachten − 1) × €6,25
```

Klopt met de staffel van het park (weekend vr–ma 3 nachten = €22,50; midweek ma–vr
4 nachten = €28,75; week 7 nachten = €47,50). Tarieven als constanten in code
(`TARIEF_EERSTE_NACHT`, `TARIEF_VOLGENDE_NACHT`) zodat een tariefwijziging één regel is.
Beheerder kan het berekende bedrag in het uitklappaneel handmatig overschrijven.

## 5. Datamodel

Per boeking (nieuw optioneel object in `bookings[]`, blijft `undefined` = status `leeg`):

```ts
nachtregistratie?: {
  status: 'ingevuld' | 'verstuurd';   // 'leeg' = object ontbreekt
  betaalwijze: 'receptie' | 'overmaken';
  huurderNaam: string;
  adres: string;
  telefoon: string;
  email: string;                       // alleen intern
  aantalPersonen: number;
  aankomst: string;                    // YYYY-MM-DD, default = checkIn
  vertrek: string;                     // YYYY-MM-DD, default = checkOut
  bedrag: number;                      // berekend, beheerder kan overschrijven
  opmerkingen?: string;                // beheerder
  ingevuldOp?: string;                 // ISO timestamp
  verstuurdOp?: string;                // ISO timestamp
}
```

Globaal (nieuw in de blob + `defaultAppData`):

```ts
nachtregistratieSettings: {
  verhuurderNaam: string;
  verhuurderTelefoon: string;
  staanplaats: string;
  campingEmail: string;
}
```

## 6. E-mail naar de camping

- **Transport:** nodemailer via Hostnet-SMTP — `smtp.hostnet.nl:587` (STARTTLS),
  account `info@veluwedroomchalet.nl`. Env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASS`, optioneel `MAIL_TO_OVERRIDE` (test, §10).
- **Van:** info@veluwedroomchalet.nl · **Aan:** `campingEmail` uit instellingen.
- **Onderwerp:** `Nachtregistratie Bosrand 18 — <aankomst> t/m <vertrek> (<huurderNaam>)`
- **Body (kort, NL):** naam huurder, periode, aantal personen, bedrag, opmerkingen-tekst.
  Het e-mailadres van de gast gaat **niet** mee.
- **Bijlage:** de ingevulde originele PDF, **alleen pagina 1** (pagina 2 met de
  parkregels wordt verwijderd vóór verzending).

## 7. PDF-vulling

- Origineel formulier komt in de repo op een **niet-publieke** plek:
  `app/assets/nachtregistratieformulier-2025.pdf` (dus níét in `public/`).
- Vullen met **pdf-lib** (nieuwe dependency). De PDF heeft een AcroForm met 11
  tekstvelden met generieke namen: `Text1`, `Text13`, `Text16`–`Text18`, `Text21`–`Text26`.
  De mapping naar de zichtbare vakjes wordt tijdens de bouw empirisch vastgesteld met een
  dev-script dat elk veld met zijn eigen naam vult (eenmalig, mapping als constante
  vastleggen in `app/utils/nachtregistratiePdf.ts`).
- Invulling:

| PDF-vak | Waarde |
|---|---|
| Aankomst datum / Vertrek datum | uit registratie, formaat `DD-MM-YYYY` |
| Verhuurder: naam / telefoon / staanplaats | vaste waarden uit `nachtregistratieSettings` |
| Huurder: naam / adres / telefoon / aantal personen | uit registratie |
| Opmerkingen/Bijzonderheden | opmerkingen-tekst beheerder |
| Bedrag: € (rechtsboven) | berekend/overschreven bedrag |
| Voldaan | leeg (blijft aan de receptie) |

- Velden na het vullen **flatten** zodat de camping een niet-meer-bewerkbare, overal
  correct renderende PDF krijgt; daarna pagina 2 verwijderen.

## 8. Technisch ontwerp

| Bestand | Wijziging |
|---|---|
| `app/context/BookingContext.tsx` | `BookingInfo` uitbreiden met `nachtregistratie` |
| `app/utils/db.ts` | `nachtregistratieSettings` in `defaultAppData` |
| `app/utils/toeristenbelasting.ts` **(nieuw)** | tariefconstanten + `berekenBedrag(checkIn, checkOut)` |
| `app/b/[bookingId]/layout.tsx` | pre-arrival gate: vóór D−2 08:00 → paginavullend formulier i.p.v. app (naast bestaande expiry-logica) |
| `app/b/[bookingId]/nachtregistratie/page.tsx` **(nieuw)** | formulierpagina (client), hergebruikt door de gate |
| `app/components/NachtregistratieForm.tsx` **(nieuw)** | het formulier zelf (invullen/grijs/Aanpassen/verstuurd-melding) |
| `app/actions/nachtregistratieActions.ts` **(nieuw)** | `saveNachtregistratie(bookingId, data)` — publieke server action **zonder** PIN, gekeyed op bookingId, met `checkRateLimit`; server-side validatie; read-modify-write op verse blob |
| `app/actions/adminActions.ts` | `updateNachtregistratieSettings`, `adminUpdateNachtregistratie`, `verstuurNachtregistratie` (PIN-beschermd patroon volgen) |
| `app/utils/nachtregistratiePdf.ts` **(nieuw)** | pdf-lib: laden, veldmapping, vullen, flatten, pagina 2 strippen |
| `app/utils/mailer.ts` **(nieuw)** | nodemailer-transport (Hostnet) + `sendNachtregistratie(...)` |
| `app/b/[bookingId]/page.tsx` | `isInsightVisible`: optie `nachtregistratie` (tonen zolang status leeg) + tegel linkt naar het formulier |
| `app/beheer-vlp-x9q2w/page.tsx` | statusbadges, uitklappaneel per gast, verzendknop, instellingen-accordion, zichtbaarheidsoptie in insight-editor |
| `app/utils/translations.ts` | nieuwe `t()`-keys nl/en/de voor het gastformulier |
| `package.json` | + `nodemailer`, `pdf-lib` |

**Verzenden** loopt volledig server-side in één action: verse data ophalen →
PDF vullen → mailen → status bijwerken → `saveToKV` (bestaand patroon met
`invalidateCache` + `revalidatePath`).

## 9. Randgevallen & risico's

- **Cache/ISR-vertraging gate:** `layout.tsx` heeft `revalidate = 60` en `getAppData()`
  cachet 2 s. De datum-check gebeurt bij render; overgang D−2 08:00 kan dus tot ~1 min
  later zichtbaar worden. Acceptabel.
- **Read-modify-write-race:** gast-save en beheerder-save schrijven beiden de hele blob.
  Beide actions lezen vóór het schrijven vers (`getAppDataFresh`) en muteren alleen hun
  eigen boeking-object; het (kleine) restrisico van gelijktijdige schrijvers is voor deze
  schaal acceptabel — zelfde aanname als de bestaande admin-actions.
- **Publieke schrijfroute:** `saveNachtregistratie` is zonder PIN aan te roepen. Mitigatie:
  bookingId (onraadbare code) vereist, rate limiting, strikte veld-whitelist + validatie,
  status `verstuurd` niet door de gast te wijzigen.
- **PDF-veldmapping:** generieke veldnamen → mapping kan verschuiven als de camping ooit
  een nieuw formulier levert. Mapping + jaarversie als constante; bij een nieuw formulier
  dev-script opnieuw draaien.
- **Boeking gewijzigd na invullen:** past de beheerder `checkIn`/`checkOut` van de boeking
  aan, dan blijven `aankomst`/`vertrek` in de registratie staan; het uitklappaneel toont
  een waarschuwing als ze afwijken van de boeking.

## 10. Testplan

1. **PDF-mapping:** dev-script vult elk veld met zijn naam → visueel controleren; daarna
   testvulling met dummygast en pagina-2-verwijdering controleren.
2. **Mail:** met `MAIL_TO_OVERRIDE=veluwedroomchalet@gmail.com` verzenden → bijlage,
   onderwerp, body en 1-pagina-PDF controleren. Pas daarna override weghalen.
3. **Gate:** testboeking met aankomst vandaag+5 (→ alleen formulier), vandaag+1
   (→ volledige app); systeemtijd-onafhankelijk testen door datums te variëren.
4. **Formulierflow:** invullen → grijs + Aanpassen; heropenen → wijzigen; beheerder
   verzendt → gast ziet verstuurd-melding zonder Aanpassen; tegel verdwijnt na invullen.
5. **Validatie:** lege velden, aantalPersonen 0/negatief, ongeldig e-mailadres,
   onbekende bookingId (→ 404/fout), rate limit.
6. **Talen:** formulier in nl/en/de.

## 11. Randvoorwaarden (acties Arno)

1. SMTP-wachtwoord van info@veluwedroomchalet.nl → als `SMTP_PASS` in `.env.local`
   (en t.z.t. Vercel; deploy pas na expliciete opdracht).
2. E-mailadres van de receptie van 't Veluws Hof (voor de instellingen-sectie).
3. PDF uit `~/Downloads/nachtregistratie+formulier+2025+invulbaar.pdf` → wordt bij de
   bouw naar `app/assets/` gekopieerd.
4. Na oplevering zelf de rode tegel aanmaken in beheer met zichtbaarheid "nachtregistratie".

## 12. Buiten scope (bewust)

- Automatisch versturen naar de camping zonder beheerderscontrole.
- Herinneringsmails/notificaties aan de gast die niet invult (de rode tegel + gate zijn
  de nudge).
- Betaal-/iDEAL-afhandeling van het overmaken aan de verhuurder.
