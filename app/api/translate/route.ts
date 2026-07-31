import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { checkRateLimit } from '../../utils/rateLimit';
import { VERTAALTALEN } from '../../utils/talen';

export async function POST(req: Request) {
    const limit = checkRateLimit('translate-api');
    if (!limit.allowed) {
        return NextResponse.json(
            { error: `Te veel verzoeken. Probeer het over ${Math.ceil((limit.retryAfterMs || 0) / 1000)} seconden opnieuw.` },
            { status: 429 }
        );
    }

    try {
        const payload = await req.json();
        const { property, rules, videos, omgeving, insights, expiredPageContent, talen } = payload;

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'AI API sleutel ontbreekt' }, { status: 500 });
        }

        const gevraagd = (Array.isArray(talen) && talen.length ? talen : VERTAALTALEN.map(t => t.code))
            .map((code: string) => VERTAALTALEN.find(t => t.code === code))
            .filter(Boolean) as typeof VERTAALTALEN;

        const dataToTranslate = { property, rules, videos, omgeving, insights, expiredPageContent };
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const maakPrompt = (engels: string) => `We provide a JSON object containing data for a holiday rental web app.
Translate this exact JSON object into ${engels}.
Return a SINGLE JSON object with the translated structure of the provided JSON, without any wrapper key.

CRITICAL RULES:
1. NEVER translate property keys (like "name", "desc", "url", "icon", "title"). Keep the exact same JSON structure.
2. ONLY translate the textual content values.
3. Do NOT translate URLs, image paths, widget codes, or standard identifiers/classes.
4. Keep HTML tags exactly as they are.
5. Keep placeholder variables like '@aankomst', '@vertrek', and '@naamgast' EXACTLY as is. Do not translate these tags.
6. Do NOT use gender-ambiguous constructs like "Liebe/r" or "Sehr geehrte/r". Always pick one natural, friendly form.
7. Keep the Dutch word "slagboompas" as is: that is the name printed on the physical pass the guest receives.
8. Make sure to return strictly valid JSON without any markdown formatting wrappers (like \`\`\`json).

Here is the JSON to translate:
${JSON.stringify(dataToTranslate, null, 2)}`;

        // Eén aanroep per taal. Vier talen in één antwoord loopt tegen de
        // uitvoerlimiet aan, en zo kan een mislukte taal apart opnieuw.
        const vertaalEen = async (code: string, engels: string) => {
            let laatsteFout: any = null;
            for (let poging = 0; poging < 3; poging++) {
                try {
                    if (poging > 0) await new Promise(r => setTimeout(r, 6000 * poging));
                    const result = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: [{ role: 'user', parts: [{ text: maakPrompt(engels) }] }],
                        config: { responseMimeType: 'application/json' }
                    });
                    return JSON.parse(result.text || '{}');
                } catch (fout: any) {
                    laatsteFout = fout;
                    console.error(`Vertaling ${code} mislukt (poging ${poging + 1})`, fout);
                    if (fout?.status !== 429) break;
                }
            }
            throw laatsteFout || new Error(`Vertalen naar ${engels} mislukt`);
        };

        const resultaat: Record<string, any> = {};
        const mislukt: string[] = [];
        for (const taal of gevraagd) {
            try {
                resultaat[taal.code] = await vertaalEen(taal.code, taal.engels);
            } catch {
                mislukt.push(taal.naam);
            }
        }

        if (Object.keys(resultaat).length === 0) {
            return NextResponse.json(
                { error: `Vertalen mislukt${mislukt.length ? ` (${mislukt.join(', ')})` : ''}` },
                { status: 502 }
            );
        }

        return NextResponse.json({ ...resultaat, mislukt });
    } catch (error: any) {
        console.error('Translate API error:', error);
        return NextResponse.json({ error: `Fout: ${error?.message || 'Er ging iets mis'}` }, { status: 500 });
    }
}
