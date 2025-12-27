import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "easy-study-web-app"});

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
				// Log a friendly warning and return null so callers can continue
				// without crashing when INNGEST event key is not configured.
				// This commonly happens in local dev when the env var is absent.
				// eslint-disable-next-line no-console
				console.warn('Inngest event key not found. Skipping event send.');
				return null;
			}
			throw err;
		}
	};
}
