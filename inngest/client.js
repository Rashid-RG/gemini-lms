import { Inngest } from "inngest";

const INNGEST_EVENT_KEY = process.env.INNGEST_EVENT_KEY;
const INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY;
const INNGEST_SIGNING_KEY_FALLBACK = process.env.INNGEST_SIGNING_KEY_FALLBACK;
const INNGEST_BASE_URL = process.env.INNGEST_BASE_URL?.trim();
const INNGEST_DEV = process.env.INNGEST_DEV === "1" || process.env.INNGEST_DEV?.toLowerCase() === "true";

// Create a client to send and receive events with explicit dev-mode config.
export const inngest = new Inngest({
	id: "easy-study-web-app",
	eventKey: INNGEST_EVENT_KEY,
	isDev: INNGEST_DEV,
	baseUrl: INNGEST_BASE_URL || (INNGEST_DEV ? "http://localhost:8288/" : undefined),
});

console.log('[INGEST CLIENT] env:', {
  INNGEST_DEV: INNGEST_DEV,
  INNGEST_BASE_URL: INNGEST_BASE_URL || 'default',
  INNGEST_EVENT_KEY: Boolean(INNGEST_EVENT_KEY),
  INNGEST_SIGNING_KEY: Boolean(INNGEST_SIGNING_KEY),
  INNGEST_SIGNING_KEY_FALLBACK: Boolean(INNGEST_SIGNING_KEY_FALLBACK),
});

if (INNGEST_SIGNING_KEY) {
	inngest.inngestApi.setSigningKey(INNGEST_SIGNING_KEY);
}

if (INNGEST_SIGNING_KEY_FALLBACK) {
	inngest.inngestApi.setSigningKeyFallback(INNGEST_SIGNING_KEY_FALLBACK);
}

if (!INNGEST_EVENT_KEY) {
	console.warn('INNGEST_EVENT_KEY is not configured. Inngest event sending may fail.');
}

// Wrap `send` to fail gracefully when no event key is configured
// (prevents unhandledRejection: "Event key not found" in dev environments)
if (typeof inngest.send === 'function') {
	const _origSend = inngest.send.bind(inngest);
	inngest.send = async (...args) => {
		try {
			return await _origSend(...args);
		} catch (err) {
			const msg = err && (err.message || (err.toString && err.toString()));
			if (msg && msg.toLowerCase().includes('event key not found')) {
				console.warn('Inngest event key not found. Skipping event send.');
				return null;
			}
			throw err;
		}
	};
}
