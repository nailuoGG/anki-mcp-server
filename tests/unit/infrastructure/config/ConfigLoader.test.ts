import { ConfigLoader } from '../../../../src/infrastructure/config/ConfigLoader.js';
import { AnkiConfig } from '../../../../src/infrastructure/config/AnkiConfig.js';
import { ServerConfig } from '../../../../src/infrastructure/config/ServerConfig.js';
import { CacheConfig } from '../../../../src/infrastructure/config/CacheConfig.js';
import { Environment, LogLevel } from '../../../../src/infrastructure/config/ConfigTypes.js';

describe('ConfigLoader', () => {
	beforeEach(() => {
		// Reset singleton instance for each test
		ConfigLoader.getInstance().reset();
	});

	describe('load', () => {
		it('should load configuration from environment', () => {
			const configLoader = ConfigLoader.getInstance();
			const config = configLoader.load();

			expect(config).toBeValidConfiguration();
			expect(config.anki).toBeInstanceOf(AnkiConfig);
			expect(config.server).toBeInstanceOf(ServerConfig);
			expect(config.cache).toBeInstanceOf(CacheConfig);
		});

		it('should return the same instance on subsequent calls', () => {
			const configLoader = ConfigLoader.getInstance();
			const config1 = configLoader.load();
			const config2 = configLoader.load();

			expect(config1).toBe(config2);
		});

		it('should validate configuration structure', () => {
			const configLoader = ConfigLoader.getInstance();
			const config = configLoader.load();

			// Anki configuration
			expect(config.anki.url).toBe('http://localhost:8765');
			expect(config.anki.apiVersion).toBe(6);
			expect(config.anki.defaultDeck).toBe('Test');

			// Server configuration
			expect(config.server.name).toBe('anki-mcp-server');
			expect(config.server.environment).toBe(Environment.TEST);

			// Cache configuration
			expect(config.cache.enabled).toBe(false);

			// Logging configuration
			expect(config.logging.level).toBe(LogLevel.ERROR);
		});
	});

	describe('loadWithOverrides', () => {
		it('should apply overrides to base configuration', () => {
			const configLoader = ConfigLoader.getInstance();
			
			const overrides = {
				anki: new AnkiConfig('http://test:9999', 7, 10000, 5, 2000, 'TestDeck')
			};

			const config = configLoader.loadWithOverrides(overrides);

			expect(config.anki.url).toBe('http://test:9999');
			expect(config.anki.apiVersion).toBe(7);
			expect(config.anki.timeout).toBe(10000);
			expect(config.anki.defaultDeck).toBe('TestDeck');

			// Other configs should remain unchanged
			expect(config.server.environment).toBe(Environment.TEST);
			expect(config.cache.enabled).toBe(false);
		});
	});

	describe('convenience methods', () => {
		it('should provide direct access to specific configurations', () => {
			const configLoader = ConfigLoader.getInstance();
			configLoader.load();

			const ankiConfig = configLoader.getAnkiConfig();
			const serverConfig = configLoader.getServerConfig();
			const cacheConfig = configLoader.getCacheConfig();
			const loggingConfig = configLoader.getLoggingConfig();

			expect(ankiConfig).toBeInstanceOf(AnkiConfig);
			expect(serverConfig).toBeInstanceOf(ServerConfig);
			expect(cacheConfig).toBeInstanceOf(CacheConfig);
			expect(loggingConfig).toBeDefined();
		});

		it('should throw error when accessing config before loading', () => {
			const configLoader = ConfigLoader.getInstance();

			expect(() => configLoader.getConfig()).toThrow('Configuration not loaded');
		});
	});

	describe('toJSON', () => {
		it('should export configuration as JSON without sensitive data', () => {
			const configLoader = ConfigLoader.getInstance();
			configLoader.load();

			const json = configLoader.toJSON();
			const parsed = JSON.parse(json);

			expect(parsed).toHaveProperty('anki');
			expect(parsed).toHaveProperty('server');
			expect(parsed).toHaveProperty('cache');
			expect(parsed).toHaveProperty('logging');

			// Should include public anki config
			expect(parsed.anki).toHaveProperty('url');
			expect(parsed.anki).toHaveProperty('apiVersion');
			expect(parsed.anki).toHaveProperty('defaultDeck');
		});
	});

	describe('singleton behavior', () => {
		it('should return the same instance', () => {
			const instance1 = ConfigLoader.getInstance();
			const instance2 = ConfigLoader.getInstance();

			expect(instance1).toBe(instance2);
		});
	});
});