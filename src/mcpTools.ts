/**
 * MCP Tool handlers for Anki
 */
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { AnkiClient } from "./utils.js";

/**
 * Handles all MCP tool operations for Anki
 */
export class McpToolHandler {
	private ankiClient: AnkiClient;

	constructor() {
		this.ankiClient = new AnkiClient();
	}

	/**
	 * Get tool schema for all available tools
	 */
	async getToolSchema(): Promise<{
		tools: {
			name: string;
			description: string;
			inputSchema: Record<string, any>;
		}[];
	}> {
		return {
			tools: [
				{
					name: "list_decks",
					description: "List all available Anki decks",
					inputSchema: {
						type: "object",
						properties: {},
						required: [],
					},
				},
				{
					name: "create_deck",
					description: "Create a new Anki deck",
					inputSchema: {
						type: "object",
						properties: {
							name: {
								type: "string",
								description: "Name of the deck to create",
							},
						},
						required: ["name"],
					},
				},
				{
					name: "get_note_type_info",
					description: "Get detailed structure of a note type",
					inputSchema: {
						type: "object",
						properties: {
							modelName: {
								type: "string",
								description: "Name of the note type/model",
							},
							includeCss: {
								type: "boolean",
								description: "Whether to include CSS information",
							},
						},
						required: ["modelName"],
					},
				},
				{
					name: "create_note",
					description:
						"Create a new note (LLM Should get note type info first)",
					inputSchema: {
						type: "object",
						properties: {
							type: {
								type: "string",
								description: "Note type",
							},
							deck: {
								type: "string",
								description: "Deck name",
							},
							fields: {
								type: "object",
								description:
									"Custom fields for the note(get note type info first)",
								additionalProperties: true,
							},
							allowDuplicate: {
								type: "boolean",
								description: "Whether to allow duplicate notes",
							},
							tags: {
								type: "array",
								items: {
									type: "string",
								},
								description: "Tags for the note",
							},
						},
						required: ["type", "deck", "fields"],
					},
				},
				{
					name: "batch_create_notes",
					description: "Create multiple notes at once",
					inputSchema: {
						type: "object",
						properties: {
							notes: {
								type: "array",
								items: {
									type: "object",
									properties: {
										type: {
											type: "string",
											enum: ["Basic", "Cloze"],
										},
										deck: {
											type: "string",
										},
										fields: {
											type: "object",
											additionalProperties: true,
										},
										tags: {
											type: "array",
											items: {
												type: "string",
											},
										},
									},
									required: ["type", "deck", "fields"],
								},
							},
							allowDuplicate: {
								type: "boolean",
								description: "Whether to allow duplicate notes",
							},
							stopOnError: {
								type: "boolean",
								description: "Whether to stop on first error",
							},
						},
						required: ["notes"],
					},
				},
				{
					name: "search_notes",
					description: "Search for notes using Anki query syntax",
					inputSchema: {
						type: "object",
						properties: {
							query: {
								type: "string",
								description: "Anki search query",
							},
						},
						required: ["query"],
					},
				},
				{
					name: "get_note_info",
					description: "Get detailed information about a note",
					inputSchema: {
						type: "object",
						properties: {
							noteId: {
								type: "number",
								description: "Note ID",
							},
						},
						required: ["noteId"],
					},
				},
				{
					name: "update_note",
					description: "Update an existing note",
					inputSchema: {
						type: "object",
						properties: {
							id: {
								type: "number",
								description: "Note ID",
							},
							fields: {
								type: "object",
								description: "Fields to update",
							},
							tags: {
								type: "array",
								items: {
									type: "string",
								},
								description: "New tags for the note",
							},
						},
						required: ["id", "fields"],
					},
				},
				{
					name: "delete_note",
					description: "Delete a note",
					inputSchema: {
						type: "object",
						properties: {
							noteId: {
								type: "number",
								description: "Note ID to delete",
							},
						},
						required: ["noteId"],
					},
				},
				{
					name: "list_note_types",
					description: "List all available note types",
					inputSchema: {
						type: "object",
						properties: {},
						required: [],
					},
				},
				{
					name: "create_note_type",
					description: "Create a new note type",
					inputSchema: {
						type: "object",
						properties: {
							name: {
								type: "string",
								description: "Name of the new note type",
							},
							fields: {
								type: "array",
								items: {
									type: "string",
								},
								description: "Field names for the note type",
							},
							css: {
								type: "string",
								description: "CSS styling for the note type",
							},
							templates: {
								type: "array",
								items: {
									type: "object",
									properties: {
										name: {
											type: "string",
										},
										front: {
											type: "string",
										},
										back: {
											type: "string",
										},
									},
									required: ["name", "front", "back"],
								},
								description: "Card templates",
							},
						},
						required: ["name", "fields", "templates"],
					},
				},
			],
		};
	}

	/**
	 * Handle tool execution
	 */
	async executeTool(
		name: string,
		args: any,
	): Promise<{
		content: {
			type: string;
			text: string;
		}[];
		isError?: boolean;
	}> {
		await this.ankiClient.checkConnection();

		try {
			switch (name) {
				// Deck tools
				case "list_decks":
					return this.listDecks();
				case "create_deck":
					return this.createDeck(args);

				// Note type tools
				case "list_note_types":
					return this.listNoteTypes();
				case "create_note_type":
					return this.createNoteType(args);
				case "get_note_type_info":
					return this.getNoteTypeInfo(args);

				// Note tools
				case "create_note":
					return this.createNote(args);
				case "batch_create_notes":
					return this.batchCreateNotes(args);
				case "search_notes":
					return this.searchNotes(args);
				case "get_note_info":
					return this.getNoteInfo(args);
				case "update_note":
					return this.updateNote(args);
				case "delete_note":
					return this.deleteNote(args);

				// Dynamic model-specific note creation
				default:
					const typeToolMatch = name.match(/^create_(.+)_note$/);
					if (typeToolMatch) {
						const modelName = typeToolMatch[1].replace(/_/g, " ");
						return this.createModelSpecificNote(modelName, args);
					}

					throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
			}
		} catch (error) {
			if (error instanceof McpError) {
				throw error;
			}

			return {
				content: [
					{
						type: "text",
						text: `Error: ${
							error instanceof Error ? error.message : String(error)
						}`,
					},
				],
				isError: true,
			};
		}
	}

	/**
	 * List all decks
	 */
	private async listDecks(): Promise<{
		content: {
			type: string;
			text: string;
		}[];
	}> {
		const decks = await this.ankiClient.getDeckNames();
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({ decks, count: decks.length }, null, 2),
				},
			],
		};
	}

	/**
	 * Create a new deck
	 */
	private async createDeck(args: { name: string }): Promise<{
		content: {
			type: string;
			text: string;
		}[];
	}> {
		if (!args.name) {
			throw new McpError(ErrorCode.InvalidParams, "Deck name is required");
		}

		const deckId = await this.ankiClient.createDeck(args.name);
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({ deckId, name: args.name }, null, 2),
				},
			],
		};
	}

	/**
	 * List all note types
	 */
	private async listNoteTypes(): Promise<{
		content: {
			type: string;
			text: string;
		}[];
	}> {
		const noteTypes = await this.ankiClient.getModelNames();
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({ noteTypes, count: noteTypes.length }, null, 2),
				},
			],
		};
	}

	/**
	 * Create a new note type
	 */
	private async createNoteType(args: {
		name: string;
		fields: string[];
		css?: string;
		templates: {
			name: string;
			front: string;
			back: string;
		}[];
	}): Promise<{
		content: {
			type: string;
			text: string;
		}[];
	}> {
		if (!args.name) {
			throw new McpError(ErrorCode.InvalidParams, "Note type name is required");
		}

		if (!args.fields || args.fields.length === 0) {
			throw new McpError(ErrorCode.InvalidParams, "Fields are required");
		}

		if (!args.templates || args.templates.length === 0) {
			throw new McpError(ErrorCode.InvalidParams, "Templates are required");
		}

		// Check if model already exists
		const existingModels = await this.ankiClient.getModelNames();
		if (existingModels.includes(args.name)) {
			throw new McpError(
				ErrorCode.InvalidParams,
				`Note type already exists: ${args.name}`,
			);
		}

		await this.ankiClient.createModel({
			modelName: args.name,
			inOrderFields: args.fields,
			css: args.css || "",
			cardTemplates: args.templates,
		});

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							success: true,
							modelName: args.name,
							fields: args.fields,
							templates: args.templates.length,
						},
						null,
						2,
					),
				},
			],
		};
	}

	/**
	 * Get note type info
	 */
	private async getNoteTypeInfo(args: {
		modelName: string;
		includeCss?: boolean;
	}): Promise<{
		content: {
			type: string;
			text: string;
		}[];
	}> {
		if (!args.modelName) {
			throw new McpError(ErrorCode.InvalidParams, "Model name is required");
		}

		// Check if model exists
		const existingModels = await this.ankiClient.getModelNames();
		if (!existingModels.includes(args.modelName)) {
			throw new McpError(
				ErrorCode.InvalidParams,
				`Note type not found: ${args.modelName}`,
			);
		}

		// Get model information in parallel
		const [fields, templates] = await Promise.all([
			this.ankiClient.getModelFieldNames(args.modelName),
			this.ankiClient.getModelTemplates(args.modelName),
		]);

		const result: any = {
			modelName: args.modelName,
			fields,
			templates,
		};

		if (args.includeCss) {
			const styling = await this.ankiClient.getModelStyling(args.modelName);
			result.css = styling.css;
		}

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(result, null, 2),
				},
			],
		};
	}

	/**
	 * Create a new note
	 */
	private async createNote(args: {
		type: string;
		deck: string;
		fields: Record<string, string>;
		allowDuplicate?: boolean;
		tags?: string[];
	}): Promise<{
		content: {
			type: string;
			text: string;
		}[];
	}> {
		if (!args.type) {
			throw new McpError(ErrorCode.InvalidParams, "Note type is required");
		}

		if (!args.deck) {
			throw new McpError(ErrorCode.InvalidParams, "Deck name is required");
		}

		if (!args.fields || Object.keys(args.fields).length === 0) {
			throw new McpError(ErrorCode.InvalidParams, "Fields are required");
		}

		// Check if deck exists, create if not
		const decks = await this.ankiClient.getDeckNames();
		if (!decks.includes(args.deck)) {
			await this.ankiClient.createDeck(args.deck);
		}

		// Check if model exists
		const models = await this.ankiClient.getModelNames();
		if (!models.includes(args.type)) {
			throw new McpError(
				ErrorCode.InvalidParams,
				`Note type not found: ${args.type}`,
			);
		}

		// Validate fields
		const modelFields = await this.ankiClient.getModelFieldNames(args.type);
		for (const field of modelFields) {
			if (!args.fields[field] && !args.fields[field.toLowerCase()]) {
				throw new McpError(
					ErrorCode.InvalidParams,
					`Missing required field: ${field}`,
				);
			}
		}

		// Normalize field names to match the model
		const normalizedFields: Record<string, string> = {};
		for (const field of modelFields) {
			normalizedFields[field] =
				args.fields[field] || args.fields[field.toLowerCase()] || "";
		}

		const noteId = await this.ankiClient.addNote({
			deckName: args.deck,
			modelName: args.type,
			fields: normalizedFields,
			tags: args.tags || [],
			options: {
				allowDuplicate: args.allowDuplicate || false,
			},
		});

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							noteId,
							deck: args.deck,
							modelName: args.type,
						},
						null,
						2,
					),
				},
			],
		};
	}

	/**
	 * Create a model-specific note
	 */
	private async createModelSpecificNote(
		modelName: string,
		args: Record<string, any>,
	): Promise<{
		content: {
			type: string;
			text: string;
		}[];
	}> {
		if (!args.deck) {
			throw new McpError(ErrorCode.InvalidParams, "Deck name is required");
		}

		// Check if model exists
		const models = await this.ankiClient.getModelNames();
		if (!models.includes(modelName)) {
			throw new McpError(
				ErrorCode.InvalidParams,
				`Note type not found: ${modelName}`,
			);
		}

		// Check if deck exists, create if not
		const decks = await this.ankiClient.getDeckNames();
		if (!decks.includes(args.deck)) {
			await this.ankiClient.createDeck(args.deck);
		}

		// Get model fields
		const modelFields = await this.ankiClient.getModelFieldNames(modelName);

		// Validate fields
		const fields: Record<string, string> = {};
		for (const field of modelFields) {
			const fieldValue = args[field.toLowerCase()] || args[field] || "";
			fields[field] = fieldValue;
		}

		// Extract tags if provided
		const tags = Array.isArray(args.tags) ? args.tags : [];

		const noteId = await this.ankiClient.addNote({
			deckName: args.deck,
			modelName: modelName,
			fields,
			tags,
		});

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							noteId,
							deck: args.deck,
							modelName,
						},
						null,
						2,
					),
				},
			],
		};
	}

	/**
	 * Create multiple notes at once
	 */
	private async batchCreateNotes(args: {
		notes: {
			type: string;
			deck: string;
			fields: Record<string, string>;
			tags?: string[];
		}[];
		allowDuplicate?: boolean;
		stopOnError?: boolean;
	}): Promise<{
		content: {
			type: string;
			text: string;
		}[];
	}> {
		if (!args.notes || !Array.isArray(args.notes) || args.notes.length === 0) {
			throw new McpError(ErrorCode.InvalidParams, "Notes array is required");
		}

		const results: {
			success: boolean;
			noteId?: number | null;
			error?: string;
			index: number;
		}[] = [];

		const stopOnError = args.stopOnError !== false;

		// Process each note
		for (let i = 0; i < args.notes.length; i++) {
			const note = args.notes[i];
			try {
				// Check if deck exists, create if not
				const decks = await this.ankiClient.getDeckNames();
				if (!decks.includes(note.deck)) {
					await this.ankiClient.createDeck(note.deck);
				}

				// Check if model exists
				const models = await this.ankiClient.getModelNames();
				if (!models.includes(note.type)) {
					throw new Error(`Note type not found: ${note.type}`);
				}

				// Get model fields
				const modelFields = await this.ankiClient.getModelFieldNames(note.type);

				// Normalize field names to match the model
				const normalizedFields: Record<string, string> = {};
				for (const field of modelFields) {
					normalizedFields[field] =
						note.fields[field] || note.fields[field.toLowerCase()] || "";
				}

				const noteId = await this.ankiClient.addNote({
					deckName: note.deck,
					modelName: note.type,
					fields: normalizedFields,
					tags: note.tags || [],
					options: {
						allowDuplicate: args.allowDuplicate || false,
					},
				});

				results.push({
					success: true,
					noteId,
					index: i,
				});
			} catch (error) {
				results.push({
					success: false,
					error: error instanceof Error ? error.message : String(error),
					index: i,
				});

				if (stopOnError) {
					break;
				}
			}
		}

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							results,
							total: args.notes.length,
							successful: results.filter((r) => r.success).length,
							failed: results.filter((r) => !r.success).length,
						},
						null,
						2,
					),
				},
			],
		};
	}

	/**
	 * Search for notes
	 */
	private async searchNotes(args: { query: string }): Promise<{
		content: {
			type: string;
			text: string;
		}[];
	}> {
		if (!args.query) {
			throw new McpError(ErrorCode.InvalidParams, "Search query is required");
		}

		const noteIds = await this.ankiClient.findNotes(args.query);

		let notes: any[] = [];
		if (noteIds.length > 0) {
			// Get detailed info for the first 50 notes
			const limit = Math.min(noteIds.length, 50);
			const notesInfo = await this.ankiClient.notesInfo(
				noteIds.slice(0, limit),
			);
			notes = notesInfo;
		}

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							query: args.query,
							total: noteIds.length,
							notes,
							limitApplied: noteIds.length > 50,
						},
						null,
						2,
					),
				},
			],
		};
	}

	/**
	 * Get note info
	 */
	private async getNoteInfo(args: { noteId: number }): Promise<{
		content: {
			type: string;
			text: string;
		}[];
	}> {
		if (!args.noteId) {
			throw new McpError(ErrorCode.InvalidParams, "Note ID is required");
		}

		const notesInfo = await this.ankiClient.notesInfo([args.noteId]);

		if (!notesInfo || notesInfo.length === 0) {
			throw new McpError(
				ErrorCode.InvalidParams,
				`Note not found: ${args.noteId}`,
			);
		}

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(notesInfo[0], null, 2),
				},
			],
		};
	}

	/**
	 * Update a note
	 */
	private async updateNote(args: {
		id: number;
		fields: Record<string, string>;
		tags?: string[];
	}): Promise<{
		content: {
			type: string;
			text: string;
		}[];
	}> {
		if (!args.id) {
			throw new McpError(ErrorCode.InvalidParams, "Note ID is required");
		}

		if (!args.fields || Object.keys(args.fields).length === 0) {
			throw new McpError(ErrorCode.InvalidParams, "Fields are required");
		}

		// Check if note exists
		const notesInfo = await this.ankiClient.notesInfo([args.id]);

		if (!notesInfo || notesInfo.length === 0) {
			throw new McpError(ErrorCode.InvalidParams, `Note not found: ${args.id}`);
		}

		// Update fields
		await this.ankiClient.updateNoteFields({
			id: args.id,
			fields: args.fields,
		});

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							success: true,
							noteId: args.id,
						},
						null,
						2,
					),
				},
			],
		};
	}

	/**
	 * Delete a note
	 */
	private async deleteNote(args: { noteId: number }): Promise<{
		content: {
			type: string;
			text: string;
		}[];
	}> {
		if (!args.noteId) {
			throw new McpError(ErrorCode.InvalidParams, "Note ID is required");
		}

		await this.ankiClient.deleteNotes([args.noteId]);

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							success: true,
							noteId: args.noteId,
						},
						null,
						2,
					),
				},
			],
		};
	}
}
