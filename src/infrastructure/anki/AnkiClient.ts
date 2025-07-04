import { YankiConnect } from "yanki-connect";
import { AnkiConfig } from "../config/AnkiConfig.js";
import {
	AnkiConnectionError,
	AnkiTimeoutError,
	AnkiApiError,
} from "../../core/errors/DomainErrors.js";
import { ErrorHandler } from "../../core/errors/ErrorHandler.js";
import { globalCache, globalPerformanceMonitor } from "../../cacheManager.js";

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
	 * @param config Anki configuration
	 */
	constructor(config: AnkiConfig) {
		this.config = config;
		this.client = new YankiConnect();

		// Periodic cache cleanup
		setInterval(
			() => {
				globalCache.cleanup();
			},
			5 * 60 * 1000,
		); // Clean up every 5 minutes
	}

	/**
	 * Execute a request with retry logic and performance monitoring
	 */
	private async executeWithRetry<T>(
		operation: () => Promise<T>,
		operationName: string = "unknown",
		maxRetries: number = this.config.retryAttempts,
	): Promise<T> {
		let stopTimer: (() => void) | null = null;

		// Start performance monitoring
		stopTimer = globalPerformanceMonitor.startOperation(operationName);

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
							this.config.retryDelay,
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
		const cached = globalCache.get<T>(cacheKey);
		if (cached !== null) {
			return cached;
		}

		// Execute operation
		const result = await this.executeWithRetry(operation, operationName);

		// Cache result
		globalCache.set(cacheKey, result, ttl);

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
					error,
				);
			}

			// Timeout errors
			if (
				error.message.includes("timeout") ||
				error.message.includes("ETIMEDOUT")
			) {
				return new AnkiTimeoutError(
					"Connection to Anki timed out. Please check if Anki is responsive.",
					error,
				);
			}

			// API errors
			if (error.message.includes("collection unavailable")) {
				return new AnkiApiError(
					"Anki collection is unavailable. Please close any open dialogs in Anki.",
					error,
				);
			}

			return error;
		}

		return new Error(String(error));
	}

	/**
	 * Check if Anki is available
	 */
	async checkConnection(): Promise<boolean> {
		try {
			// Use a direct call to check connection
			await this.executeWithRetry(
				() =>
					// @ts-ignore - yanki-connect type definitions are incomplete
					this.client.invoke("version"),
				"checkConnection",
			);
			return true;
		} catch (error) {
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			globalCache.deleteByPrefix("deck");

			// Convert to number if needed
			return typeof result === "number" ? result : 0;
		} catch (error) {
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			globalCache.deleteByPrefix("deck");
			globalCache.delete(`deckStats:${name}`);
		} catch (error) {
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
		}
	}

	/**
	 * Get card information by IDs
	 */
	async cardsInfo(ids: number[]): Promise<any[]> {
		try {
			return await this.executeWithRetry(() =>
				this.client.card.cardsInfo({ cards: ids }),
			);
		} catch (error) {
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
		}
	}

	/**
	 * Get note information by IDs
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
			return await this.executeWithRetry(() =>
				this.client.note.notesInfo({ notes: ids }),
			);
		} catch (error) {
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
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
			const normalizedError = this.normalizeError(error);
			throw ErrorHandler.toMcpError(normalizedError);
		}
	}
}
