import { cookies } from "next/headers";
import { TEST_COOKIE, leesTestKeuze, pasTestKeuzeToe, TestKeuze } from "./testModus";

// Server-kant van de testmodus. Staat los van testModus.ts zodat dat bestand
// bruikbaar blijft in de client-component van de testbalk.
export async function metTestOverride<T extends Record<string, any>>(
    booking: T | null | undefined
): Promise<{ booking: T | null, keuze: TestKeuze | null }> {
    if (!booking || !(booking as any).isTest) {
        return { booking: booking ?? null, keuze: null };
    }
    const keuze = leesTestKeuze((await cookies()).get(TEST_COOKIE)?.value);
    return { booking: pasTestKeuzeToe(booking, keuze), keuze };
}
