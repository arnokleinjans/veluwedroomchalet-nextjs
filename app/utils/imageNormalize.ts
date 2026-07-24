// Client-side normalisatie: verkleinen naar max 1920px + omzetten naar webp (kwaliteit 85),
// dezelfde regels als beheer.py optie 9. Draait in de browser (canvas), niet op de server —
// Vercel's Node-runtime heeft geen sharp/libheif, en iOS Safari kan HEIC-foto's zelf al decoderen
// via createImageBitmap, dus dit werkt ook voor rechtstreekse iPhone-uploads.

export type NormalizeResult = { base64: string; blob: Blob; width: number; height: number };

const MAX_SIZE = 1920;
const QUALITY = 0.85;

export async function normalizeImageToWebp(file: File): Promise<NormalizeResult> {
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        throw new Error(`Kon "${file.name}" niet lezen — dit bestandsformaat wordt door deze browser niet ondersteund (bv. HEIC op desktop-Chrome). Probeer Safari, of converteer eerst naar JPG/PNG.`);
    }

    let { width, height } = bitmap;
    if (width > MAX_SIZE || height > MAX_SIZE) {
        const scale = MAX_SIZE / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D-context niet beschikbaar in deze browser.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
            b => (b ? resolve(b) : reject(new Error("Omzetten naar webp is mislukt."))),
            "image/webp",
            QUALITY
        );
    });

    if (blob.type !== "image/webp") {
        throw new Error("Deze browser kan geen webp genereren (Safari 17+, Chrome of Edge vereist).");
    }

    const base64 = await blobToBase64(blob);
    return { base64, blob, width, height };
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",").pop() || "");
        };
        reader.onerror = () => reject(new Error("Kon bestand niet lezen."));
        reader.readAsDataURL(blob);
    });
}
