# PRD: Mediabibliotheek in het beheerpaneel

> **Status:** **Fase 1, 2 en 3 gebouwd (2026-07-24)** — bekijken, gebruik-check, uploaden
> (client-side normalisatie) en verwijderen (geblokkeerd bij gebruik) staan alle drie lokaal
> klaar in het beheerpaneel. `GITHUB_TOKEN`/`GITHUB_REPO` toegevoegd aan `.env.local`
> (hergebruikt het token uit Zaakmodule — heeft ook push-toegang tot deze repo, bevestigd via de
> GitHub API). Nog NIET gedeployed/getest met een echte upload-commit (zie onderaan "Wat nog
> moet gebeuren").
>
> **Afwijking t.o.v. het oorspronkelijke plan:** `sanitizeFileName` doet GEEN kebab-case/
> lowercase-slugify zoals hieronder beschreven (stap 2) — dat zou een ander naamgevingspatroon
> introduceren dan de rest van het project (bestaande bestanden behouden spaties en hoofdletters,
> bv. "Restaurant in een oogopslag.webp"). In plaats daarvan wordt dezelfde lichte regel gebruikt
> die op 2026-07-24 ook in `antigravity-beheer/beheer.py` is doorgevoerd: alleen de eerste letter
> wordt een hoofdletter, de rest van de naam blijft intact, extensie wordt altijd `.webp`.
>
> **Wat er is gebouwd (fase 1):** `app/actions/mediaActions.ts` (`listMediaImages()` +
> `getImageUsageMap()`) en een nieuwe, lazy-loaded sectie in `page.tsx`. De gebruik-detectie
> doorzoekt in één `getAppDataFresh()`-call zowel de exacte image-velden
> (`property.headerImage`, `videos[].thumb`, `omgeving[].image`, `insights[].image`) als de
> rich-text-velden (`omgeving[].desc`, `insights[].detailContent`, `expiredPageContent`) — en dat
> voor NL én de losse `translations.en`/`translations.de`-kopieën apart, zodat een taal die uit
> sync raakt (zoals de `qr.webp`-bug van gisteren) zichtbaar wordt in plaats van gemaskeerd. Een
> vaste lijst (`HARDCODED_CODE_REFERENCES`) dekt de ~4 relevante hardcoded codebase-verwijzingen
> (Header.webp/logo/twee db.ts-fallbacks) die geen Redis-content zijn. Getest met een los
> tsx-script rechtstreeks tegen de live Redis-data: 129 afbeeldingen, 97 ongebruikt/32 gebruikt,
> `Qr.webp`/`Qr-2.webp`/`Qr-3.webp`/`Deproeftuinhoenderloo.webp` (de bestanden van de
> hoofdletter-opschoning) komen correct als "in gebruik" naar voren in alle 3 talen.
>
> Aanbevolen bij oppakken van fase 2/3: gefaseerd bouwen zoals hieronder beschreven.

## Context

De beheerder kiest afbeeldingen nu via dropdowns die `public/images` uitlezen, maar nieuwe afbeeldingen toevoegen kan alleen lokaal via git/beheer.py. Gewenst: een "Mediabibliotheek"-sectie op de beheer-pagina (https://webapp.veluwedroomchalet.nl/beheer-vlp-x9q2w) waarin je alle afbeeldingen ziet, kunt uploaden (automatisch genormaliseerd naar webp, max 1920px, kwaliteit 85 — zelfde regels als beheer.py optie 9) en kunt verwijderen met een gebruik-check die toont wáár een afbeelding in de app gebruikt wordt.

**Kernbeperking:** Vercel's filesystem is read-only tijdens runtime. Gekozen oplossing (afgestemd met gebruiker): uploads/verwijderingen gaan als commits via de **GitHub Contents API** naar `public/images` op `main`; Vercel deployt automatisch (±1–2 min). Eén systeem, ook de bestaande ~139 afbeeldingen blijven beheerbaar.

**Afgestemde keuzes:** GitHub-commit als opslag · gebruik-check blokkeert verwijderen · bij duplicaatnaam vraagt de UI overschrijven/hernoemen · scope is alleen `public/images` (geen icons/thumbnails).

## Architectuurbeslissingen

1. **Normalisatie client-side** (canvas, geen sharp): iPhone-foto's van 3–10 MB worden in de browser verkleind naar webp van ~100–400 KB vóór verzending — past binnen server action limits. Sharp op Vercel kan geen HEIC (libheif ontbreekt); iOS Safari decodeert HEIC zelf. Desktop Chrome + HEIC → nette foutmelding. Runtime-check op `blob.type === "image/webp"` (Safari 17+ vereist).
2. **GitHub API als bron van waarheid voor de lijst**, fs als "live"-indicator: `GET contents/public/images` geeft de actuele lijst incl. `sha` (nodig voor overwrite/delete); `fs.readdirSync` bepaalt per bestand `isLive`. Niet-live items krijgen badge "⏳ wordt gepubliceerd (±2 min)" met lokale preview. Zonder `GITHUB_TOKEN`: alleen fs-lijst + waarschuwing, upload/verwijderen uitgeschakeld.

## Stappen

### 1. Env vars (`.env.local` + Vercel project settings)
```
GITHUB_TOKEN=<fine-grained PAT, alleen repo veluwedroomchalet-nextjs, Contents: Read and write>
GITHUB_OWNER=arnokleinjans
GITHUB_REPO=veluwedroomchalet-nextjs
GITHUB_BRANCH=main   (optioneel, default main)
```
Alleen server-side; nooit `NEXT_PUBLIC_`.

### 2. Nieuw: `app/actions/mediaActions.ts` (`"use server"`)

Helpers:
- `ghFetch(method, path, body?)` — wrapper rond `api.github.com/repos/{owner}/{repo}/contents/...` met Bearer-token; **padsegmenten encoden met `encodeURIComponent`** (bestaande namen bevatten spaties).
- `sanitizeFileName(name)` — NFKD, diacrieten strippen, spaties→`-`, lowercase, alleen `[a-z0-9._-]`, extensie `.webp` (alleen voor nieuwe uploads).

Actions (muterende actions verifiëren eerst de pin via bestaand `verifyAdminPin`; pin zit al in state in page.tsx:57):
- `listMediaImages(): {name, path, sha, size, isLive}[]` — GitHub-lijst + fs-merge.
- `findImageUsages(imagePath): string[]` — `getAppDataFresh()` scannen:

| Veld | Match | Label |
|---|---|---|
| `property.headerImage` | exact (met/zonder leading `/`) | Header afbeelding |
| `insights[i].image` | exact | Home-item '\<title>' |
| `insights[i].detailContent` | substring in HTML | Home-item '\<title>' (in detailpagina) |
| `videos[i].thumb` | exact | Video '\<title>' (thumbnail) |
| `omgeving[i].image` | exact | Omgeving-tip '\<name>' |
| `omgeving[i].desc` | substring in HTML | Omgeving-tip '\<name>' (in beschrijving) |
| `expiredPageContent` | substring in HTML | Verlopen boeking pagina |

HTML-matching: zowel rauwe naam als `encodeURI`-variant checken (spaties = `%20` in src). Ook `translations.en/de` meenemen als die gespiegelde HTML bevatten (verifiëren in `app/utils/db.ts`).
- `uploadMediaImage(pin, fileName, base64, mode: "new"|"overwrite"|"rename")` — bestaat-check via GET; `"new"` + bestaat → `{ok:false, reason:"exists"}`; `"overwrite"` → PUT met `sha`; `"rename"` → probeer `naam-1.webp`, `-2`, …; commit message "Mediabibliotheek: upload \<naam>".
- `deleteMediaImage(pin, fileName)` — eerst nogmaals `findImageUsages` (defense in depth), dan GET→sha→DELETE.

### 3. `next.config.ts`
`experimental: { serverActions: { bodySizeLimit: "4mb" } }` (base64 van genormaliseerde webp kan boven de standaard 1 MB komen).

### 4. Nieuwe sectie in `app/beheer-vlp-x9q2w/page.tsx`

Inline `<details>`-blok "🖼️ Mediabibliotheek" in bestaande stijl, na "⏰ Verlopen Boeking Pagina". Client-normalisatie in `app/utils/imageNormalize.ts`: `createImageBitmap` → schalen (langste zijde max 1920, nooit opschalen) → `canvas.toBlob("image/webp", 0.85)` → base64.

UI:
- Knop "📤 Afbeeldingen uploaden" (`<input type=file multiple accept="image/*,.heic,.heif">`), info-regel "Na upload of verwijderen duurt het ±2 min voordat wijzigingen op de site zichtbaar zijn."
- Grid `repeat(auto-fill, minmax(150px,1fr))`: thumbnail (`/images/...`, lazy), naam, grootte, 🗑️. Pending items: lokale object-URL preview + ⏳-badge.
- Uploads sequentieel; bij `reason:"exists"` inline conflictpaneel: **[Overschrijven] [Hernoemen naar x-1.webp] [Annuleren]**.
- Verwijderen: eerst `findImageUsages` → in gebruik = rood paneel met locatie-lijst, verwijderen geblokkeerd; niet in gebruik = `confirm()` → `deleteMediaImage` → uit grid.

### 5. `app/actions/assetActions.ts`
`fetchAvailableHeaderImages()` mergen met GitHub-lijst (try/catch, fallback = fs) zodat verse uploads direct in de bestaande dropdowns (header/home-items/omgeving/rich text) verschijnen. Na geslaagde upload in page.tsx de dropdownlijst verversen.

## Edge cases
- Spaties/diacrieten: `encodeURIComponent` per padsegment richting GitHub; `encodeURI` in `<img src>`; nieuwe uploads gesanitized.
- 409/422 bij verouderde `sha` → melding "Probeer opnieuw" + lijst verversen.
- Meerdere snelle uploads → Vercel dedupliceert builds; geen actie nodig.
- Corrupt/onleesbaar bestand → per-bestand fout, rest van de queue gaat door.
- Token: fine-grained PAT, alleen deze repo, alleen Contents-scope, vervaldatum noteren.

## Verificatie
1. Lokaal (`npm run dev`, PAT in `.env.local`): sectie toont ~139 webp's.
2. Upload JPG >1920px/>3MB → webp 1920px op GitHub zichtbaar, ⏳-badge in grid.
3. Duplicaat uploaden → conflictpaneel; test overschrijven én hernoemen.
4. "Tëst Foto.PNG" → `test-foto.webp`.
5. Verwijderen van gebruikte afbeelding (bv. omgeving-tip) → geblokkeerd met juiste labels, incl. een afbeelding die alleen in rich-text-HTML voorkomt.
6. Ongebruikt bestand verwijderen → weg op GitHub, na ±2 min 404 op live site.
7. Header-dropdown toont nieuwe upload direct.
8. Zonder `GITHUB_TOKEN` → waarschuwing, rest beheerpaneel werkt.
9. iPhone Safari HEIC → slaagt; desktop Chrome HEIC → nette foutmelding.

## Bestanden
- `app/actions/mediaActions.ts` (nieuw) — `listMediaImages`, `getImageUsageMap`,
  `isGithubConfigured`, `uploadMediaImage`, `deleteMediaImage`
- `app/utils/imageNormalize.ts` (nieuw, client-side)
- `app/beheer-vlp-x9q2w/page.tsx` (nieuwe sectie, ná "⏰ Verlopen Boeking Pagina")
- `app/actions/assetActions.ts` (`fetchAvailableHeaderImages` gaat nu via `listMediaImages()`)
- `next.config.ts` (bodySizeLimit: "4mb")
- `.env.local`: `GITHUB_TOKEN` (hergebruikt uit Zaakmodule) + `GITHUB_REPO=arnokleinjans/veluwedroomchalet-nextjs`
- Changelog bijwerken in `veluwedroomchalet/CLAUDE.md`

## Wat nog moet gebeuren (bewust niet door Claude zelf gedaan)
- **Nog geen echte upload/delete tegen de live GitHub-repo getest** — dat zou een echte commit +
  Vercel-deploy triggeren, en dat valt onder de deploy-regel (nooit zonder expliciete opdracht
  per keer). De read-kant (lijst + gebruik-check) is wél al met echte productiedata getest.
  Test uploaden/verwijderen zelf via het beheerpaneel, of geef expliciet opdracht voor een
  gecontroleerde test met een wegwerpbestand.
- Vercel-project-instellingen: `GITHUB_TOKEN`/`GITHUB_REPO` moeten ook als env vars in Vercel
  zelf gezet worden voordat dit in productie werkt (staat nu alleen lokaal in `.env.local`).
- Overweeg het GitHub-token op termijn te vervangen door een fijnmazig PAT dat alléén bij
  `veluwedroomchalet-nextjs` kan (het hergebruikte Zaakmodule-token is breed-gescoped).
