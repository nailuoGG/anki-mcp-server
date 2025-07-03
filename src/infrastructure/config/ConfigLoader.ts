import {
	ApplicationConfig,
	LoggingConfig,
	LogLevel,
	LogFormat,
	LogDestination,
} from "./ConfigTypes.js";
import { AnkiConfig } from "./AnkiConfig.js";
import { ServerConfig } from "./ServerConfig.js";
import { CacheConfig } from "./CacheConfig.js";
import { ConfigurationError } from "../../core/errors/DomainErrors.js";

/**
 * Main configuration loader and manager
 */
export class ConfigLoader {
	private static instance: ConfigLoader;
	private config: ApplicationConfig | null = null;

	private constructor() {}

	/**
	 * Get singleton instance
	 */
	static getInstance(): ConfigLoader {
		if (!ConfigLoader.instance) {
			ConfigLoader.instance = new ConfigLoader();
		}
		return ConfigLoader.instance;
	}

	/**
	 * Load configuration from environment
	 */
	load(): ApplicationConfig {
		if (!this.config) {
			try {
				this.config = {
					anki: AnkiConfig.fromEnvironment(),
					server: ServerConfig.fromEnvironment(),
					cache: CacheConfig.fromEnvironment(),
					logging: this.createLoggingConfig(),
				};

				this.validateConfiguration(this.config);
			} catch (error) {
				throw new ConfigurationError(
					`Failed to load configuration: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		}
		return this.config;
	}

	/**
	 * Load configuration with overrides
	 */
	loadWithOverrides(overrides: Partial<ApplicationConfig>): ApplicationConfig {
		const baseConfig = this.load();

		this.config = {
			anki: overrides.anki
				? AnkiConfig.fromObject(overrides.anki)
				: baseConfig.anki,
			server: overrides.server
				? ServerConfig.fromObject(overrides.server)
				: baseConfig.server,
			cache: overrides.cache
				? CacheConfig.fromObject(overrides.cache)
				: baseConfig.cache,
			logging: overrides.logging ? overrides.logging : baseConfig.logging,
		};

		this.validateConfiguration(this.config);
		return this.config;
	}

	/**
	 * Get current configuration (must be loaded first)
	 */
	getConfig(): ApplicationConfig {
		if (!this.config) {
			throw new ConfigurationError(
				"Configuration not loaded. Call load() first.",
			);
		}
		return this.config;
	}

	/**
	 * Get Anki configuration
	 */
	getAnkiConfig(): AnkiConfig {
		return this.getConfig().anki as AnkiConfig;
	}

	/**
	 * Get server configuration
	 */
	getServerConfig(): ServerConfig {
		return this.getConfig().server as ServerConfig;
	}

	/**
	 * Get cache configuration
	 */
	getCacheConfig(): CacheConfig {
		return this.getConfig().cache as CacheConfig;
	}

	/**
	 * Get logging configuration
	 */
	getLoggingConfig(): LoggingConfig {
		return this.getConfig().logging;
	}

	/**
	 * Reset configuration (useful for testing)
	 */
	reset(): void {
		this.config = null;
	}

	/**
	 * Create logging configuration from environment
	 */
	private createLoggingConfig(): LoggingConfig {
		return {
			level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
			format: (process.env.LOG_FORMAT as LogFormat) || LogFormat.TEXT,
			destination:
				(process.env.LOG_DESTINATION as LogDestination) ||
				LogDestination.CONSOLE,
			includeStackTrace:
				process.env.LOG_INCLUDE_STACK_TRACE?.toLowerCase() === "true",
		};
	}

	/**
	 * Validate the complete configuration
	 */
	private validateConfiguration(config: ApplicationConfig): void {
		const errors: string[] = [];

		// Basic structure validation
		if (!config.anki) {
			errors.push("Anki configuration is required");
		}

		if (!config.server) {
			errors.push("Server configuration is required");
		}

		if (!config.cache) {
			errors.push("Cache configuration is required");
		}

		if (!config.logging) {
			errors.push("Logging configuration is required");
		}

		// Cross-configuration validation
		if (
			config.logging?.level === LogLevel.DEBUG &&
			!(config.server as ServerConfig)?.isDevelopment()
		) {
			// This is just a warning, not an error
			console.warn("DEBUG log level detected in non-development environment");
		}

		if (errors.length > 0) {
			throw new ConfigurationError(
				`Configuration validation failed: ${errors.join(", ")}`,
			);
		}
	}

	/**
	 * Export configuration to JSON
	 */
	toJSON(): string {
		const config = this.getConfig();

		// Create a safe version without sensitive data
		const safeConfig = {
			anki: {
				url: config.anki.url,
				apiVersion: config.anki.apiVersion,
				timeout: config.anki.timeout,
				retryAttempts: config.anki.retryAttempts,
				retryDelay: config.anki.retryDelay,
				defaultDeck: config.anki.defaultDeck,
			},
			server: config.server,
			cache: config.cache,
			logging: config.logging,
		};

		return JSON.stringify(safeConfig, null, 2);
	}
}

/**
 * Convenience functions for direct access
 */
export const getConfig = (): ApplicationConfig =>
	ConfigLoader.getInstance().load();
export const getAnkiConfig = (): AnkiConfig =>
	ConfigLoader.getInstance().getAnkiConfig();
export const getServerConfig = (): ServerConfig =>
	ConfigLoader.getInstance().getServerConfig();
export const getCacheConfig = (): CacheConfig =>
	ConfigLoader.getInstance().getCacheConfig();
export const getLoggingConfig = (): LoggingConfig =>
	ConfigLoader.getInstance().getLoggingConfig();
