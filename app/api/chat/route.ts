import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getAppData } from '../../utils/db';

export async function POST(req: Request) {
    try {
        const { message, history, guestContext } = await req.json();

        // Fallback for direct testing if guestContext is missing
        const guestName = guestContext?.name || "Gast";
        const checkIn = guestContext?.checkIn || "onbekend";
        const checkOut = guestContext?.checkOut || "onbekend";

        // Fetch live Database context
        const appData = await getAppData();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { reply: "Ik ben momenteel even buiten gebruik (API sleutel ontbreekt)." },
                { status: 500 }
            );
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Build the system context instructing the AI on how to behave
        const systemInstruction = `
Je bent de digitale conciërge van "${appData.property.name}".
Je spreekt rechtstreeks met de gast(en): ${guestName}. 
Ze verblijven hier van ${checkIn} t/m ${checkOut}.

Hier zijn de regels en gegevens van het huisje waar je ze mee kunt helpen:
- Wifi netwerk: ${appData.property.wifi.network}
- Wifi wachtwoord: ${appData.property.wifi.password}

Huisregels:
${appData.rules.map(r => `- ${r.title}: ${r.desc}`).join('\n')}

Informatie over het chalet en park (Home pagina):
${appData.insights.map(i => `- ${i.title}: ${i.subtitle}`).join('\n')}

Tips in de omgeving:
${((appData as any).omgeving || (appData as any).restaurants || []).map((r: any) => `- ${r.name}: ${r.desc}`).join('\n')}

Instructies voor jou:
1. Reageer super vriendelijk, kort en bondig (alsof je via WhatsApp praat).
2. Geef uitsluitend informatie die in de regels hierboven staat. Verzin geen dingen over het huisje.
3. Als de gast vraagt om te bellen of iets vraagt waar je geen antwoord op weet in de context, zeg dan dat ze contact op kunnen nemen met de host: ${appData.property.host.name} (Tel: ${appData.property.host.phone}).

Extra kennis en context over het huisje:
${appData.chatbotContext || "Geen extra context beschikbaar."}
`;

        // Map the old history (if any) to the format required by the latest SDK
        const pastInteractions = history
            ? history.map((msg: any) => `[${msg.role === 'user' ? 'Gast' : 'Conciërge'}]: ${msg.content}`).join('\n')
            : "Geen eerdere berichten.";

        // Provide the combined prompt to Gemini
        const prompt = `
[CONTEXT INSTRUCTIES]
${systemInstruction}

[GESPREKSHISTORIE]
${pastInteractions}

[NIEUWE VRAAG VAN GAST]
${message}

Reageer direct op de nieuwe vraag, als de Conciërge. Begin niet met "Conciërge:" maar geef gewoon het antwoord.
`;

        // Await response from Gemini Flash 2.5
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return NextResponse.json({ reply: response.text });
    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json(
            { reply: "Oei, mijn hersens werken even niet mee. Vraag het heel even aan Arno!" },
            { status: 500 }
        );
    }
}
