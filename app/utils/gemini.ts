import { ThinkingLevel } from '@google/genai';

export const GEMINI_MODEL = 'gemini-3.5-flash-lite';

// Gemini 3 denkt standaard op 'medium': zes seconden voor een simpele groet.
export const GEMINI_THINKING = { thinkingLevel: ThinkingLevel.LOW };
