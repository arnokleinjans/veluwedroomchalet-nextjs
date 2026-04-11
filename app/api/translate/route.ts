import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { checkRateLimit } from '../../utils/rateLimit';

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
        const { property, rules, videos, omgeving, insights } = payload;

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'AI API sleutel ontbreekt' }, { status: 500 });
        }

        const dataToTranslate = {
            property,
            rules,
            videos,
            omgeving,
            insights
        };

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const systemPrompt = `We provide a JSON object containing data for a holiday rental web app. 
Translate this exact JSON object into two languages: English (en) and German (de).
Return a SINGLE JSON object with exactly two root keys: "en" and "de". Both should contain the translated structure of the provided JSON.

CRITICAL RULES:
1. NEVER translate property keys (like "name", "desc", "url", "icon", "title"). Keep the exact same JSON structure.
2. ONLY translate the textual content values.
3. Do NOT translate URLs, image paths, widget codes, or standard identifiers/classes.
4. Keep HTML tags exactly as they are.
5. Keep placeholder variables like '@aankomst', '@vertrek', and '@naamgast' EXACTLY as is. Do not translate these tags.
6. Make sure to return strictly valid JSON without any markdown formatting wrappers (like \`\`\`json).

Here is the JSON to translate:
${JSON.stringify(dataToTranslate, null, 2)}`;

        let lastError: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                if (attempt > 0) {
                    await new Promise(r => setTimeout(r, 6000 * attempt));
                }
                const result = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
                    config: {
                        responseMimeType: "application/json"
                    }
                });

                const jsonResponse = result.text || '{}';
                const parsed = JSON.parse(jsonResponse);

                if (!parsed.en || !parsed.de) {
                     throw new Error('Response missing en or de keys');
                }

                return NextResponse.json(parsed);
            } catch (aiError: any) {
                lastError = aiError;
                console.error("Translation attempt failed", aiError);
                if (aiError?.status !== 429) break; // Only retry on rate limit
            }
        }

        const status = lastError?.status;
        if (status === 429) {
            return NextResponse.json({ error: 'AI rate limit bereikt. Wacht 30 seconden.' }, { status: 429 });
        } else {
            return NextResponse.json({ error: `AI fout: ${lastError?.message || 'Onbekende fout bij vertalen'}` }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Translate API error:', error);
        return NextResponse.json({ error: `Fout: ${error?.message || 'Er ging iets mis'}` }, { status: 500 });
    }
}
