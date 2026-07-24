"use server";

import fs from "fs";
import path from "path";
import { getAppDataFresh } from "../utils/db";

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"];

// Vaste, niet uit Redis afgeleide referenties naar afbeeldingen in de codebase zelf
// (CSS/favicon/fallback-defaults) — deze zijn altijd "in gebruik", ongeacht de content.
const HARDCODED_CODE_REFERENCES: Record<string, string> = {
    "Header.webp": "Achtergrond loginscherm (globals.css)",
    "Logo Veluwe Droom Chalet rond zonder tekst.webp": "Favicon/logo (layout.tsx)",
    "Boshuisje.webp": "Standaardwaarde in de code (db.ts fallback)",
    "Restaurant in een oogopslag.webp": "Standaardwaarde in de code (db.ts fallback)",
};

export type MediaImage = { name: string; sizeKB: number; sha?: string; isLive: boolean; previewUrl: string };
export type ImageUsage = { used: boolean; locations: string[] };

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "arnokleinjans/veluwedroomchalet-nextjs";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const GITHUB_IMAGES_DIR = "public/images";

export async function isGithubConfigured(): Promise<boolean> {
    return !!GITHUB_TOKEN;
}

async function ghFetch(method: "GET" | "PUT" | "DELETE", relativePath: string, body?: any) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${relativePath}`;
    return fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
    });
}

// Lichte sanitering: bestaande namen in dit project houden spaties/hoofdletters aan (bv.
// "Restaurant in een oogopslag.webp"), dus we forceren alleen dezelfde regel als beheer.py:
// eerste letter een hoofdletter, verder de naam intact, altijd .webp als extensie.
function sanitizeFileName(originalName: string): string {
    const withoutExt = originalName.replace(/\.[^/.]+$/, "").trim();
    const capitalized = withoutExt ? withoutExt.charAt(0).toUpperCase() + withoutExt.slice(1) : withoutExt;
    return `${capitalized}.webp`;
}

async function listMediaImagesFs(): Promise<{ name: string; sizeKB: number }[]> {
    const dir = path.join(process.cwd(), "public", "images");
    if (!fs.existsSync(dir)) return [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries
        .filter(e => e.isFile() && !e.name.startsWith(".") && IMAGE_EXTS.includes(path.extname(e.name).toLowerCase()))
        .map(e => e.name);

    return files.map(name => {
        const stat = fs.statSync(path.join(dir, name));
        return { name, sizeKB: Math.round(stat.size / 1024) };
    });
}

export async function listMediaImages(): Promise<MediaImage[]> {
    const fsFiles = await listMediaImagesFs();
    const fsNames = new Set(fsFiles.map(f => f.name));

    const withPreviewLocal = (f: { name: string; sizeKB: number }) => ({ ...f, isLive: true, previewUrl: `/images/${f.name}` });

    if (!GITHUB_TOKEN) {
        return fsFiles.map(withPreviewLocal).sort((a, b) => a.name.localeCompare(b.name));
    }

    try {
        const res = await ghFetch("GET", GITHUB_IMAGES_DIR);
        if (!res.ok) {
            return fsFiles.map(withPreviewLocal).sort((a, b) => a.name.localeCompare(b.name));
        }
        const items: any[] = await res.json();
        const ghFiles = Array.isArray(items)
            ? items.filter(i => i.type === "file" && IMAGE_EXTS.includes(path.extname(i.name).toLowerCase()))
            : [];

        return ghFiles
            .map(item => {
                const isLive = fsNames.has(item.name);
                return {
                    name: item.name as string,
                    sizeKB: Math.round((item.size || 0) / 1024),
                    sha: item.sha as string,
                    isLive,
                    // Nog niet live? Toon de net-gecommitte versie rechtstreeks vanaf GitHub
                    // (repo is publiek), zodat je 'm meteen ziet i.p.v. te wachten op de deploy.
                    previewUrl: isLive
                        ? `/images/${item.name}`
                        : `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/public/images/${encodeURIComponent(item.name)}`,
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
        return fsFiles.map(withPreviewLocal).sort((a, b) => a.name.localeCompare(b.name));
    }
}

// Lookup "images/Naam.webp" -> previewUrl, voor de bestaande plaatjekiezers (header/home-item/
// video/omgeving) die anders een kapot lokaal pad tonen zolang een verse upload nog niet lokaal
// op schijf staat (pas na git pull of een Vercel-deploy).
export async function getImagePreviewMap(): Promise<Record<string, string>> {
    const images = await listMediaImages();
    const map: Record<string, string> = {};
    for (const img of images) {
        map[`images/${img.name}`] = img.previewUrl;
    }
    return map;
}

function baseNameMatches(value: string | undefined | null, filename: string): boolean {
    if (!value) return false;
    return value.split("/").pop() === filename;
}

export async function getImageUsageMap(): Promise<Record<string, ImageUsage>> {
    const data = await getAppDataFresh() as any;
    const images = await listMediaImages();

    const usageMap: Record<string, string[]> = {};
    for (const img of images) usageMap[img.name] = [];

    const addUsage = (filename: string, label: string) => {
        if (usageMap[filename] && !usageMap[filename].includes(label)) {
            usageMap[filename].push(label);
        }
    };

    const scanLanguageBlock = (block: any, langSuffix: string) => {
        if (!block) return;
        for (const img of images) {
            const filename = img.name;

            if (baseNameMatches(block.property?.headerImage, filename)) {
                addUsage(filename, `Header afbeelding${langSuffix}`);
            }
            (block.videos || []).forEach((v: any) => {
                if (baseNameMatches(v?.thumb, filename)) {
                    addUsage(filename, `Video-thumbnail '${v.title}'${langSuffix}`);
                }
            });
            (block.omgeving || []).forEach((o: any) => {
                if (baseNameMatches(o?.image, filename)) {
                    addUsage(filename, `Omgeving-tip '${o.name}'${langSuffix}`);
                }
                if (typeof o?.desc === "string" && o.desc.includes(filename)) {
                    addUsage(filename, `Omgeving-tip '${o.name}' (in tekst)${langSuffix}`);
                }
            });
            (block.insights || []).forEach((i: any) => {
                if (baseNameMatches(i?.image, filename)) {
                    addUsage(filename, `Home-item '${i.title}'${langSuffix}`);
                }
                if (typeof i?.detailContent === "string" && i.detailContent.includes(filename)) {
                    addUsage(filename, `Home-item '${i.title}' (detailpagina)${langSuffix}`);
                }
            });
            if (typeof block.expiredPageContent === "string" && block.expiredPageContent.includes(filename)) {
                addUsage(filename, `Verlopen boeking pagina${langSuffix}`);
            }
        }
    };

    scanLanguageBlock(data, "");
    scanLanguageBlock(data.translations?.en, " (EN)");
    scanLanguageBlock(data.translations?.de, " (DE)");

    for (const [filename, label] of Object.entries(HARDCODED_CODE_REFERENCES)) {
        addUsage(filename, `${label} — vast in code`);
    }

    const result: Record<string, ImageUsage> = {};
    for (const img of images) {
        result[img.name] = { used: usageMap[img.name].length > 0, locations: usageMap[img.name] };
    }
    return result;
}

export type UploadResult =
    | { ok: true; fileName: string }
    | { ok: false; reason: "no-token" | "exists" | "error"; message?: string };

// base64 = de webp-inhoud, client-side al genormaliseerd (zie utils/imageNormalize.ts), zonder de
// "data:image/webp;base64," prefix. Net als alle andere admin-server-actions in dit project
// (updateInsights, updateOmgeving, ...) leunt dit puur op de client-side login-gate — geen
// losse PIN-parameter, want die verdween al na een pagina-herlaad (localStorage bewaart alleen
// het "ingelogd"-vlaggetje, niet de PIN zelf).
export async function uploadMediaImage(
    originalFileName: string,
    base64: string,
    mode: "new" | "overwrite" | "rename" = "new"
): Promise<UploadResult> {
    if (!GITHUB_TOKEN) return { ok: false, reason: "no-token" };

    let fileName = sanitizeFileName(originalFileName);
    let sha: string | undefined;

    const existing = await ghFetch("GET", `${GITHUB_IMAGES_DIR}/${encodeURIComponent(fileName)}`);
    if (existing.status === 200) {
        if (mode === "new") return { ok: false, reason: "exists" };

        if (mode === "rename") {
            const base = fileName.replace(/\.webp$/, "");
            let n = 1;
            let candidate = `${base}-${n}.webp`;
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const check = await ghFetch("GET", `${GITHUB_IMAGES_DIR}/${encodeURIComponent(candidate)}`);
                if (check.status === 404) break;
                n++;
                candidate = `${base}-${n}.webp`;
            }
            fileName = candidate;
        } else {
            // overwrite
            const data = await existing.json();
            sha = data.sha;
        }
    }

    const putRes = await ghFetch("PUT", `${GITHUB_IMAGES_DIR}/${encodeURIComponent(fileName)}`, {
        message: `Mediabibliotheek: upload ${fileName}`,
        content: base64,
        branch: GITHUB_BRANCH,
        ...(sha ? { sha } : {}),
    });

    if (!putRes.ok) {
        const errData = await putRes.json().catch(() => ({}));
        return { ok: false, reason: "error", message: errData.message || `HTTP ${putRes.status}` };
    }

    return { ok: true, fileName };
}

export type DeleteResult =
    | { ok: true }
    | { ok: false; reason: "no-token" | "in-use" | "not-found" | "error"; locations?: string[]; message?: string };

export async function deleteMediaImage(fileName: string): Promise<DeleteResult> {
    if (!GITHUB_TOKEN) return { ok: false, reason: "no-token" };

    // Defense in depth: nogmaals checken, ook al heeft de UI dit al gedaan.
    const usage = await getImageUsageMap();
    const info = usage[fileName];
    if (info && info.used) {
        return { ok: false, reason: "in-use", locations: info.locations };
    }

    const relPath = `${GITHUB_IMAGES_DIR}/${encodeURIComponent(fileName)}`;
    const getRes = await ghFetch("GET", relPath);
    if (getRes.status === 404) return { ok: false, reason: "not-found" };
    const data = await getRes.json();

    const delRes = await ghFetch("DELETE", relPath, {
        message: `Mediabibliotheek: verwijder ${fileName}`,
        sha: data.sha,
        branch: GITHUB_BRANCH,
    });

    if (!delRes.ok) {
        const errData = await delRes.json().catch(() => ({}));
        return { ok: false, reason: "error", message: errData.message || `HTTP ${delRes.status}` };
    }

    return { ok: true };
}
