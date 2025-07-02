/**
 * Cache Manager - provides intelligent caching functionality to improve performance
 */
export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number; // Time to live (milliseconds)
}

export class CacheManager {
	private cache = new Map<string, CacheEntry<any>>();
	private defaultTTL = 5 * 60 * 1000; // Default 5 minutes

	/**
	 * Get cache entry
	 */
	get<T>(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		// Check if expired
		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	/**
	 * Set cache entry
	 */
	set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl,
		});
	}

	/**
	 * Delete cache entry
	 */
	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	/**
	 * Batch delete cache entries (by prefix)
	 */
	deleteByPrefix(prefix: string): void {
		for (const key of this.cache.keys()) {
			if (key.startsWith(prefix)) {
				this.cache.delete(key);
			}
		}
	}

	/**
	 * Clean up expired cache entries
	 */
	cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > entry.ttl) {
				this.cache.delete(key);
			}
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		totalEntries: number;
		expiredEntries: number;
		memoryUsage: string;
	} {
		const now = Date.now();
		let expiredCount = 0;

		for (const entry of this.cache.values()) {
			if (now - entry.timestamp > entry.ttl) {
				expiredCount++;
			}
		}

		return {
			totalEntries: this.cache.size,
			expiredEntries: expiredCount,
			memoryUsage: `${(
				JSON.stringify([...this.cache.values()]).length / 1024
			).toFixed(2)} KB`,
		};
	}

	/**
	 * Clear all cache entries
	 */
	clear(): void {
		this.cache.clear();
	}
}

/**
 * Performance Monitor - monitors operation performance and provides optimization suggestions
 */
export class PerformanceMonitor {
	private operations = new Map<
		string,
		{
			count: number;
			totalTime: number;
			avgTime: number;
			maxTime: number;
			minTime: number;
			lastRun: number;
		}
	>();

	/**
	 * Record operation start
	 */
	startOperation(operationName: string): () => void {
		const startTime = Date.now();

		return () => {
			const endTime = Date.now();
			const duration = endTime - startTime;
			this.recordOperation(operationName, duration);
		};
	}

	/**
	 * Record operation performance
	 */
	private recordOperation(name: string, duration: number): void {
		const existing = this.operations.get(name);

		if (existing) {
			existing.count++;
			existing.totalTime += duration;
			existing.avgTime = existing.totalTime / existing.count;
			existing.maxTime = Math.max(existing.maxTime, duration);
			existing.minTime = Math.min(existing.minTime, duration);
			existing.lastRun = Date.now();
		} else {
			this.operations.set(name, {
				count: 1,
				totalTime: duration,
				avgTime: duration,
				maxTime: duration,
				minTime: duration,
				lastRun: Date.now(),
			});
		}
	}

	/**
	 * Get performance statistics
	 */
	getStats(operationName?: string): any {
		if (operationName) {
			return this.operations.get(operationName) || null;
		}

		const stats = Object.fromEntries(this.operations.entries());
		const sortedByAvgTime = Object.entries(stats).sort(
			([, a], [, b]) => b.avgTime - a.avgTime,
		);

		return {
			operations: stats,
			slowestOperations: sortedByAvgTime.slice(0, 5),
			totalOperations: Array.from(this.operations.values()).reduce(
				(sum, op) => sum + op.count,
				0,
			),
		};
	}

	/**
	 * Get performance optimization suggestions
	 */
	getOptimizationSuggestions(): string[] {
		const suggestions = [];
		const stats = Array.from(this.operations.entries());

		// Identify slow operations
		const slowOps = stats.filter(([, stat]) => stat.avgTime > 1000);
		if (slowOps.length > 0) {
			suggestions.push(
				`Found ${slowOps.length} slow operations with average time > 1s, recommend optimization`,
			);
		}

		// Identify frequent operations
		const frequentOps = stats.filter(([, stat]) => stat.count > 50);
		if (frequentOps.length > 0) {
			suggestions.push(
				`Found ${frequentOps.length} high-frequency operations, consider cache optimization`,
			);
		}

		// Check performance fluctuations
		const unstableOps = stats.filter(
			([, stat]) => stat.maxTime > stat.avgTime * 3 && stat.count > 5,
		);
		if (unstableOps.length > 0) {
			suggestions.push(
				`Found ${unstableOps.length} operations with unstable performance, recommend checking implementation`,
			);
		}

		return suggestions.length > 0
			? suggestions
			: ["Performance is good, no special optimization needed"];
	}

	/**
	 * Reset statistics data
	 */
	reset(): void {
		this.operations.clear();
	}
}

/**
 * Batch Operation Optimizer - optimizes batch data processing
 */
export class BatchOptimizer {
	private batchSize = 50; // Default batch size
	private maxConcurrency = 3; // Maximum concurrency

	/**
	 * Process array data in batches
	 */
	async processBatch<T, R>(
		items: T[],
		processor: (batch: T[]) => Promise<R[]>,
		options?: {
			batchSize?: number;
			maxConcurrency?: number;
			onProgress?: (completed: number, total: number) => void;
		},
	): Promise<R[]> {
		const {
			batchSize = this.batchSize,
			maxConcurrency = this.maxConcurrency,
			onProgress,
		} = options || {};

		const batches: T[][] = [];
		for (let i = 0; i < items.length; i += batchSize) {
			batches.push(items.slice(i, i + batchSize));
		}

		const results: R[] = [];
		let completed = 0;

		// Process batches concurrently
		const processQueue = async (batchQueue: T[][]): Promise<void> => {
			while (batchQueue.length > 0) {
				const batch = batchQueue.shift();
				if (!batch) break;

				try {
					const batchResults = await processor(batch);
					results.push(...batchResults);
					completed += batch.length;

					if (onProgress) {
						onProgress(completed, items.length);
					}
				} catch (error) {
					console.error("Batch processing error:", error);
					// Continue processing other batches
				}
			}
		};

		// Create concurrent work queue
		const workers = Array.from(
			{ length: Math.min(maxConcurrency, batches.length) },
			() => processQueue([...batches]),
		);

		await Promise.all(workers);
		return results;
	}

	/**
	 * Adaptive batch size
	 */
	async adaptiveBatch<T, R>(
		items: T[],
		processor: (batch: T[]) => Promise<R[]>,
		targetLatency: number = 500, // Target latency (milliseconds)
	): Promise<R[]> {
		let currentBatchSize = this.batchSize;
		const results: R[] = [];

		for (let i = 0; i < items.length; i += currentBatchSize) {
			const batch = items.slice(i, i + currentBatchSize);
			const startTime = Date.now();

			try {
				const batchResults = await processor(batch);
				results.push(...batchResults);

				const duration = Date.now() - startTime;

				// Adaptively adjust batch size
				if (duration < targetLatency / 2 && currentBatchSize < 100) {
					currentBatchSize = Math.min(currentBatchSize * 1.5, 100);
				} else if (duration > targetLatency && currentBatchSize > 10) {
					currentBatchSize = Math.max(currentBatchSize * 0.8, 10);
				}
			} catch (error) {
				console.error("Adaptive batch processing error:", error);
				// Reduce batch size and retry
				currentBatchSize = Math.max(currentBatchSize / 2, 1);
				i -= currentBatchSize; // Retry current batch
			}
		}

		return results;
	}
}

/**
 * Singleton cache manager instance
 */
export const globalCache = new CacheManager();

/**
 * Singleton performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * Singleton batch optimizer instance
 */
export const globalBatchOptimizer = new BatchOptimizer();
