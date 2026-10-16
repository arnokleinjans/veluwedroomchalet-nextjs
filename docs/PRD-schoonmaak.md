# PRD — Schoonmaak bijhouden

**Status:** gebouwd en lokaal getest tegen de TEST-database (branch `schoonmaak`). Niet gedeployed. · **Datum:** 16-10-2026

## 1. Doel

Kitty wil in beheer per boeking de schoonmaak bijhouden. Wie maakt schoon, wat kost het, is het betaald en hoe ging het. Nu zijn er twee schoonmaaksters. Dat kunnen er meer worden.

Elke schoonmaakster krijgt een eigen portaal. Ze ziet alleen de beurten die aan haar zijn toegewezen. Ze kan een beurt accepteren of afkeuren en een opmerking plaatsen.

De schoonmaak is op de vertrekdag van de gast. Kitty kan die datum per beurt aanpassen.

## 2. Besluiten Kitty (16-10-2026)

1. **Opmerkingen.** Eén veld, bestemd voor de schoonmaakster. Geen interne notitie.
2. **Tarief.** Vast bedrag per schoonmaakster, per beurt aan te passen.
3. **Betalen.** Per beurt een vinkje "betaald", plus een maandoverzicht per schoonmaakster.
4. **Afkeuren.** Kitty krijgt een mail en de beurt staat rood in beheer. Kitty wijst iemand anders toe (§3.5).
5. **Wat ziet de schoonmaakster.** Datum, vertrektijd van de gast, aankomstdatum van de volgende gast, aantal personen, het bericht van Kitty en haar eigen opmerking voor Kitty.
6. **Beurten zonder boeking.** Ja (§3.4).
7. **Inloggen.** Persoonlijke link met pincode.
8. **Mail bij toewijzen.** Ja.

## 3. Beheer

### 3.1 Schoonmaaksters

Een nieuw blok "🧹 Schoonmaaksters" in beheer. Per schoonmaakster:

- Naam
- E-mailadres
- Telefoonnummer
- Standaardtarief
- Actief ja/nee. Een schoonmaakster die stopt, gaat op inactief. Haar oude beurten blijven staan.
- Persoonlijke link en pincode. Er is een knop om de pincode opnieuw te maken.

### 3.2 Schoonmaak per boeking

Bij elke boeking onder "Gepersonaliseerde Gasten Links" komt een regel schoonmaak met een statusbadge, net als bij de nachtregistratie. Uitklappen toont:

- Datum. Standaard de vertrekdatum.
- Schoonmaakster. Een keuzelijst met de actieve schoonmaaksters.
- Bedrag. Wordt gevuld met het tarief van de gekozen schoonmaakster.
- Betaald ja/nee, met de datum van betaling.
- Vertrektijd van de gast. Leeg betekent de standaardtijd uit de instellingen (11:00).
- Bericht aan de schoonmaakster.
- Opmerking van de schoonmaakster (alleen lezen).
- Status. Kitty kan die met de hand zetten, ook op "Vervallen" als er geen schoonmaak nodig is.
- Geschiedenis van de beurt.

Elke boeking met een vertrekdatum vanaf vandaag krijgt automatisch een beurt zonder schoonmaakster op de vertrekdatum. Boekingen die al vertrokken zijn, krijgen geen beurt. Een automatische beurt kan niet worden verwijderd zolang de boeking bestaat. Gebruik dan "Vervallen".

### 3.3 Overzicht

Een sectie "🧹 Schoonmaak" onder de gastenlinks, met alle beurten op datum. Filters: komend, zonder schoonmaakster, afgekeurd, niet betaald, alle. Daaronder het maandoverzicht per schoonmaakster (aantal beurten, totaal, betaald, nog te betalen), het beheer van de schoonmaaksters en de instellingen (standaard vertrektijd, e-mailadres voor meldingen). In de kop staat een rode teller als er beurten zijn afgekeurd.

Betalen gebeurt pas als het werk gedaan is. Het maandoverzicht telt bij totaal, betaald en nog te betalen alleen uitgevoerde beurten. Toegewezen en geaccepteerde beurten staan in een aparte grijze kolom "Nog gepland". Een beurt waarvan de datum voorbij is maar die niet als klaar is gemeld, verschijnt in de aandachtsbalk als "niet afgemeld".

### 3.4 Losse beurt toevoegen

Bovenaan het schoonmaakoverzicht staat een knop "+ Schoonmaak toevoegen". Daarmee voegt Kitty een beurt toe die niet bij een vertrek hoort. Bijvoorbeeld een tussentijdse schoonmaak, een grote schoonmaak of een beurt na eigen gebruik.

Ze vult in:

- Omschrijving, bijvoorbeeld "Grote voorjaarsschoonmaak"
- Datum
- Schoonmaakster
- Bedrag. Wordt gevuld met het tarief van de schoonmaakster en is aan te passen. Een grote schoonmaak kost vaak meer.
- Boeking. Optioneel. Een tussentijdse schoonmaak tijdens een lang verblijf koppel je aan die boeking.
- Bericht aan de schoonmaakster

Daarna werkt de beurt hetzelfde als een gewone beurt. Hij staat in het overzicht, in het portaal van de schoonmaakster en telt mee in het maandtotaal. In het overzicht staat bij een losse beurt de omschrijving waar anders de gastnaam staat.

### 3.5 Afgekeurde beurt opnieuw toewijzen

Keurt schoonmaakster A een beurt af, dan krijgt Kitty een mail en staat de beurt rood in beheer, met de reden van A erbij.

Kitty klapt de beurt open en kiest in de keuzelijst schoonmaakster B. Het bedrag springt naar het tarief van B. De status gaat terug naar "toegewezen". B krijgt een mail en ziet de beurt in haar portaal.

De beurt verdwijnt uit het portaal van A. De afwijzing van A blijft in beheer zichtbaar in de geschiedenis van de beurt: "12-11 afgekeurd door A: ben op vakantie". Zo ziet Kitty later nog wie wanneer heeft afgezegd.

Dezelfde keuzelijst werkt ook als er niets is afgekeurd. Kitty kan een beurt altijd aan iemand anders geven. A krijgt dan een mail dat de beurt is ingetrokken.

### 3.6 Datum en boeking

- Verandert de vertrekdatum van een boeking, dan schuift de schoonmaakdatum mee. Heeft Kitty de datum zelf aangepast, dan blijft die staan.
- Wordt een boeking verwijderd, dan blijft de beurt bestaan met de melding "boeking verwijderd". Kitty ruimt die zelf op.
- Verandert het boekingsnummer, dan gaat de beurt mee naar het nieuwe nummer.
- Wordt een beurt verplaatst terwijl er een schoonmaakster op staat, dan krijgt zij een mail.

## 4. Portaal schoonmaaksters

Een aparte pagina op `webapp.veluwedroomchalet.nl/schoonmaak`. Inloggen met de persoonlijke link en de pincode. Werkt op een telefoon.

Ze ziet een lijst met haar eigen beurten: eerst de komende, daarna de afgelopen. Per beurt:

- Datum en tijdstip waarop de gast vertrekt
- Aankomstdatum van de volgende gast
- Aantal personen van de vertrekkende gast, uit de nachtregistratie. Is die nog niet ingevuld, dan staat er "nog niet bekend".
- Het bericht van Kitty
- Bedrag en of het betaald is
- Haar eigen opmerking voor Kitty, altijd aan te passen

Bij een losse beurt staat de omschrijving in plaats van de vertrektijd.

Ze kan:

- Een nieuwe beurt **accepteren** of **afkeuren**. Bij afkeuren is een reden verplicht.
- Een geaccepteerde beurt toch afkeuren, of een afgekeurde beurt toch accepteren zolang Kitty niemand anders heeft gekozen.
- Na afloop melden dat de schoonmaak klaar is.
- Een opmerking voor Kitty plaatsen ("de thee was op").

Ze ziet geen beurten van anderen. Ze ziet geen gastgegevens. Ze kan niets in beheer.

## 5. Statussen

| Status | Betekenis | Wie zet hem |
|---|---|---|
| Open | Nog geen schoonmaakster | automatisch |
| Toegewezen | Schoonmaakster gekozen, nog niet bevestigd | Kitty |
| Geaccepteerd | Schoonmaakster heeft bevestigd | schoonmaakster |
| Afgekeurd | Schoonmaakster kan niet | schoonmaakster |
| Uitgevoerd | Schoonmaak is gedaan | schoonmaakster of Kitty |
| Vervallen | Geen schoonmaak nodig. Niet zichtbaar in het portaal | Kitty |

Na "afgekeurd" kiest Kitty een andere schoonmaakster. De beurt gaat dan terug naar "toegewezen" (§3.5).

Betaald is een los vinkje. Een beurt kan uitgevoerd en nog niet betaald zijn.

Kitty kan elke status handmatig aanpassen.

## 6. Techniek

### 6.1 Opslag

We blijven bij Upstash Redis. De schoonmaak komt in eigen sleutels, los van `veluwe_app_data`:

- `schoonmakers` — lijst met schoonmaaksters
- `schoonmaak:{id}` — één beurt per sleutel
- `schoonmaak:index` — set met alle beurt-ids
- `schoonmaak:instellingen` — standaard vertrektijd en e-mailadres voor meldingen
- `inlog:pogingen:*` — mislukte inlogpogingen, verlopen na 15 minuten

Elke beurt is een eigen sleutel. Een schoonmaakster die iets opslaat, raakt nooit de boekingen of de teksten van de gastapp. Twee mensen die tegelijk opslaan, overschrijven elkaar niet. De gastpagina's lezen deze sleutels nooit.

Een beurt:

```ts
{
  id: string,
  bookingId?: string,
  automatisch?: boolean,     // true = de beurt die bij het vertrek van de boeking hoort
  omschrijving?: string,     // verplicht bij een losse beurt
  datum: string,             // YYYY-MM-DD
  datumHandmatig: boolean,
  vertrektijd?: string,      // leeg = standaard uit de instellingen
  schoonmakerId?: string,
  bedrag?: number,
  betaald: boolean,
  betaaldOp?: string,
  status: "open" | "toegewezen" | "geaccepteerd" | "afgekeurd" | "uitgevoerd" | "vervallen",
  redenAfkeuring?: string,
  berichtAanSchoonmaker?: string,
  opmerkingSchoonmaker?: string,
  historie: { op: string, schoonmakerId?: string, actie: string, toelichting?: string }[],
  bijgewerkt: string
}
```

`historie` krijgt bij elke statuswijziging een regel: toegewezen, geaccepteerd, afgekeurd met reden, ingetrokken, uitgevoerd. Bij opnieuw toewijzen worden `redenAfkeuring` en `opmerkingSchoonmaker` leeggemaakt. De oude waarden staan dan in `historie`.

### 6.2 Inloggen en rechten

- Na een juiste PIN zet de server een ondertekende, httpOnly sessiecookie `vdc_beheer` (30 dagen). Het geheim wordt afgeleid van `ADMIN_PIN` en het Redis-token, dus op Vercel is geen nieuwe variabele nodig. `SESSIE_SECRET` kan het overschrijven.
- Een schoonmaakster krijgt na haar pincode de cookie `vdc_schoonmaak` met haar id en de versie van haar pincode. Een nieuwe pincode maakt oude sessies ongeldig. Inactief zetten blokkeert het inloggen.
- Elke server-actie van beheer controleert de cookie, net als `/api/translate` en `/api/summarize` en uploaden/verwijderen in de mediabibliotheek. Portaalacties geven alleen beurten terug met het eigen `schoonmakerId`, en de cookie moet bij de link horen.
- Pincodes (5 cijfers) worden gehasht opgeslagen (scrypt). Na 8 foute pogingen per IP-adres is inloggen 15 minuten geblokkeerd, voor beheer en per schoonmaakster apart.

### 6.3 Mail

Via de bestaande Hostnet-SMTP (`mailer.ts`):

- Naar de schoonmaakster bij toewijzen
- Naar de vorige schoonmaakster als Kitty een beurt aan iemand anders geeft
- Naar de schoonmaakster als de datum verandert
- Naar het meldingsadres (instellingen) bij afkeuren
- Naar het meldingsadres als een schoonmaakster een afgekeurde beurt toch accepteert

Buiten Vercel gaat elke schoonmaakmail naar akleinjans@me.com, met de echte ontvanger in het onderwerp. Een mislukte mail blokkeert het opslaan niet, maar wordt wel gemeld.

## 7. Live zetten

Alles is in één keer gebouwd op branch `schoonmaak` en lokaal getest tegen de TEST-database. Bij het live zetten:

1. Backup van productie (menu 12 in beheer.py).
2. Merge naar `main` en push. Alleen op expliciete opdracht van Arno.
3. Kitty logt één keer opnieuw in. De oude inlog in de browser telt niet meer.
4. Bij de eerste keer openen van beheer krijgen alle boekingen met een vertrek vanaf vandaag een beurt.

## 8. Later

- Foto's bij een opmerking
- Vaste checklist per schoonmaak
- Voorraadlijst (thee, koffie, wc-papier)
- Agenda-export voor de schoonmaaksters
