import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { AnkiClient } from "../utils.js";
import { BaseTool, IMcpTool } from "./baseTool.js";

export class CreateNoteTool extends BaseTool implements IMcpTool {
	name = "create_note";
	description = "Create a new note (LLM Should call get_note_type_info first)";
	inputSchema = {
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
				description: "Custom fields for the note(get note type info first)",
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
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: {
		type: string;
		deck: string;
		fields: Record<string, string>;
		allowDuplicate?: boolean;
		tags?: string[];
	}): Promise<{ content: { type: string; text: string }[] }> {
		try {
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

			// Normalize field names to match the model
			const modelFields = await this.ankiClient.getModelFieldNames(args.type);
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

			return this.formatSuccessResponse({
				noteId,
				deck: args.deck,
				modelName: args.type,
			});
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class BatchCreateNotesTool extends BaseTool implements IMcpTool {
	name = "batch_create_notes";
	description =
		"Create multiple notes at once (llm should call get_note_type_info first )";
	inputSchema = {
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
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: {
		notes: {
			type: string;
			deck: string;
			fields: Record<string, string>;
			tags?: string[];
		}[];
		allowDuplicate?: boolean;
		stopOnError?: boolean;
	}): Promise<{ content: { type: string; text: string }[] }> {
		try {
			if (
				!args.notes ||
				!Array.isArray(args.notes) ||
				args.notes.length === 0
			) {
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
					const modelFields = await this.ankiClient.getModelFieldNames(
						note.type,
					);

					// Normalize field names to match the model, all fields can be empty
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

			return this.formatSuccessResponse({
				results,
				total: args.notes.length,
				successful: results.filter((r) => r.success).length,
				failed: results.filter((r) => !r.success).length,
			});
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class SearchNotesTool extends BaseTool implements IMcpTool {
	name = "search_notes";
	description = "Search for notes using Anki query syntax";
	inputSchema = {
		type: "object",
		properties: {
			query: {
				type: "string",
				description: "Anki search query",
			},
		},
		required: ["query"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: { query: string }): Promise<{
		content: { type: string; text: string }[];
	}> {
		try {
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

			return this.formatSuccessResponse({
				query: args.query,
				total: noteIds.length,
				notes,
				limitApplied: noteIds.length > 50,
			});
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class GetNoteInfoTool extends BaseTool implements IMcpTool {
	name = "get_note_info";
	description = "Get detailed information about a note";
	inputSchema = {
		type: "object",
		properties: {
			noteId: {
				type: "number",
				description: "Note ID",
			},
		},
		required: ["noteId"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: { noteId: number }): Promise<{
		content: { type: string; text: string }[];
	}> {
		try {
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

			return this.formatSuccessResponse(notesInfo[0]);
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class UpdateNoteTool extends BaseTool implements IMcpTool {
	name = "update_note";
	description = "Update an existing note";
	inputSchema = {
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
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: {
		id: number;
		fields: Record<string, string>;
		tags?: string[];
	}): Promise<{ content: { type: string; text: string }[] }> {
		try {
			if (!args.id) {
				throw new McpError(ErrorCode.InvalidParams, "Note ID is required");
			}

			if (!args.fields || Object.keys(args.fields).length === 0) {
				throw new McpError(ErrorCode.InvalidParams, "Fields are required");
			}

			// Check if note exists
			const notesInfo = await this.ankiClient.notesInfo([args.id]);

			if (!notesInfo || notesInfo.length === 0) {
				throw new McpError(
					ErrorCode.InvalidParams,
					`Note not found: ${args.id}`,
				);
			}

			// Update fields
			await this.ankiClient.updateNoteFields({
				id: args.id,
				fields: args.fields,
			});

			return this.formatSuccessResponse({
				success: true,
				noteId: args.id,
			});
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class DeleteNoteTool extends BaseTool implements IMcpTool {
	name = "delete_note";
	description = "Delete a note";
	inputSchema = {
		type: "object",
		properties: {
			noteId: {
				type: "number",
				description: "Note ID to delete",
			},
		},
		required: ["noteId"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: { noteId: number }): Promise<{
		content: { type: string; text: string }[];
	}> {
		try {
			if (!args.noteId) {
				throw new McpError(ErrorCode.InvalidParams, "Note ID is required");
			}

			await this.ankiClient.deleteNotes([args.noteId]);

			return this.formatSuccessResponse({
				success: true,
				noteId: args.noteId,
			});
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class CreateModelSpecificNoteTool extends BaseTool implements IMcpTool {
	name: string;
	description: string;
	inputSchema: Record<string, any>;
	private originalModelName: string;

	constructor(ankiClient: AnkiClient, modelName: string) {
		super(ankiClient);
		this.originalModelName = modelName;
		this.name = `create_${modelName
			.toLowerCase()
			.replace(/[^a-zA-Z0-9_-]/g, "_")}_note`;
		this.description = `Create a new note of type ${modelName}`;
		this.inputSchema = {
			type: "object",
			properties: {
				deck: {
					type: "string",
					description: "Deck name",
				},
				// Dynamic fields will be added here based on modelName
			},
			required: ["deck"],
			additionalProperties: true, // Allow dynamic fields
		};
	}

	async execute(
		args: Record<string, any>,
	): Promise<{ content: { type: string; text: string }[] }> {
		try {
			const modelName = this.originalModelName;

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

			// Normalize fields: all fields can be empty
			const fields: Record<string, string> = {};
			for (const field of modelFields) {
				fields[field] = args[field.toLowerCase()] || args[field] || "";
			}

			// Extract tags if provided
			const tags = Array.isArray(args.tags) ? args.tags : [];

			const noteId = await this.ankiClient.addNote({
				deckName: args.deck,
				modelName: modelName,
				fields,
				tags,
			});

			return this.formatSuccessResponse({
				noteId,
				deck: args.deck,
				modelName,
			});
		} catch (error) {
			return this.handleError(error);
		}
	}
}
