import type { Tool } from "@modelcontextprotocol/sdk/types.js";

type JsonObjectSchema = {
	type: "object";
	properties?: Record<string, object>;
	required?: string[];
	additionalProperties?: boolean | object;
	[key: string]: unknown;
};

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

export const TOOLS: Tool[] = [
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

export const LEGACY_TOOL_ALIASES: Record<string, string> = {
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
