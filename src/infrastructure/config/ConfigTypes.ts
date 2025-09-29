/**
 * Main application configuration interface
 */
export interface ApplicationConfig {
	anki: AnkiConfig;
	server: ServerConfig;
	cache: CacheConfig;
	logging: LoggingConfig;
}

/**
 * Anki-specific configuration
 */
export interface AnkiConfig {
	readonly url: string;
	readonly apiVersion: number;
	readonly timeout: number;
	readonly retryAttempts: number;
	readonly retryDelay: number;
	readonly defaultDeck: string;
}

/**
 * Server configuration
 */
export interface ServerConfig {
	readonly name: string;
	readonly version: string;
	readonly environment: Environment;
	readonly logLevel: LogLevel;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
	readonly enabled: boolean;
	readonly defaultTtl: number;
	readonly maxSize: number;
	readonly cleanupInterval: number;
	readonly performanceMonitoring: boolean;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
	readonly level: LogLevel;
	readonly format: LogFormat;
	readonly destination: LogDestination;
	readonly includeStackTrace: boolean;
}

/**
 * Environment types
 */
export enum Environment {
	DEVELOPMENT = "development",
	STAGING = "staging",
	PRODUCTION = "production",
	TEST = "test",
}

/**
 * Log levels
 */
export enum LogLevel {
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
	FATAL = "fatal",
}

/**
 * Log formats
 */
export enum LogFormat {
	JSON = "json",
	TEXT = "text",
	STRUCTURED = "structured",
}

/**
 * Log destinations
 */
export enum LogDestination {
	CONSOLE = "console",
	FILE = "file",
	BOTH = "both",
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
}
