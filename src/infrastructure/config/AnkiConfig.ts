import { AnkiConfig as IAnkiConfig } from "./ConfigTypes.js";
import { ConfigurationError } from "../../core/errors/DomainErrors.js";

/**
 * Anki configuration with defaults and environment loading
 */
export class AnkiConfig implements IAnkiConfig {
	public readonly url: string;
	public readonly apiVersion: number;
	public readonly timeout: number;
	public readonly retryAttempts: number;
	public readonly retryDelay: number;
	public readonly defaultDeck: string;

	/**
	 * Create AnkiConfig with explicit values
	 */
	constructor(
		url: string = "http://localhost:8765",
		apiVersion: number = 6,
		timeout: number = 5000,
		retryAttempts: number = 3,
		retryDelay: number = 1000,
		defaultDeck: string = "Default",
	) {
		this.url = url;
		this.apiVersion = apiVersion;
		this.timeout = timeout;
		this.retryAttempts = retryAttempts;
		this.retryDelay = retryDelay;
		this.defaultDeck = defaultDeck;

		this.validate();
	}

	/**
	 * Create AnkiConfig from environment variables
	 */
	static fromEnvironment(): AnkiConfig {
		return new AnkiConfig(
			process.env.ANKI_CONNECT_URL || "http://localhost:8765",
			parseInt(process.env.ANKI_API_VERSION || "6"),
			parseInt(process.env.ANKI_TIMEOUT || "5000"),
			parseInt(process.env.ANKI_RETRY_ATTEMPTS || "3"),
			parseInt(process.env.ANKI_RETRY_DELAY || "1000"),
			process.env.ANKI_DEFAULT_DECK || "Default",
		);
	}

	/**
	 * Create AnkiConfig from object
	 */
	static fromObject(config: Partial<IAnkiConfig>): AnkiConfig {
		return new AnkiConfig(
			config.url,
			config.apiVersion,
			config.timeout,
			config.retryAttempts,
			config.retryDelay,
			config.defaultDeck,
		);
	}

	/**
	 * Validate configuration values
	 */
	private validate(): void {
		const errors: string[] = [];

		// Validate URL
		try {
			new URL(this.url);
		} catch {
			errors.push(`Invalid Anki URL: ${this.url}`);
		}

		// Validate API version
		if (this.apiVersion < 1 || this.apiVersion > 10) {
			errors.push(
				`Invalid API version: ${this.apiVersion}. Must be between 1 and 10.`,
			);
		}

		// Validate timeout
		if (this.timeout < 1000 || this.timeout > 60000) {
			errors.push(
				`Invalid timeout: ${this.timeout}ms. Must be between 1000ms and 60000ms.`,
			);
		}

		// Validate retry attempts
		if (this.retryAttempts < 0 || this.retryAttempts > 10) {
			errors.push(
				`Invalid retry attempts: ${this.retryAttempts}. Must be between 0 and 10.`,
			);
		}

		// Validate retry delay
		if (this.retryDelay < 100 || this.retryDelay > 10000) {
			errors.push(
				`Invalid retry delay: ${this.retryDelay}ms. Must be between 100ms and 10000ms.`,
			);
		}

		// Validate default deck name
		if (!this.defaultDeck || this.defaultDeck.trim().length === 0) {
			errors.push("Default deck name cannot be empty");
		}

		if (errors.length > 0) {
			throw new ConfigurationError(
				`Anki configuration validation failed: ${errors.join(", ")}`,
			);
		}
	}

	/**
	 * Get configuration as plain object
	 */
	toObject(): IAnkiConfig {
		return {
			url: this.url,
			apiVersion: this.apiVersion,
			timeout: this.timeout,
			retryAttempts: this.retryAttempts,
			retryDelay: this.retryDelay,
			defaultDeck: this.defaultDeck,
		};
	}

	/**
	 * Create configuration with overrides
	 */
	withOverrides(overrides: Partial<IAnkiConfig>): AnkiConfig {
		return new AnkiConfig(
			overrides.url ?? this.url,
			overrides.apiVersion ?? this.apiVersion,
			overrides.timeout ?? this.timeout,
			overrides.retryAttempts ?? this.retryAttempts,
			overrides.retryDelay ?? this.retryDelay,
			overrides.defaultDeck ?? this.defaultDeck,
		);
	}
}
