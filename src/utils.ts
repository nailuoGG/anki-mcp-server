/**
 * Utility functions and anti-corruption layer for yanki-connect
 */
import { YankiConnect } from "yanki-connect";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { globalCache, globalPerformanceMonitor } from "./cacheManager.js";

/**
 * Custom error types for Anki operations
 */
export class AnkiConnectionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AnkiConnectionError";
	}
}

export class AnkiTimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AnkiTimeoutError";
	}
}

export class AnkiApiError extends Error {
	constructor(
		message: string,
		public code?: string,
	) {
		super(message);
		this.name = "AnkiApiError";
	}
}

/**
 * Configuration for the Anki client
 */
export interface AnkiConfig {
	ankiConnectUrl: string;
	apiVersion: number;
	timeout: number;
	retryTimeout: number;
	defaultDeck: string;
	enableCache: boolean;
	enablePerformanceMonitoring: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: AnkiConfig = {
	ankiConnectUrl: "http://localhost:8765",
	apiVersion: 6 as const,
	timeout: 5000,
	retryTimeout: 10000,
	defaultDeck: "Default",
	enableCache: true,
	enablePerformanceMonitoring: true,
};

/**
 * Anti-corruption layer for yanki-connect
 * Provides a stable interface to interact with Anki
 */
export class AnkiClient {
	private client: YankiConnect;
	private config: AnkiConfig;

	/**
	 * Create a new AnkiClient
	 *
	 * @param config Optional configuration
	 */
	constructor(config: Partial<AnkiConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.client = new YankiConnect();

		// Periodic cache cleanup
		if (this.config.enableCache) {
			setInterval(
				() => {
					globalCache.cleanup();
				},
				5 * 60 * 1000,
			); // Clean up every 5 minutes
		}
	}

	/**
	 * Execute a request with retry logic and performance monitoring
	 *
	 * @param operation Function to execute
	 * @param operationName Name for performance monitoring
	 * @param maxRetries Maximum number of retries
	 * @returns Promise with the result
	 */
	private async executeWithRetry<T>(
		operation: () => Promise<T>,
		operationName: string = "unknown",
		maxRetries = 1,
	): Promise<T> {
		let stopTimer: (() => void) | null = null;

		// Start performance monitoring
		if (this.config.enablePerformanceMonitoring) {
			stopTimer = globalPerformanceMonitor.startOperation(operationName);
		}

		let lastError: Error | null = null;

		try {
			for (let attempt = 0; attempt <= maxRetries; attempt++) {
				try {
					const result = await operation();
					return result;
				} catch (error) {
					lastError = this.normalizeError(error);

					// Don't wait on the last attempt
					if (attempt < maxRetries) {
						// Exponential backoff
						const delay = Math.min(
							1000 * Math.pow(2, attempt),
							this.config.retryTimeout,
						);
						await new Promise((resolve) => setTimeout(resolve, delay));
					}
				}
			}

			// If we get here, all attempts failed
			throw lastError || new AnkiConnectionError("Unknown error occurred");
		} finally {
			// Stop performance monitoring
			if (stopTimer) {
				stopTimer();
			}
		}
	}

	/**
	 * Execute with caching support
	 */
	private async executeWithCache<T>(
		cacheKey: string,
		operation: () => Promise<T>,
		operationName: string,
		ttl: number = 5 * 60 * 1000, // 5-minute default cache
	): Promise<T> {
		// Try to get from cache
		if (this.config.enableCache) {
			const cached = globalCache.get<T>(cacheKey);
			if (cached !== null) {
				return cached;
			}
		}

		// Execute operation
		const result = await this.executeWithRetry(operation, operationName);

		// Cache result
		if (this.config.enableCache) {
			globalCache.set(cacheKey, result, ttl);
		}

		return result;
	}

	/**
	 * Normalize errors from yanki-connect
	 */
	private normalizeError(error: unknown): Error {
		if (error instanceof Error) {
			// Connection errors
			if (error.message.includes("ECONNREFUSED")) {
				return new AnkiConnectionError(
					"Anki is not running. Please start Anki and ensure AnkiConnect plugin is enabled.",
				);
			}

			// Timeout errors
			if (
				error.message.includes("timeout") ||
				error.message.includes("ETIMEDOUT")
			) {
				return new AnkiTimeoutError(
					"Connection to Anki timed out. Please check if Anki is responsive.",
				);
			}

			// API errors
			if (error.message.includes("collection unavailable")) {
				return new AnkiApiError(
					"Anki collection is unavailable. Please close any open dialogs in Anki.",
				);
			}

			return error;
		}

		return new Error(String(error));
	}

	/**
	 * Convert client errors to MCP errors
	 */
	private wrapError(error: Error): McpError {
		if (error instanceof AnkiConnectionError) {
			return new McpError(ErrorCode.InternalError, error.message);
		}

		if (error instanceof AnkiTimeoutError) {
			return new McpError(ErrorCode.InternalError, error.message);
		}

		if (error instanceof AnkiApiError) {
			return new McpError(ErrorCode.InternalError, error.message);
		}

		return new McpError(
			ErrorCode.InternalError,
			`Anki error: ${error.message}`,
		);
	}

	/**
	 * Check if Anki is available
	 */
	async checkConnection(): Promise<boolean> {
		try {
			// Use a direct axios call to check connection since version() is private
			await this.executeWithRetry(
				() =>
					// @ts-ignore - yanki-connect type definitions are incomplete
					this.client.invoke("version"),
				"checkConnection",
			);
			return true;
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get all deck names (cached)
	 */
	async getDeckNames(): Promise<string[]> {
		try {
			return await this.executeWithCache(
				"deckNames",
				() => this.client.deck.deckNames(),
				"getDeckNames",
				2 * 60 * 1000, // 2-minute cache
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Create a new deck (invalidates cache)
	 */
	async createDeck(name: string): Promise<number> {
		try {
			const result = await this.executeWithRetry(
				() => this.client.deck.createDeck({ deck: name }),
				"createDeck",
			);

			// Clear related cache after creation
			if (this.config.enableCache) {
				globalCache.deleteByPrefix("deck");
			}

			// Convert to number if needed
			return typeof result === "number" ? result : 0;
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Delete a deck (invalidates cache)
	 */
	async deleteDeck(name: string): Promise<void> {
		try {
			await this.executeWithRetry(
				() => this.client.deck.deleteDecks({ decks: [name], cardsToo: true }),
				"deleteDeck",
			);

			// Clear related cache after deletion
			if (this.config.enableCache) {
				globalCache.deleteByPrefix("deck");
				globalCache.delete(`deckStats:${name}`);
			}
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get deck stats (cached)
	 */
	async getDeckStats(name: string): Promise<any> {
		try {
			return await this.executeWithCache(
				`deckStats:${name}`,
				() => this.client.deck.getDeckStats({ decks: [name] }),
				"getDeckStats",
				1 * 60 * 1000, // 1-minute cache
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get all model names (cached)
	 */
	async getModelNames(): Promise<string[]> {
		try {
			return await this.executeWithCache(
				"modelNames",
				() => this.client.model.modelNames(),
				"getModelNames",
				5 * 60 * 1000, // 5-minute cache
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get model field names (cached)
	 */
	async getModelFieldNames(modelName: string): Promise<string[]> {
		try {
			return await this.executeWithCache(
				`modelFields:${modelName}`,
				() => this.client.model.modelFieldNames({ modelName }),
				"getModelFieldNames",
				10 * 60 * 1000, // 10-minute cache
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get model templates (cached)
	 */
	async getModelTemplates(
		modelName: string,
	): Promise<Record<string, { Front: string; Back: string }>> {
		try {
			return await this.executeWithCache(
				`modelTemplates:${modelName}`,
				() => this.client.model.modelTemplates({ modelName }),
				"getModelTemplates",
				10 * 60 * 1000, // 10-minute cache
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get model styling (cached)
	 */
	async getModelStyling(modelName: string): Promise<{ css: string }> {
		try {
			return await this.executeWithCache(
				`modelStyling:${modelName}`,
				() => this.client.model.modelStyling({ modelName }),
				"getModelStyling",
				10 * 60 * 1000, // 10-minute cache
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Create a new note
	 */
	async addNote(params: {
		deckName: string;
		modelName: string;
		fields: Record<string, string>;
		tags?: string[];
		options?: {
			allowDuplicate?: boolean;
		};
	}): Promise<number | null> {
		try {
			return await this.executeWithRetry(() =>
				this.client.note.addNote({
					note: {
						deckName: params.deckName,
						modelName: params.modelName,
						fields: params.fields,
						tags: params.tags || [],
						options: {
							allowDuplicate: params.options?.allowDuplicate || false,
							duplicateScope: "deck",
						},
					},
				}),
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Add multiple notes
	 */
	async addNotes(
		notes: {
			deckName: string;
			modelName: string;
			fields: Record<string, string>;
			tags?: string[];
		}[],
	): Promise<(string | null)[] | null> {
		try {
			return await this.executeWithRetry(() =>
				this.client.note.addNotes({
					notes: notes.map((note) => ({
						deckName: note.deckName,
						modelName: note.modelName,
						fields: note.fields,
						tags: note.tags || [],
						options: {
							allowDuplicate: false,
							duplicateScope: "deck",
						},
					})),
				}),
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Find notes by query
	 */
	async findNotes(query: string): Promise<number[]> {
		try {
			const result = await this.executeWithRetry(() =>
				this.client.note.findNotes({ query }),
			);
			// Ensure we return an array of numbers
			return (
				Array.isArray(result)
					? result.filter((id) => typeof id === "number")
					: []
			) as number[];
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Find cards by query
	 */
	async findCards(query: string): Promise<number[]> {
		try {
			const result = await this.executeWithRetry(() =>
				this.client.card.findCards({ query }),
			);
			// Ensure we return an array of numbers
			return (
				Array.isArray(result)
					? result.filter((id) => typeof id === "number")
					: []
			) as number[];
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get card info
	 */
	async cardsInfo(ids: number[]): Promise<any[]> {
		try {
			const result = await this.executeWithRetry(() =>
				this.client.card.cardsInfo({ cards: ids }),
			);
			return Array.isArray(result) ? result : [];
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Suspend cards
	 */
	async suspendCards(ids: number[]): Promise<void> {
		try {
			await this.executeWithRetry(() =>
				this.client.card.suspend({ cards: ids }),
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Unsuspend cards
	 */
	async unsuspendCards(ids: number[]): Promise<void> {
		try {
			await this.executeWithRetry(() =>
				this.client.card.unsuspend({ cards: ids }),
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Forget cards
	 */
	async forgetCards(ids: number[]): Promise<void> {
		try {
			await this.executeWithRetry(() =>
				this.client.card.forgetCards({ cards: ids }),
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Relearn cards
	 */
	async relearnCards(ids: number[]): Promise<void> {
		try {
			await this.executeWithRetry(() =>
				this.client.card.relearnCards({ cards: ids }),
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get note info
	 */
	async notesInfo(ids: number[]): Promise<
		{
			noteId: number;
			modelName: string;
			tags: string[];
			fields: Record<string, { value: string; order: number }>;
		}[]
	> {
		try {
			const result = await this.executeWithRetry(() =>
				this.client.note.notesInfo({ notes: ids }),
			);
			// Ensure we return a valid array
			return (Array.isArray(result) ? result : []) as {
				noteId: number;
				modelName: string;
				tags: string[];
				fields: Record<string, { value: string; order: number }>;
			}[];
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Update note fields
	 */
	async updateNoteFields(params: {
		id: number;
		fields: Record<string, string>;
	}): Promise<void> {
		try {
			await this.executeWithRetry(() =>
				this.client.note.updateNoteFields({
					note: {
						id: params.id,
						fields: params.fields,
					},
				}),
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Delete notes
	 */
	async deleteNotes(ids: number[]): Promise<void> {
		try {
			await this.executeWithRetry(() =>
				this.client.note.deleteNotes({ notes: ids }),
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Create a new model
	 */
	async createModel(params: {
		modelName: string;
		inOrderFields: string[];
		css: string;
		cardTemplates: {
			name: string;
			front: string;
			back: string;
		}[];
	}): Promise<void> {
		try {
			// Convert to the format expected by yanki-connect
			const convertedTemplates = params.cardTemplates.map((template) => ({
				name: template.name,
				Front: template.front,
				Back: template.back,
			}));

			await this.executeWithRetry(() =>
				this.client.model.createModel({
					modelName: params.modelName,
					inOrderFields: params.inOrderFields,
					css: params.css,
					cardTemplates: convertedTemplates,
				}),
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Update a model's templates
	 */
	async updateModelTemplates(params: {
		modelName: string;
		cardTemplates: {
			name: string;
			front: string;
			back: string;
		}[];
	}): Promise<void> {
		try {
			// Convert to the format expected by yanki-connect
			const convertedTemplates = params.cardTemplates.map((template) => ({
				Name: template.name,
				Front: template.front,
				Back: template.back,
			}));

			await this.executeWithRetry(() =>
				// @ts-ignore
				this.client.model.updateModelTemplates({
					model: {
						name: params.modelName,
						templates: convertedTemplates,
					},
				}),
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}
}
