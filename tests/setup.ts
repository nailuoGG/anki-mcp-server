/**
 * Test setup and global configuration for Jest
 */

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.ANKI_CONNECT_URL = 'http://localhost:8765';
process.env.ANKI_API_VERSION = '6';
process.env.ANKI_TIMEOUT = '5000';
process.env.ANKI_RETRY_ATTEMPTS = '3';
process.env.ANKI_RETRY_DELAY = '1000';
process.env.ANKI_DEFAULT_DECK = 'Test';
process.env.LOG_LEVEL = 'error';
process.env.CACHE_ENABLED = 'false';

// Global test utilities can be added here
declare global {
	namespace jest {
		interface Matchers<R> {
			toBeValidConfiguration(): R;
		}
	}
}

// Custom matchers for configuration validation
expect.extend({
	toBeValidConfiguration(received: any) {
		const isValid = received && 
			typeof received === 'object' &&
			received.anki &&
			received.server &&
			received.cache &&
			received.logging;

		if (isValid) {
			return {
				message: () => `expected ${received} not to be a valid configuration`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${received} to be a valid configuration`,
				pass: false,
			};
		}
	},
});

export {};