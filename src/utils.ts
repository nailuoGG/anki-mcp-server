/**
 * Utility functions and anti-corruption layer for yanki-connect
 */
import { YankiConnect, type YankiFetchAdapter } from "yanki-connect";
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
		public code?: string
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
	fetchAdapter?: YankiFetchAdapter;
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

const normalizeNoteId = (noteId: number | string | null): number | null => {
	if (noteId === null) {
		return null;
	}

	const numericId = typeof noteId === "number" ? noteId : Number(noteId);
	return Number.isFinite(numericId) ? numericId : null;
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
			fetchAdapter: this.createTimeoutFetchAdapter(),
		});
	}

	private createTimeoutFetchAdapter(): YankiFetchAdapter {
		const fetchAdapter = this.config.fetchAdapter ?? (fetch.bind(globalThis) as YankiFetchAdapter);

		return async (input, init) => {
			if (this.config.timeout <= 0) {
				return fetchAdapter(input, init);
			}

			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), this.config.timeout);

			try {
				return await fetchAdapter(input, {
					...init,
					signal: controller.signal,
				} as Parameters<YankiFetchAdapter>[1] & { signal: AbortSignal });
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					throw new AnkiTimeoutError(
						"Connection to Anki timed out. Please check if Anki is responsive."
					);
				}

				throw error;
			} finally {
				clearTimeout(timeout);
			}
		};
	}

	/**
	 * Execute a request with retry logic
	 *
	 * @param operation Function to execute
	 * @param maxRetries Maximum number of retries
	 * @returns Promise with the result
	 */
	private async executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 1): Promise<T> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = this.normalizeError(error);

				// Don't wait on the last attempt
				if (attempt < maxRetries) {
					// Exponential backoff
					const delay = Math.min(1000 * 2 ** attempt, this.config.retryTimeout);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		// If we get here, all attempts failed
		throw lastError || new AnkiConnectionError("Unknown error occurred");
	}

	private async executeOnce<T>(operation: () => Promise<T>): Promise<T> {
		return this.executeWithRetry(operation, 0);
	}

	/**
	 * Normalize errors from yanki-connect
	 */
	private normalizeError(error: unknown): Error {
		if (error instanceof Error) {
			if (error instanceof AnkiTimeoutError) {
				return error;
			}

			// Connection errors
			if (error.message.includes("ECONNREFUSED")) {
				return new AnkiConnectionError(
					"Anki is not running. Please start Anki and ensure AnkiConnect plugin is enabled."
				);
			}

			// Timeout errors
			if (
				error.name === "AbortError" ||
				error.message.includes("timeout") ||
				error.message.includes("ETIMEDOUT")
			) {
				return new AnkiTimeoutError(
					"Connection to Anki timed out. Please check if Anki is responsive."
				);
			}

			// API errors
			if (error.message.includes("collection unavailable")) {
				return new AnkiApiError(
					"Anki collection is unavailable. Please close any open dialogs in Anki."
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

		return new McpError(ErrorCode.InternalError, `Anki error: ${error.message}`);
	}

	/**
	 * Check if Anki is available
	 */
	async checkConnection(): Promise<boolean> {
		try {
			await this.getVersion();
			return true;
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Get the AnkiConnect API version.
	 */
	async getVersion(): Promise<number> {
		try {
			return await this.executeWithRetry(() => this.client.miscellaneous.version());
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Trigger a sync between the local collection and AnkiWeb. Fire-and-forget:
	 * AnkiConnect acknowledges the request but does not confirm completion.
	 * If a blocking dialog is open in Anki, the sync stays queued until it's
	 * dismissed.
	 */
	async sync(): Promise<void> {
		try {
			await this.executeOnce(() => this.client.miscellaneous.sync());
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Get all deck names
	 */
	async getDeckNames(): Promise<string[]> {
		try {
			return await this.executeWithRetry(() => this.client.deck.deckNames());
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Get all deck names with their Anki IDs
	 */
	async getDeckNamesAndIds(): Promise<Record<string, number>> {
		try {
			return await this.executeWithRetry(() => this.client.deck.deckNamesAndIds());
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Create a new deck
	 */
	async createDeck(name: string): Promise<number> {
		try {
			const result = await this.executeOnce(() => this.client.deck.createDeck({ deck: name }));
			// Convert to number if needed
			return typeof result === "number" ? result : 0;
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Get all model names
	 */
	async getModelNames(): Promise<string[]> {
		try {
			return await this.executeWithRetry(() => this.client.model.modelNames());
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Get field names for a model
	 */
	async getModelFieldNames(modelName: string): Promise<string[]> {
		try {
			return await this.executeWithRetry(() => this.client.model.modelFieldNames({ modelName }));
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Get templates for a model
	 */
	async getModelTemplates(
		modelName: string
	): Promise<Record<string, { Front: string; Back: string }>> {
		try {
			return await this.executeWithRetry(() => this.client.model.modelTemplates({ modelName }));
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Get styling for a model
	 */
	async getModelStyling(modelName: string): Promise<{ css: string }> {
		try {
			return await this.executeWithRetry(() => this.client.model.modelStyling({ modelName }));
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Get all tags in the collection
	 */
	async getTags(): Promise<string[]> {
		try {
			return await this.executeWithRetry(() => this.client.note.getTags());
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
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
			return await this.executeOnce(() =>
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
				})
			);
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
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
			options?: {
				allowDuplicate?: boolean;
			};
		}[]
	): Promise<(number | null)[] | null> {
		try {
			const result = await this.executeOnce(() =>
				this.client.note.addNotes({
					notes: notes.map((note) => ({
						deckName: note.deckName,
						modelName: note.modelName,
						fields: note.fields,
						tags: note.tags || [],
						options: {
							allowDuplicate: note.options?.allowDuplicate || false,
							duplicateScope: "deck",
						},
					})),
				})
			);

			return result === null ? null : result.map((noteId) => normalizeNoteId(noteId));
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async canAddNotesWithErrorDetail(
		notes: {
			deckName: string;
			modelName: string;
			fields: Record<string, string>;
			tags?: string[];
			options?: {
				allowDuplicate?: boolean;
			};
		}[]
	): Promise<
		(
			| {
					canAdd: true;
			  }
			| {
					canAdd: false;
					error: string;
			  }
		)[]
	> {
		try {
			return await this.executeWithRetry(() =>
				this.client.note.canAddNotesWithErrorDetail({
					notes: notes.map((note) => ({
						deckName: note.deckName,
						modelName: note.modelName,
						fields: note.fields,
						tags: note.tags || [],
						options: {
							allowDuplicate: note.options?.allowDuplicate || false,
							duplicateScope: "deck",
						},
					})),
				})
			);
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Find notes by query
	 */
	async findNotes(query: string): Promise<number[]> {
		try {
			const result = await this.executeWithRetry(() => this.client.note.findNotes({ query }));
			// Ensure we return an array of numbers
			return (
				Array.isArray(result) ? result.filter((id) => typeof id === "number") : []
			) as number[];
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
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
			const result = await this.executeWithRetry(() => this.client.note.notesInfo({ notes: ids }));
			// Ensure we return a valid array
			return (Array.isArray(result) ? result : []) as {
				noteId: number;
				modelName: string;
				tags: string[];
				fields: Record<string, { value: string; order: number }>;
			}[];
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Update note fields
	 */
	async updateNoteFields(params: { id: number; fields: Record<string, string> }): Promise<void> {
		try {
			await this.executeOnce(() =>
				this.client.note.updateNoteFields({
					note: {
						id: params.id,
						fields: params.fields,
					},
				})
			);
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async updateNoteTags(params: { id: number; tags: string[] }): Promise<void> {
		try {
			await this.executeOnce(() =>
				this.client.note.updateNoteTags({
					note: params.id,
					tags: params.tags,
				})
			);
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async addTags(params: { noteIds: number[]; tags: string[] }): Promise<void> {
		try {
			await this.executeOnce(() =>
				this.client.note.addTags({
					notes: params.noteIds,
					tags: params.tags.join(" "),
				})
			);
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async removeTags(params: { noteIds: number[]; tags: string[] }): Promise<void> {
		try {
			await this.executeOnce(() =>
				this.client.note.removeTags({
					notes: params.noteIds,
					tags: params.tags.join(" "),
				})
			);
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Delete notes
	 */
	async deleteNotes(ids: number[]): Promise<void> {
		try {
			await this.executeOnce(() => this.client.note.deleteNotes({ notes: ids }));
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
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

			await this.executeOnce(() =>
				this.client.model.createModel({
					modelName: params.modelName,
					inOrderFields: params.inOrderFields,
					css: params.css,
					cardTemplates: convertedTemplates,
				})
			);
		} catch (error) {
			throw this.wrapError(error instanceof Error ? error : new Error(String(error)));
		}
	}
}
