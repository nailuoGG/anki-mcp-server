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
	exampleTags: string[]; // 新增：用于标识示例卡片的标签
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
	exampleTags: ["example-card", "template-example", "示例卡片"], // 默认的示例卡片标签
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
	 * Get examples for a model by finding example cards
	 */
	async getModelExamples(modelName: string): Promise<{
		modelName: string;
		fields: string[];
		examples: Array<{
			description: string;
			fields: Record<string, string>;
		}>;
	}> {
		try {
			// Get model fields
			const fields = await this.getModelFieldNames(modelName);

			// Find example cards for this model
			const examples = await this.findExampleCards(modelName);

			return {
				modelName,
				fields,
				examples,
			};
		} catch (error) {
			throw this.wrapError(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Find example cards for a specific note type
	 */
	private async findExampleCards(modelName: string): Promise<
		Array<{
			description: string;
			fields: Record<string, string>;
		}>
	> {
		// 构建搜索查询
		const tagQuery = this.config.exampleTags
			.map((tag) => `tag:${tag}`)
			.join(" OR ");
		const query = `"note:${modelName}" (${tagQuery})`;

		// 搜索示例卡片
		const noteIds = await this.findNotes(query);
		if (noteIds.length === 0) {
			return [];
		}

		// 获取卡片详细信息
		const notesInfo = await this.notesInfo(noteIds);

		// 转换为示例格式
		return notesInfo.map((note) => {
			// 提取描述（可以从特定字段或标签中获取）
			const description =
				this.extractExampleDescription(note) || `Example for ${modelName}`;

			// 转换字段格式
			const fields: Record<string, string> = {};
			for (const [fieldName, fieldData] of Object.entries(note.fields)) {
				fields[fieldName] = fieldData.value;
			}

			return {
				description,
				fields,
				noteId: note.noteId,
			};
		});
	}

	/**
	 * Extract example description from note
	 */
	private extractExampleDescription(note: {
		noteId: number;
		modelName: string;
		tags: string[];
		fields: Record<string, { value: string; order: number }>;
	}): string {
		// 1. 尝试从特定标签中获取描述
		const descriptionTag = note.tags.find((tag) =>
			tag.startsWith("description:"),
		);
		if (descriptionTag) {
			return descriptionTag.substring("description:".length).replace(/_/g, " ");
		}

		// 2. 尝试从特定字段中获取描述
		const descriptionFields = [
			"Description",
			"Note",
			"Comment",
			"描述",
			"说明",
			"注释",
		];
		for (const field of descriptionFields) {
			if (note.fields[field]?.value) {
				return note.fields[field].value;
			}
		}

		// 3. 使用第一个非空字段的前N个字符作为描述
		for (const [fieldName, fieldData] of Object.entries(note.fields)) {
			if (fieldData.value.trim()) {
				const preview = fieldData.value.trim().slice(0, 50);
				return `${fieldName}: ${preview}${preview.length >= 50 ? "..." : ""}`;
			}
		}

		// 4. 默认描述
		return `Example card #${note.noteId}`;
	}

	/**
	 * Create a new example card
	 */
	async createExampleCard(params: {
		modelName: string;
		fields: Record<string, string>;
		description?: string;
		deckName?: string;
	}): Promise<number | null> {
		const deckName = params.deckName || this.config.defaultDeck;
		const tags = [...this.config.exampleTags];

		// 如果提供了描述，添加为特殊标签
		if (params.description) {
			tags.push(`description:${params.description.replace(/\s+/g, "_")}`);
		}

		// 创建示例卡片
		const noteId = await this.addNote({
			deckName,
			modelName: params.modelName,
			fields: params.fields,
			tags,
		});

		return noteId;
	}

	/**
	 * Update an existing example card
	 */
	async updateExampleCard(params: {
		noteId: number;
		fields: Record<string, string>;
		description?: string;
	}): Promise<void> {
		// 更新字段
		await this.updateNoteFields({
			id: params.noteId,
			fields: params.fields,
		});

		// 如果提供了新的描述，更新标签
		if (params.description) {
			const noteInfo = await this.notesInfo([params.noteId]);
			if (noteInfo.length > 0) {
				const note = noteInfo[0];
				const newTags = note.tags.filter(
					(tag) => !tag.startsWith("description:"),
				);
				newTags.push(`description:${params.description.replace(/\s+/g, "_")}`);

				// 更新标签 - 使用 notesInfo 的格式
				await this.executeWithRetry(() =>
					// @ts-ignore - yanki-connect 类型定义中可能没有这个方法
					this.client.note.updateNoteTags({
						note: params.noteId,
						tags: newTags,
					}),
				);
			}
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
