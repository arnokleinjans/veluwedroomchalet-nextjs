# PRD — Schoonmaak bijhouden

**Status:** concept, wacht op antwoorden van Kitty (§2). Nog niets gebouwd. · **Datum:** 16-10-2026

## 1. Doel

Kitty wil in beheer per boeking de schoonmaak bijhouden. Wie maakt schoon, wat kost het, is het betaald en hoe ging het. Nu zijn er twee schoonmaaksters. Dat kunnen er meer worden.

Elke schoonmaakster krijgt een eigen portaal. Ze ziet alleen de beurten die aan haar zijn toegewezen. Ze kan een beurt accepteren of afkeuren en een opmerking plaatsen.

De schoonmaak is op de vertrekdag van de gast. Kitty kan die datum per beurt aanpassen.

## 2. Vragen voor Kitty

Deze punten bepalen hoe het wordt gebouwd. De voorstellen staan erbij.

1. **Opmerkingen.** Een opmerking als "de haren in de put waren niet schoon" is voor jezelf of voor de schoonmaakster? Voorstel: twee velden. Een interne notitie die alleen jij ziet. Een bericht dat de schoonmaakster in haar portaal ziet.
2. **Tarief.** Heeft elke schoonmaakster een vast bedrag per beurt? Voorstel: een standaardtarief per schoonmaakster, per beurt aan te passen.
3. **Betalen.** Betaal je per beurt of per maand? Voorstel: per beurt een vinkje "betaald", plus een overzicht van wat per schoonmaakster per maand nog openstaat. Daarmee kun je in één keer afrekenen.
4. **Afkeuren.** Wat wil je dat er gebeurt als een schoonmaakster een beurt afkeurt? Voorstel: je krijgt een mail en de beurt staat rood in beheer. Jij wijst iemand anders toe, zie §3.5.
5. **Wat ziet de schoonmaakster.** Voorstel: datum, vertrektijd van de gast, aankomstdatum van de volgende gast, aantal personen. Geen naam, telefoon of e-mail van de gast.
6. **Beurten zonder boeking.** Wil je ook een tussentijdse schoonmaak, een grote schoonmaak of een beurt na eigen gebruik kunnen invoeren? Voorstel: ja, een beurt kan los van een boeking bestaan, zie §3.4.
7. **Inloggen.** Voorstel: elke schoonmaakster krijgt een vaste persoonlijke link met een pincode. Die werkt op haar telefoon. Er zijn geen wachtwoorden te onthouden.
8. **Mail bij toewijzen.** Moet een schoonmaakster een mail krijgen als je haar een beurt toewijst? Voorstel: ja.

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
- Interne notitie (alleen beheer).
- Bericht aan de schoonmaakster.
- Opmerking van de schoonmaakster (alleen lezen).

Een nieuwe boeking krijgt automatisch een beurt zonder schoonmaakster op de vertrekdatum.

### 3.3 Overzicht

Een blok "🧹 Schoonmaakoverzicht" met alle beurten op datum. Filters: komend, zonder schoonmaakster, afgekeurd, niet betaald. Per schoonmaakster een totaal per maand: aantal beurten, totaalbedrag, nog te betalen.

### 3.4 Losse beurt toevoegen

Bovenaan het schoonmaakoverzicht staat een knop "➕ Schoonmaak toevoegen". Daarmee voegt Kitty een beurt toe die niet bij een vertrek hoort. Bijvoorbeeld een tussentijdse schoonmaak, een grote schoonmaak of een beurt na eigen gebruik.

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
- De testboeking `TEST` krijgt ook een beurt. Zo kan het portaal worden getest zonder echte data.

## 4. Portaal schoonmaaksters

Een aparte pagina op `webapp.veluwedroomchalet.nl/schoonmaak`. Inloggen met de persoonlijke link en de pincode. Werkt op een telefoon.

Ze ziet een lijst met haar eigen beurten: eerst de komende, daarna de afgelopen. Per beurt:

- Datum en tijdstip waarop de gast vertrekt
- Aankomstdatum van de volgende gast
- Aantal personen van de vertrekkende gast
- Het bericht van Kitty
- Bedrag en of het betaald is

Ze kan:

- Een nieuwe beurt **accepteren** of **afkeuren**. Bij afkeuren is een reden verplicht.
- Na afloop **uitgevoerd** melden, met een opmerking ("de thee was op").

Ze ziet geen beurten van anderen. Ze ziet geen gastgegevens. Ze kan niets in beheer.

## 5. Statussen

| Status | Betekenis | Wie zet hem |
|---|---|---|
| Open | Nog geen schoonmaakster | automatisch |
| Toegewezen | Schoonmaakster gekozen, nog niet bevestigd | Kitty |
| Geaccepteerd | Schoonmaakster heeft bevestigd | schoonmaakster |
| Afgekeurd | Schoonmaakster kan niet | schoonmaakster |
| Uitgevoerd | Schoonmaak is gedaan | schoonmaakster of Kitty |

Na "afgekeurd" kiest Kitty een andere schoonmaakster. De beurt gaat dan terug naar "toegewezen" (§3.5).

Betaald is een los vinkje. Een beurt kan uitgevoerd en nog niet betaald zijn.

Kitty kan elke status handmatig aanpassen.

## 6. Techniek

### 6.1 Opslag

We blijven bij Upstash Redis. De schoonmaak komt in eigen sleutels, los van `veluwe_app_data`:

- `schoonmakers` — lijst met schoonmaaksters
- `schoonmaak:{id}` — één beurt per sleutel
- `schoonmaak:index` — lijst met alle ids op datum

Elke beurt is een eigen sleutel. Een schoonmaakster die iets opslaat, raakt nooit de boekingen of de teksten van de gastapp. Twee mensen die tegelijk opslaan, overschrijven elkaar niet. De gastpagina's lezen deze sleutels nooit.

Een beurt:

```ts
{
  id: string,
  bookingId?: string,
  omschrijving?: string,     // verplicht bij een losse beurt
  datum: string,             // YYYY-MM-DD
  datumHandmatig: boolean,
  schoonmakerId?: string,
  bedrag?: number,
  betaald: boolean,
  betaaldOp?: string,
  status: "open" | "toegewezen" | "geaccepteerd" | "afgekeurd" | "uitgevoerd",
  redenAfkeuring?: string,
  notitieIntern?: string,
  berichtAanSchoonmaker?: string,
  opmerkingSchoonmaker?: string,
  historie: { op: string, schoonmakerId?: string, actie: string, toelichting?: string }[],
  bijgewerkt: string
}
```

`historie` krijgt bij elke statuswijziging een regel: toegewezen, geaccepteerd, afgekeurd met reden, ingetrokken, uitgevoerd. Bij opnieuw toewijzen worden `redenAfkeuring` en `opmerkingSchoonmaker` leeggemaakt. De oude waarden staan dan in `historie`.

### 6.2 Inloggen en rechten

Beheer controleert de PIN nu alleen in de browser. De server-acties controleren zelf niets. Dat moet eerst veranderen.

- Na een juiste PIN zet de server een sessiecookie (httpOnly, ondertekend) met de rol `beheer`.
- Een schoonmaakster krijgt na haar pincode een sessiecookie met de rol `schoonmaker` en haar id.
- Elke server-actie controleert de rol. Acties van het portaal geven alleen beurten terug met het eigen `schoonmakerId`.
- Pincodes worden gehasht opgeslagen. Rate limit op inlogpogingen, net als bij de nachtregistratie.

### 6.3 Mail

Via de bestaande Hostnet-SMTP (`mailer.ts`):

- Naar de schoonmaakster bij toewijzen
- Naar de vorige schoonmaakster als Kitty een beurt aan iemand anders geeft
- Naar Kitty bij afkeuren

## 7. Fases

Elke fase gaat apart live. Voor elke fase komt er een Redis-backup in `scripts/`.

1. **Inloggen op de server** (§6.2, alleen de rol `beheer`). Voor Kitty verandert er niets zichtbaars. Wel moet ze één keer opnieuw inloggen.
2. **Schoonmaak in beheer** (§3). Alleen Kitty gebruikt het. Bestaande boekingen krijgen een beurt op hun vertrekdatum.
3. **Portaal schoonmaaksters** (§4). Eerst testen met de testboeking en één schoonmaakster.
4. **Mail** (§6.3).

## 8. Later

- Foto's bij een opmerking
- Vaste checklist per schoonmaak
- Voorraadlijst (thee, koffie, wc-papier)
- Agenda-export voor de schoonmaaksters
