# PRD: Mediabibliotheek in het beheerpaneel

> **Status:** nog niet in uitvoering — plan opgesteld en bewust geparkeerd op 2026-06-12.
> Aanbevolen bij oppakken: gefaseerd bouwen (1. alleen bekijken + gebruik-check, 2. uploaden, 3. verwijderen).

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
- `app/actions/mediaActions.ts` (nieuw)
- `app/utils/imageNormalize.ts` (nieuw, client-side)
- `app/beheer-vlp-x9q2w/page.tsx` (nieuwe sectie)
- `app/actions/assetActions.ts` (dropdown-merge)
- `next.config.ts` (bodySizeLimit)
- Changelog bijwerken in `veluwedroomchalet/CLAUDE.md`
