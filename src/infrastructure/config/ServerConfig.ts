import {
	ServerConfig as IServerConfig,
	Environment,
	LogLevel,
} from "./ConfigTypes.js";
import { ConfigurationError } from "../../core/errors/DomainErrors.js";

/**
 * Server configuration with defaults and environment loading
 */
export class ServerConfig implements IServerConfig {
	public readonly name: string;
	public readonly version: string;
	public readonly environment: Environment;
	public readonly logLevel: LogLevel;

	constructor(
		name: string = "anki-mcp-server",
		version: string = "1.0.0",
		environment: Environment = Environment.DEVELOPMENT,
		logLevel: LogLevel = LogLevel.INFO,
	) {
		this.name = name;
		this.version = version;
		this.environment = environment;
		this.logLevel = logLevel;

		this.validate();
	}

	/**
	 * Create ServerConfig from environment variables
	 */
	static fromEnvironment(): ServerConfig {
		return new ServerConfig(
			process.env.SERVER_NAME || "anki-mcp-server",
			process.env.SERVER_VERSION || "1.0.0",
			(process.env.NODE_ENV as Environment) || Environment.DEVELOPMENT,
			(process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
		);
	}

	/**
	 * Create ServerConfig from object
	 */
	static fromObject(config: Partial<IServerConfig>): ServerConfig {
		return new ServerConfig(
			config.name,
			config.version,
			config.environment,
			config.logLevel,
		);
	}

	/**
	 * Validate configuration values
	 */
	private validate(): void {
		const errors: string[] = [];

		// Validate name
		if (!this.name || this.name.trim().length === 0) {
			errors.push("Server name cannot be empty");
		}

		// Validate version format (basic semver check)
		const versionRegex = /^\d+\.\d+\.\d+/;
		if (!versionRegex.test(this.version)) {
			errors.push(
				`Invalid version format: ${this.version}. Expected semver format (e.g., 1.0.0)`,
			);
		}

		// Validate environment
		if (!Object.values(Environment).includes(this.environment)) {
			errors.push(
				`Invalid environment: ${
					this.environment
				}. Must be one of: ${Object.values(Environment).join(", ")}`,
			);
		}

		// Validate log level
		if (!Object.values(LogLevel).includes(this.logLevel)) {
			errors.push(
				`Invalid log level: ${this.logLevel}. Must be one of: ${Object.values(
					LogLevel,
				).join(", ")}`,
			);
		}

		if (errors.length > 0) {
			throw new ConfigurationError(
				`Server configuration validation failed: ${errors.join(", ")}`,
			);
		}
	}

	/**
	 * Check if running in development mode
	 */
	isDevelopment(): boolean {
		return this.environment === Environment.DEVELOPMENT;
	}

	/**
	 * Check if running in production mode
	 */
	isProduction(): boolean {
		return this.environment === Environment.PRODUCTION;
	}

	/**
	 * Check if running in test mode
	 */
	isTest(): boolean {
		return this.environment === Environment.TEST;
	}

	/**
	 * Get configuration as plain object
	 */
	toObject(): IServerConfig {
		return {
			name: this.name,
			version: this.version,
			environment: this.environment,
			logLevel: this.logLevel,
		};
	}
}
