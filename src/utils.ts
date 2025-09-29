/**
 * Utility functions and anti-corruption layer for yanki-connect
 */
import { YankiConnect } from "yanki-connect";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

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

		// Extract host and port from ankiConnectUrl
		const url = new URL(this.config.ankiConnectUrl);
		this.client = new YankiConnect({
			host: `${url.protocol}//${url.hostname}`,
			port: parseInt(url.port, 10),
		});
	}

	/**
	 * Execute a request with retry logic
	 *
	 * @param operation Function to execute
	 * @param maxRetries Maximum number of retries
	 * @returns Promise with the result
	 */
	private async executeWithRetry<T>(
		operation: () => Promise<T>,
		maxRetries = 1,
	): Promise<T> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await operation();
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
			await this.executeWithRetry(() =>
				// @ts-ignore - yanki-connect type definitions are incomplete
				this.client.invoke("version"),
			);
			return true;
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get all deck names
	 */
	async getDeckNames(): Promise<string[]> {
		try {
			return await this.executeWithRetry(() => this.client.deck.deckNames());
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Create a new deck
	 */
	async createDeck(name: string): Promise<number> {
		try {
			const result = await this.executeWithRetry(() =>
				this.client.deck.createDeck({ deck: name }),
			);
			// Convert to number if needed
			return typeof result === "number" ? result : 0;
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get all model names
	 */
	async getModelNames(): Promise<string[]> {
		try {
			return await this.executeWithRetry(() => this.client.model.modelNames());
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get field names for a model
	 */
	async getModelFieldNames(modelName: string): Promise<string[]> {
		try {
			return await this.executeWithRetry(() =>
				this.client.model.modelFieldNames({ modelName }),
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get templates for a model
	 */
	async getModelTemplates(
		modelName: string,
	): Promise<Record<string, { Front: string; Back: string }>> {
		try {
			return await this.executeWithRetry(() =>
				this.client.model.modelTemplates({ modelName }),
			);
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get styling for a model
	 */
	async getModelStyling(modelName: string): Promise<{ css: string }> {
		try {
			return await this.executeWithRetry(() =>
				this.client.model.modelStyling({ modelName }),
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
}
