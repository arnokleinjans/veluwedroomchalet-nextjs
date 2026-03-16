// Simple in-memory rate limiter for API routes
// Prevents runaway loops from consuming Vercel/Upstash quota

const requestCounts = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60_000; // 1 minute window
const MAX_REQUESTS = 30;  // Max 30 requests per minute per key

/**
 * Check if a request should be rate-limited.
 * Returns { allowed: true } or { allowed: false, retryAfterMs: number }
 */
export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const entry = requestCounts.get(key);

    if (!entry || now > entry.resetTime) {
        // Start a new window
        requestCounts.set(key, { count: 1, resetTime: now + WINDOW_MS });
        return { allowed: true };
    }

    if (entry.count >= MAX_REQUESTS) {
        return {
            allowed: false,
            retryAfterMs: entry.resetTime - now,
        };
    }

    entry.count++;
    return { allowed: true };
}
