/**
 * MCP Tool handlers for Anki.
 */
import {
	ErrorCode,
	McpError,
	type CallToolResult,
	type ListToolsResult,
	type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { AnkiClient } from "./utils.js";

type JsonObjectSchema = {
	type: "object";
	properties?: Record<string, object>;
	required?: string[];
	additionalProperties?: boolean | object;
	[key: string]: unknown;
};

type NoteInput = {
	type: string;
	deck: string;
	fields: Record<string, string>;
	tags: string[];
};

type BatchNoteResult = {
	success: boolean;
	index: number;
	noteId?: number;
	error?: string;
};

type AnkiNoteInfo = Awaited<ReturnType<AnkiClient["notesInfo"]>>[number];

const inputSchema = (schema: JsonObjectSchema): Tool["inputSchema"] =>
	schema as Tool["inputSchema"];

const outputSchema = (schema: JsonObjectSchema): Tool["outputSchema"] =>
	schema as Tool["outputSchema"];

const noInput = inputSchema({
	type: "object",
	properties: {},
	additionalProperties: false,
});

const tagsSchema = {
	type: "array",
	items: {
		type: "string",
	},
	description:
		"Optional tags for organization. Use strings without spaces for best Anki compatibility.",
};

const fieldsSchema = {
	type: "object",
	description:
		"Note fields keyed by exact model field names. For Basic: {Front: 'question', Back: 'answer'}.",
	additionalProperties: {
		type: "string",
	},
};

const noteTypeNameSchema = {
	type: "string",
	description: "Note type/model name. Common: Basic, Cloze.",
};

const deckNameSchema = {
	type: "string",
	description: "Target deck name. The deck is created if it does not exist.",
};

const noteInfoSchema: JsonObjectSchema = {
	type: "object",
	properties: {
		noteId: { type: "number" },
		modelName: { type: "string" },
		tags: { type: "array", items: { type: "string" } },
		fields: {
			type: "object",
			additionalProperties: {
				type: "object",
				properties: {
					value: { type: "string" },
					order: { type: "number" },
				},
			},
		},
	},
	required: ["noteId", "modelName", "tags", "fields"],
};

const noteInputSchema: JsonObjectSchema = {
	type: "object",
	properties: {
		type: noteTypeNameSchema,
		deck: deckNameSchema,
		fields: fieldsSchema,
		tags: tagsSchema,
	},
	required: ["type", "deck", "fields"],
	additionalProperties: false,
};

const TOOLS: Tool[] = [
	{
		name: "anki_check_connection",
		title: "Check Anki Connection",
		description: "Check whether AnkiConnect is reachable and return the API version.",
		inputSchema: noInput,
		outputSchema: outputSchema({
			type: "object",
			properties: {
				connected: { type: "boolean" },
				version: { type: "number" },
			},
			required: ["connected", "version"],
		}),
		annotations: {
			readOnlyHint: true,
			openWorldHint: false,
		},
	},
	{
		name: "anki_list_decks",
		title: "List Anki Decks",
		description: "List all available Anki decks.",
		inputSchema: noInput,
		outputSchema: outputSchema({
			type: "object",
			properties: {
				decks: { type: "array", items: { type: "string" } },
				count: { type: "number" },
			},
			required: ["decks", "count"],
		}),
		annotations: {
			readOnlyHint: true,
			openWorldHint: false,
		},
	},
	{
		name: "anki_sync",
		title: "Sync Anki",
		description:
			"Request AnkiWeb sync. Success means Anki accepted the request, not that AnkiWeb completed it.",
		inputSchema: noInput,
		outputSchema: outputSchema({
			type: "object",
			properties: {
				success: { type: "boolean" },
				message: { type: "string" },
			},
			required: ["success", "message"],
		}),
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: true,
		},
	},
	{
		name: "anki_create_deck",
		title: "Create Anki Deck",
		description: "Create an Anki deck by name.",
		inputSchema: inputSchema({
			type: "object",
			properties: {
				name: { type: "string", minLength: 1, description: "Deck name to create." },
			},
			required: ["name"],
			additionalProperties: false,
		}),
		outputSchema: outputSchema({
			type: "object",
			properties: {
				deckId: { type: "number" },
				name: { type: "string" },
			},
			required: ["deckId", "name"],
		}),
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	{
		name: "anki_list_note_types",
		title: "List Anki Note Types",
		description: "List all available Anki note types/models.",
		inputSchema: noInput,
		outputSchema: outputSchema({
			type: "object",
			properties: {
				noteTypes: { type: "array", items: { type: "string" } },
				count: { type: "number" },
			},
			required: ["noteTypes", "count"],
		}),
		annotations: {
			readOnlyHint: true,
			openWorldHint: false,
		},
	},
	{
		name: "anki_get_note_type_info",
		title: "Get Anki Note Type Info",
		description:
			"Get fields and card templates for a note type. Call this before creating notes for a custom model.",
		inputSchema: inputSchema({
			type: "object",
			properties: {
				modelName: { type: "string", minLength: 1, description: "Note type/model name." },
				includeCss: { type: "boolean", description: "Include CSS styling when true." },
			},
			required: ["modelName"],
			additionalProperties: false,
		}),
		outputSchema: outputSchema({
			type: "object",
			properties: {
				modelName: { type: "string" },
				fields: { type: "array", items: { type: "string" } },
				templates: { type: "object" },
				css: { type: "string" },
			},
			required: ["modelName", "fields", "templates"],
		}),
		annotations: {
			readOnlyHint: true,
			openWorldHint: false,
		},
	},
	{
		name: "anki_create_note",
		title: "Create Anki Note",
		description:
			"Create one note. Call anki_get_note_type_info first for custom fields. Use anki_batch_create_notes for multiple notes.",
		inputSchema: inputSchema({
			type: "object",
			properties: {
				type: noteTypeNameSchema,
				deck: deckNameSchema,
				fields: fieldsSchema,
				allowDuplicate: {
					type: "boolean",
					default: false,
					description: "Allow duplicate notes in the target deck.",
				},
				tags: tagsSchema,
			},
			required: ["type", "deck", "fields"],
			additionalProperties: false,
		}),
		outputSchema: outputSchema({
			type: "object",
			properties: {
				noteId: { type: "number" },
				deck: { type: "string" },
				modelName: { type: "string" },
			},
			required: ["noteId", "deck", "modelName"],
		}),
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	{
		name: "anki_batch_create_notes",
		title: "Batch Create Anki Notes",
		description:
			"Create up to 50 notes. Recommended batch size is 10-20. Returns per-note success and error details.",
		inputSchema: inputSchema({
			type: "object",
			properties: {
				notes: {
					type: "array",
					minItems: 1,
					maxItems: 50,
					items: noteInputSchema,
					description: "Notes to create.",
				},
				allowDuplicate: {
					type: "boolean",
					default: false,
					description: "Allow duplicate notes in their target decks.",
				},
				stopOnError: {
					type: "boolean",
					default: false,
					description: "Stop after the first failed note.",
				},
			},
			required: ["notes"],
			additionalProperties: false,
		}),
		outputSchema: outputSchema({
			type: "object",
			properties: {
				results: {
					type: "array",
					items: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							index: { type: "number" },
							noteId: { type: "number" },
							error: { type: "string" },
						},
						required: ["success", "index"],
					},
				},
				total: { type: "number" },
				successful: { type: "number" },
				failed: { type: "number" },
			},
			required: ["results", "total", "successful", "failed"],
		}),
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	{
		name: "anki_search_notes",
		title: "Search Anki Notes",
		description: "Search notes with Anki query syntax and return paginated note details.",
		inputSchema: inputSchema({
			type: "object",
			properties: {
				query: { type: "string", minLength: 1, description: "Anki search query." },
				limit: {
					type: "number",
					minimum: 1,
					maximum: 100,
					default: 20,
					description: "Maximum note details to return.",
				},
				offset: {
					type: "number",
					minimum: 0,
					default: 0,
					description: "Zero-based note result offset.",
				},
			},
			required: ["query"],
			additionalProperties: false,
		}),
		outputSchema: outputSchema({
			type: "object",
			properties: {
				query: { type: "string" },
				total: { type: "number" },
				offset: { type: "number" },
				limit: { type: "number" },
				hasMore: { type: "boolean" },
				nextOffset: { type: "number" },
				notes: { type: "array", items: noteInfoSchema },
			},
			required: ["query", "total", "offset", "limit", "hasMore", "notes"],
		}),
		annotations: {
			readOnlyHint: true,
			openWorldHint: false,
		},
	},
	{
		name: "anki_get_note_info",
		title: "Get Anki Note Info",
		description: "Get detailed information for one note ID.",
		inputSchema: inputSchema({
			type: "object",
			properties: {
				noteId: { type: "number", minimum: 1, description: "Positive Anki note ID." },
			},
			required: ["noteId"],
			additionalProperties: false,
		}),
		outputSchema: outputSchema(noteInfoSchema),
		annotations: {
			readOnlyHint: true,
			openWorldHint: false,
		},
	},
	{
		name: "anki_update_note",
		title: "Update Anki Note",
		description: "Update note fields and/or replace its tags.",
		inputSchema: inputSchema({
			type: "object",
			properties: {
				id: { type: "number", minimum: 1, description: "Positive Anki note ID." },
				fields: fieldsSchema,
				tags: {
					...tagsSchema,
					description: "Replacement tag list. Pass an empty array to clear tags.",
				},
			},
			required: ["id"],
			additionalProperties: false,
		}),
		outputSchema: outputSchema({
			type: "object",
			properties: {
				success: { type: "boolean" },
				noteId: { type: "number" },
				updatedFields: { type: "boolean" },
				updatedTags: { type: "boolean" },
			},
			required: ["success", "noteId", "updatedFields", "updatedTags"],
		}),
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	{
		name: "anki_delete_note",
		title: "Delete Anki Notes",
		description: "Delete one note by noteId or multiple notes by noteIds.",
		inputSchema: inputSchema({
			type: "object",
			properties: {
				noteId: { type: "number", minimum: 1, description: "Single note ID to delete." },
				noteIds: {
					type: "array",
					minItems: 1,
					items: { type: "number", minimum: 1 },
					description: "Multiple note IDs to delete.",
				},
			},
			additionalProperties: false,
		}),
		outputSchema: outputSchema({
			type: "object",
			properties: {
				success: { type: "boolean" },
				deletedCount: { type: "number" },
				noteIds: { type: "array", items: { type: "number" } },
			},
			required: ["success", "deletedCount", "noteIds"],
		}),
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	{
		name: "anki_create_note_type",
		title: "Create Anki Note Type",
		description: "Create a custom Anki note type/model with fields and card templates.",
		inputSchema: inputSchema({
			type: "object",
			properties: {
				name: { type: "string", minLength: 1, description: "New note type name." },
				fields: {
					type: "array",
					minItems: 1,
					items: { type: "string", minLength: 1 },
					description: "Field names in order.",
				},
				css: { type: "string", description: "Optional model CSS." },
				templates: {
					type: "array",
					minItems: 1,
					items: {
						type: "object",
						properties: {
							name: { type: "string", minLength: 1 },
							front: { type: "string" },
							back: { type: "string" },
						},
						required: ["name", "front", "back"],
						additionalProperties: false,
					},
					description: "Card templates.",
				},
			},
			required: ["name", "fields", "templates"],
			additionalProperties: false,
		}),
		outputSchema: outputSchema({
			type: "object",
			properties: {
				success: { type: "boolean" },
				modelName: { type: "string" },
				fields: { type: "array", items: { type: "string" } },
				templates: { type: "number" },
			},
			required: ["success", "modelName", "fields", "templates"],
		}),
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
];

const LEGACY_TOOL_ALIASES: Record<string, string> = {
	list_decks: "anki_list_decks",
	sync: "anki_sync",
	create_deck: "anki_create_deck",
	get_note_type_info: "anki_get_note_type_info",
	create_note: "anki_create_note",
	batch_create_notes: "anki_batch_create_notes",
	search_notes: "anki_search_notes",
	get_note_info: "anki_get_note_info",
	update_note: "anki_update_note",
	delete_note: "anki_delete_note",
	list_note_types: "anki_list_note_types",
	create_note_type: "anki_create_note_type",
};

const result = <T extends Record<string, unknown>>(
	data: T,
	options: { isError?: boolean } = {}
): CallToolResult => ({
	content: [
		{
			type: "text",
			text: JSON.stringify(data, null, 2),
		},
	],
	structuredContent: data,
	...(options.isError ? { isError: true } : {}),
});

const errorResult = (error: unknown): CallToolResult => ({
	content: [
		{
			type: "text",
			text: `Error: ${errorMessage(error)}`,
		},
	],
	isError: true,
});

const errorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

const requireString = (value: unknown, fieldName: string): string => {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`${fieldName} must be a non-empty string`);
	}

	return value;
};

const optionalBoolean = (value: unknown, defaultValue = false): boolean => {
	if (value === undefined) {
		return defaultValue;
	}

	if (typeof value !== "boolean") {
		throw new Error("Boolean option must be true or false");
	}

	return value;
};

const requirePositiveInteger = (value: unknown, fieldName: string): number => {
	if (!Number.isInteger(value) || (value as number) <= 0) {
		throw new Error(`${fieldName} must be a positive integer`);
	}

	return value as number;
};

const optionalInteger = (
	value: unknown,
	fieldName: string,
	defaultValue: number,
	minimum: number,
	maximum?: number
): number => {
	if (value === undefined) {
		return defaultValue;
	}

	if (!Number.isInteger(value) || (value as number) < minimum) {
		throw new Error(`${fieldName} must be an integer >= ${minimum}`);
	}

	if (maximum !== undefined && (value as number) > maximum) {
		throw new Error(`${fieldName} must be <= ${maximum}`);
	}

	return value as number;
};

const requireStringArray = (value: unknown, fieldName: string): string[] => {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error(`${fieldName} must be a non-empty array of strings`);
	}

	const values = value.map((item) => requireString(item, `${fieldName} item`));
	const duplicates = values.filter((item, index) => values.indexOf(item) !== index);
	if (duplicates.length > 0) {
		throw new Error(
			`${fieldName} contains duplicate value(s): ${[...new Set(duplicates)].join(", ")}`
		);
	}

	return values;
};

const parseTags = (value: unknown): string[] => {
	if (value === undefined) {
		return [];
	}

	if (!Array.isArray(value)) {
		throw new Error("tags must be an array of strings");
	}

	return value.map((tag) => requireString(tag, "tag"));
};

const parseFields = (value: unknown): Record<string, string> => {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("fields must be an object");
	}

	const entries = Object.entries(value).map(([key, fieldValue]) => {
		if (typeof fieldValue === "string") {
			return [key, fieldValue] as const;
		}

		if (typeof fieldValue === "number" || typeof fieldValue === "boolean") {
			return [key, String(fieldValue)] as const;
		}

		throw new Error(`Field '${key}' must be a string, number, or boolean`);
	});

	if (entries.length === 0) {
		throw new Error("fields must include at least one field");
	}

	return Object.fromEntries(entries);
};

const parseStringRecord = (value: Record<string, unknown>): Record<string, string> =>
	Object.fromEntries(
		Object.entries(value).map(([key, fieldValue]) => {
			if (typeof fieldValue === "string") {
				return [key, fieldValue] as const;
			}

			if (typeof fieldValue === "number" || typeof fieldValue === "boolean") {
				return [key, String(fieldValue)] as const;
			}

			throw new Error(`Field '${key}' must be a string, number, or boolean`);
		})
	);

const parseNoteInput = (value: unknown, index?: number): NoteInput => {
	const label = index === undefined ? "note" : `notes[${index}]`;
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${label} must be an object`);
	}

	const data = value as Record<string, unknown>;
	return {
		type: requireString(data.type, `${label}.type`),
		deck: requireString(data.deck, `${label}.deck`),
		fields: parseFields(data.fields),
		tags: parseTags(data.tags),
	};
};

const normalizeFields = (
	modelName: string,
	modelFields: string[],
	inputFields: Record<string, string>
): Record<string, string> => {
	const allowedNames = new Set([
		...modelFields,
		...modelFields.map((field) => field.toLowerCase()),
	]);
	const unknownFields = Object.keys(inputFields).filter((field) => !allowedNames.has(field));

	if (unknownFields.length > 0) {
		throw new Error(
			`Unknown field(s) for '${modelName}': ${unknownFields.join(", ")}. Valid fields: ${modelFields.join(", ")}`
		);
	}

	return Object.fromEntries(
		modelFields.map((field) => [
			field,
			inputFields[field] ?? inputFields[field.toLowerCase()] ?? "",
		])
	);
};

/**
 * Handles all MCP tool operations for Anki.
 */
export class McpToolHandler {
	private readonly ankiClient: AnkiClient;
	private readonly onCatalogChanged?: () => void;

	constructor(ankiClient?: AnkiClient, onCatalogChanged?: () => void) {
		this.ankiClient = ankiClient ?? new AnkiClient();
		this.onCatalogChanged = onCatalogChanged;
	}

	async getToolSchema(): Promise<ListToolsResult> {
		return { tools: TOOLS };
	}

	async executeTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
		try {
			const toolName = LEGACY_TOOL_ALIASES[name] ?? name;

			switch (toolName) {
				case "anki_check_connection":
					return await this.checkConnection();
				case "anki_list_decks":
					return await this.listDecks();
				case "anki_sync":
					return await this.sync();
				case "anki_create_deck":
					return await this.createDeck(args);
				case "anki_list_note_types":
					return await this.listNoteTypes();
				case "anki_get_note_type_info":
					return await this.getNoteTypeInfo(args);
				case "anki_create_note":
					return await this.createNote(args);
				case "anki_batch_create_notes":
					return await this.batchCreateNotes(args);
				case "anki_search_notes":
					return await this.searchNotes(args);
				case "anki_get_note_info":
					return await this.getNoteInfo(args);
				case "anki_update_note":
					return await this.updateNote(args);
				case "anki_delete_note":
					return await this.deleteNote(args);
				case "anki_create_note_type":
					return await this.createNoteType(args);
				default: {
					const modelName = this.resolveDynamicModelName(name);
					if (modelName) {
						return await this.createModelSpecificNote(modelName, args);
					}

					throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
				}
			}
		} catch (error) {
			if (error instanceof McpError) {
				throw error;
			}

			return errorResult(error);
		}
	}

	private resolveDynamicModelName(name: string): string | null {
		const match = name.match(/^create_(.+)_note$/) ?? name.match(/^anki_create_(.+)_note$/);
		return match ? match[1].replace(/_/g, " ") : null;
	}

	private async checkConnection(): Promise<CallToolResult> {
		const version = await this.ankiClient.getVersion();
		return result({ connected: true, version });
	}

	private async sync(): Promise<CallToolResult> {
		await this.ankiClient.sync();
		return result({
			success: true,
			message:
				"Sync requested. AnkiConnect does not confirm completion; check Anki for pending dialogs if changes do not appear on AnkiWeb.",
		});
	}

	private async listDecks(): Promise<CallToolResult> {
		const decks = await this.ankiClient.getDeckNames();
		return result({ decks, count: decks.length });
	}

	private async createDeck(args: Record<string, unknown>): Promise<CallToolResult> {
		const name = requireString(args.name, "name");
		const deckId = await this.ankiClient.createDeck(name);
		return result({ deckId, name });
	}

	private async listNoteTypes(): Promise<CallToolResult> {
		const noteTypes = await this.ankiClient.getModelNames();
		return result({ noteTypes, count: noteTypes.length });
	}

	private async createNoteType(args: Record<string, unknown>): Promise<CallToolResult> {
		const name = requireString(args.name, "name");
		const fields = requireStringArray(args.fields, "fields");
		const css = args.css === undefined ? "" : String(args.css);
		const templates = this.parseTemplates(args.templates);

		const existingModels = await this.ankiClient.getModelNames();
		if (existingModels.includes(name)) {
			throw new Error(`Note type already exists: ${name}`);
		}

		await this.ankiClient.createModel({
			modelName: name,
			inOrderFields: fields,
			css,
			cardTemplates: templates,
		});
		this.onCatalogChanged?.();

		return result({
			success: true,
			modelName: name,
			fields,
			templates: templates.length,
		});
	}

	private parseTemplates(value: unknown): { name: string; front: string; back: string }[] {
		if (!Array.isArray(value) || value.length === 0) {
			throw new Error("templates must be a non-empty array");
		}

		return value.map((template, index) => {
			if (!template || typeof template !== "object" || Array.isArray(template)) {
				throw new Error(`templates[${index}] must be an object`);
			}

			const data = template as Record<string, unknown>;
			return {
				name: requireString(data.name, `templates[${index}].name`),
				front: requireString(data.front, `templates[${index}].front`),
				back: requireString(data.back, `templates[${index}].back`),
			};
		});
	}

	private async getNoteTypeInfo(args: Record<string, unknown>): Promise<CallToolResult> {
		const modelName = requireString(args.modelName, "modelName");
		const includeCss = optionalBoolean(args.includeCss, false);
		await this.requireModel(modelName);

		const [fields, templates] = await Promise.all([
			this.ankiClient.getModelFieldNames(modelName),
			this.ankiClient.getModelTemplates(modelName),
		]);

		if (!includeCss) {
			return result({ modelName, fields, templates });
		}

		const styling = await this.ankiClient.getModelStyling(modelName);
		return result({ modelName, fields, templates, css: styling.css });
	}

	private async createNote(args: Record<string, unknown>): Promise<CallToolResult> {
		const note = parseNoteInput(args);
		const allowDuplicate = optionalBoolean(args.allowDuplicate, false);
		const modelFields = await this.prepareDeckAndModel(note.deck, note.type);
		const fields = normalizeFields(note.type, modelFields, note.fields);
		const payload = {
			deckName: note.deck,
			modelName: note.type,
			fields,
			tags: note.tags,
			options: { allowDuplicate },
		};

		await this.requireCanAddNote(payload);
		const noteId = await this.ankiClient.addNote(payload);
		if (noteId === null) {
			throw new Error("Anki rejected note creation without returning a note ID.");
		}

		return result({ noteId, deck: note.deck, modelName: note.type });
	}

	private async createModelSpecificNote(
		modelName: string,
		args: Record<string, unknown>
	): Promise<CallToolResult> {
		const deck = requireString(args.deck, "deck");
		const tags = parseTags(args.tags);
		const modelFields = await this.prepareDeckAndModel(deck, modelName);
		const fieldArgs = Object.fromEntries(
			Object.entries(args).filter(([key]) => key !== "deck" && key !== "tags")
		);
		const fields = normalizeFields(modelName, modelFields, parseStringRecord(fieldArgs));
		const payload = { deckName: deck, modelName, fields, tags };

		await this.requireCanAddNote(payload);
		const noteId = await this.ankiClient.addNote(payload);
		if (noteId === null) {
			throw new Error("Anki rejected note creation without returning a note ID.");
		}

		return result({ noteId, deck, modelName });
	}

	private async batchCreateNotes(args: Record<string, unknown>): Promise<CallToolResult> {
		if (!Array.isArray(args.notes) || args.notes.length === 0) {
			throw new Error("notes must be a non-empty array");
		}

		if (args.notes.length > 50) {
			throw new Error("notes cannot contain more than 50 items");
		}

		const notes = args.notes.map((note, index) => parseNoteInput(note, index));
		const allowDuplicate = optionalBoolean(args.allowDuplicate, false);
		const stopOnError = optionalBoolean(args.stopOnError, false);
		const knownDecks = new Set(await this.ankiClient.getDeckNames());
		const knownModels = new Set(await this.ankiClient.getModelNames());
		const fieldsCache = new Map<string, string[]>();
		let results: BatchNoteResult[] = [];

		for (let index = 0; index < notes.length; index++) {
			try {
				const note = notes[index];
				if (!knownModels.has(note.type)) {
					throw new Error(`Note type not found: ${note.type}`);
				}

				if (!knownDecks.has(note.deck)) {
					await this.ankiClient.createDeck(note.deck);
					knownDecks.add(note.deck);
				}

				const modelFields = await this.getCachedModelFields(note.type, fieldsCache);
				const fields = normalizeFields(note.type, modelFields, note.fields);
				const payload = {
					deckName: note.deck,
					modelName: note.type,
					fields,
					tags: note.tags,
					options: { allowDuplicate },
				};

				await this.requireCanAddNote(payload);
				const noteId = await this.ankiClient.addNote(payload);
				if (noteId === null) {
					throw new Error("Anki rejected note creation without returning a note ID.");
				}

				results = [...results, { success: true, noteId, index }];
			} catch (error) {
				results = [...results, { success: false, error: errorMessage(error), index }];
				if (stopOnError) {
					break;
				}
			}
		}

		const successful = results.filter((item) => item.success).length;
		const failed = results.filter((item) => !item.success).length;
		return result(
			{
				results,
				total: notes.length,
				successful,
				failed,
			},
			{ isError: failed > 0 }
		);
	}

	private async searchNotes(args: Record<string, unknown>): Promise<CallToolResult> {
		const query = requireString(args.query, "query");
		const limit = optionalInteger(args.limit, "limit", 20, 1, 100);
		const offset = optionalInteger(args.offset, "offset", 0, 0);
		const noteIds = await this.ankiClient.findNotes(query);
		const selectedIds = noteIds.slice(offset, offset + limit);
		const notes = selectedIds.length > 0 ? await this.ankiClient.notesInfo(selectedIds) : [];
		const nextOffset = offset + notes.length;
		const hasMore = nextOffset < noteIds.length;

		return result({
			query,
			total: noteIds.length,
			offset,
			limit,
			notes,
			hasMore,
			...(hasMore ? { nextOffset } : {}),
		});
	}

	private async getNoteInfo(args: Record<string, unknown>): Promise<CallToolResult> {
		const noteId = requirePositiveInteger(args.noteId, "noteId");
		const note = await this.requireNote(noteId);
		return result(note as unknown as Record<string, unknown>);
	}

	private async updateNote(args: Record<string, unknown>): Promise<CallToolResult> {
		const id = requirePositiveInteger(args.id, "id");
		const fields = args.fields === undefined ? undefined : parseFields(args.fields);
		const tags = args.tags === undefined ? undefined : parseTags(args.tags);

		if (fields === undefined && tags === undefined) {
			throw new Error("Provide fields and/or tags to update");
		}

		await this.requireNote(id);

		if (fields !== undefined) {
			await this.ankiClient.updateNoteFields({ id, fields });
		}

		if (tags !== undefined) {
			await this.ankiClient.updateNoteTags({ id, tags });
		}

		return result({
			success: true,
			noteId: id,
			updatedFields: fields !== undefined,
			updatedTags: tags !== undefined,
		});
	}

	private async deleteNote(args: Record<string, unknown>): Promise<CallToolResult> {
		const hasNoteId = args.noteId !== undefined;
		const hasNoteIds = args.noteIds !== undefined;

		if (hasNoteId === hasNoteIds) {
			throw new Error("Provide exactly one of noteId or noteIds");
		}

		const noteIds = hasNoteId
			? [requirePositiveInteger(args.noteId, "noteId")]
			: this.parseNoteIds(args.noteIds);

		await this.ankiClient.deleteNotes(noteIds);
		return result({
			success: true,
			deletedCount: noteIds.length,
			noteIds,
		});
	}

	private parseNoteIds(value: unknown): number[] {
		if (!Array.isArray(value) || value.length === 0) {
			throw new Error("noteIds must be a non-empty array");
		}

		return value.map((id, index) => requirePositiveInteger(id, `noteIds[${index}]`));
	}

	private async prepareDeckAndModel(deckName: string, modelName: string): Promise<string[]> {
		const [decks, modelFields] = await Promise.all([
			this.ankiClient.getDeckNames(),
			this.getModelFields(modelName),
		]);

		if (!decks.includes(deckName)) {
			await this.ankiClient.createDeck(deckName);
		}

		return modelFields;
	}

	private async requireModel(modelName: string): Promise<void> {
		const models = await this.ankiClient.getModelNames();
		if (!models.includes(modelName)) {
			throw new Error(`Note type not found: ${modelName}`);
		}
	}

	private async getModelFields(
		modelName: string,
		cache?: Map<string, string[]>
	): Promise<string[]> {
		await this.requireModel(modelName);
		return this.getCachedModelFields(modelName, cache);
	}

	private async getCachedModelFields(
		modelName: string,
		cache?: Map<string, string[]>
	): Promise<string[]> {
		const cached = cache?.get(modelName);
		if (cached) {
			return cached;
		}

		const fields = await this.ankiClient.getModelFieldNames(modelName);
		cache?.set(modelName, fields);
		return fields;
	}

	private async requireCanAddNote(note: {
		deckName: string;
		modelName: string;
		fields: Record<string, string>;
		tags?: string[];
		options?: { allowDuplicate?: boolean };
	}): Promise<void> {
		const [check] = await this.ankiClient.canAddNotesWithErrorDetail([note]);
		if (!check?.canAdd) {
			throw new Error(
				`Cannot create note: ${check && "error" in check ? check.error : "Anki rejected the note"}`
			);
		}
	}

	private async requireNote(noteId: number): Promise<AnkiNoteInfo> {
		const notes = await this.ankiClient.notesInfo([noteId]);
		const note = notes[0];
		if (!note) {
			throw new Error(`Note not found: ${noteId}`);
		}

		return note;
	}
}
