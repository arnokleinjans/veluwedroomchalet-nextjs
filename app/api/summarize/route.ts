import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
    try {
        const { url, prompt, maxChars } = await req.json();
        const charLimit = Math.min(Math.max(maxChars || 4000, 500), 15000);

        if (!url) {
            return NextResponse.json({ error: 'URL is verplicht' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'AI API sleutel ontbreekt' }, { status: 500 });
        }

        // Step 1: Fetch the website content
        let pageText = '';
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; GreatStayBot/1.0)',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                signal: AbortSignal.timeout(10000),
            });
            const html = await response.text();

            // Strip HTML tags and get clean text (simple approach)
            pageText = html
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
                .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
                .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&[a-z]+;/gi, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, charLimit);
        } catch (fetchError) {
            return NextResponse.json({ error: 'Kon de website niet ophalen. Controleer de URL.' }, { status: 400 });
        }

        if (pageText.length < 50) {
            return NextResponse.json({ error: 'Kon niet genoeg tekst van de website halen.' }, { status: 400 });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const systemPrompt = prompt || `Je bent een assistent die websites samenvat voor een vakantie-app. Maak een aantrekkelijke, beknopte samenvatting in HTML-opmaak geschikt voor vakantiegasten.

Gebruik deze HTML-elementen:
- <h3> voor kopjes
- <p> voor alinea's 
- <ul><li> voor opsommingen
- <strong> voor belangrijke woorden
- <em> voor sfeervolle beschrijvingen

Houd het kort (max 200 woorden), uitnodigend en informatief. Schrijf in het Nederlands.`;

        // Try with retry for rate limits
        let lastError: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                if (attempt > 0) {
                    // Wait longer before retry (5s, then 10s)
                    await new Promise(r => setTimeout(r, 5000 * attempt));
                }
                const result = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nDit is de tekst van de website:\n\n${pageText}` }] }],
                });

                const summary = result.text || '';
                const cleanSummary = summary
                    .replace(/^```html\s*/i, '')
                    .replace(/```\s*$/i, '')
                    .trim();

                return NextResponse.json({ summary: cleanSummary });
            } catch (aiError: any) {
                lastError = aiError;
                if (aiError?.status !== 429) break; // Only retry on rate limit
            }
        }

        // Specific error messages
        const status = lastError?.status;
        if (status === 429) {
            return NextResponse.json({ error: 'AI rate limit bereikt. Wacht 30 seconden en probeer het opnieuw.' }, { status: 429 });
        } else if (status === 401 || status === 403) {
            return NextResponse.json({ error: 'AI API sleutel ongeldig of verlopen.' }, { status: 401 });
        } else {
            console.error('Summarize AI error:', lastError);
            return NextResponse.json({ error: `AI fout: ${lastError?.message || 'Onbekende fout'}` }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Summarize error:', error);
        return NextResponse.json({ error: `Fout: ${error?.message || 'Er ging iets mis'}` }, { status: 500 });
    }
}
