import { CacheConfig as ICacheConfig } from "./ConfigTypes.js";
import { ConfigurationError } from "../../core/errors/DomainErrors.js";

/**
 * Cache configuration with defaults and environment loading
 */
export class CacheConfig implements ICacheConfig {
	public readonly enabled: boolean;
	public readonly defaultTtl: number;
	public readonly maxSize: number;
	public readonly cleanupInterval: number;
	public readonly performanceMonitoring: boolean;

	constructor(
		enabled: boolean = true,
		defaultTtl: number = 300000, // 5 minutes
		maxSize: number = 1000,
		cleanupInterval: number = 300000, // 5 minutes
		performanceMonitoring: boolean = true,
	) {
		this.enabled = enabled;
		this.defaultTtl = defaultTtl;
		this.maxSize = maxSize;
		this.cleanupInterval = cleanupInterval;
		this.performanceMonitoring = performanceMonitoring;

		this.validate();
	}

	/**
	 * Create CacheConfig from environment variables
	 */
	static fromEnvironment(): CacheConfig {
		return new CacheConfig(
			process.env.CACHE_ENABLED?.toLowerCase() !== "false",
			parseInt(process.env.CACHE_DEFAULT_TTL || "300000"),
			parseInt(process.env.CACHE_MAX_SIZE || "1000"),
			parseInt(process.env.CACHE_CLEANUP_INTERVAL || "300000"),
			process.env.CACHE_PERFORMANCE_MONITORING?.toLowerCase() !== "false",
		);
	}

	/**
	 * Create CacheConfig from object
	 */
	static fromObject(config: Partial<ICacheConfig>): CacheConfig {
		return new CacheConfig(
			config.enabled,
			config.defaultTtl,
			config.maxSize,
			config.cleanupInterval,
			config.performanceMonitoring,
		);
	}

	/**
	 * Validate configuration values
	 */
	private validate(): void {
		const errors: string[] = [];

		// Validate TTL
		if (this.defaultTtl < 1000 || this.defaultTtl > 3600000) {
			// 1 second to 1 hour
			errors.push(
				`Invalid default TTL: ${this.defaultTtl}ms. Must be between 1000ms and 3600000ms.`,
			);
		}

		// Validate max size
		if (this.maxSize < 10 || this.maxSize > 100000) {
			errors.push(
				`Invalid max size: ${this.maxSize}. Must be between 10 and 100000.`,
			);
		}

		// Validate cleanup interval
		if (this.cleanupInterval < 10000 || this.cleanupInterval > 3600000) {
			// 10 seconds to 1 hour
			errors.push(
				`Invalid cleanup interval: ${this.cleanupInterval}ms. Must be between 10000ms and 3600000ms.`,
			);
		}

		if (errors.length > 0) {
			throw new ConfigurationError(
				`Cache configuration validation failed: ${errors.join(", ")}`,
			);
		}
	}

	/**
	 * Get configuration as plain object
	 */
	toObject(): ICacheConfig {
		return {
			enabled: this.enabled,
			defaultTtl: this.defaultTtl,
			maxSize: this.maxSize,
			cleanupInterval: this.cleanupInterval,
			performanceMonitoring: this.performanceMonitoring,
		};
	}

	/**
	 * Create disabled cache configuration
	 */
	static disabled(): CacheConfig {
		return new CacheConfig(false, 0, 0, 0, false);
	}
}
