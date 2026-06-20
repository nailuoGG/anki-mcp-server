import { describe, expect, it, jest } from "@jest/globals";
import { ErrorCode, McpError, type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { McpToolHandler } from "./mcpTools.js";
import type { AnkiClient } from "./utils.js";

const sampleNote = {
	noteId: 1234567890,
	modelName: "Basic",
	tags: ["programming"],
	fields: {
		Front: { value: "What is MCP?", order: 0 },
		Back: { value: "Model Context Protocol", order: 1 },
	},
};

const textJson = (result: CallToolResult) => {
	const content = result.content[0];
	if (content.type !== "text") {
		throw new Error("Expected text content");
	}

	return JSON.parse(content.text);
};

const createMockClient = (overrides: Partial<Record<keyof AnkiClient, unknown>> = {}) =>
	({
		getVersion: jest.fn<() => Promise<number>>().mockResolvedValue(6),
		sync: jest.fn<() => Promise<void>>().mockResolvedValue(),
		checkConnection: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
		getDeckNames: jest.fn<() => Promise<string[]>>().mockResolvedValue(["Default"]),
		getDeckNamesAndIds: jest
			.fn<() => Promise<Record<string, number>>>()
			.mockResolvedValue({ Default: 1 }),
		createDeck: jest.fn<(name: string) => Promise<number>>().mockResolvedValue(42),
		getTags: jest.fn<() => Promise<string[]>>().mockResolvedValue(["programming"]),
		getModelNames: jest.fn<() => Promise<string[]>>().mockResolvedValue(["Basic", "Cloze"]),
		getModelFieldNames: jest
			.fn<(modelName: string) => Promise<string[]>>()
			.mockResolvedValue(["Front", "Back"]),
		getModelTemplates: jest
			.fn<(modelName: string) => Promise<Record<string, { Front: string; Back: string }>>>()
			.mockResolvedValue({
				Card: { Front: "{{Front}}", Back: "{{Back}}" },
			}),
		getModelStyling: jest.fn<(modelName: string) => Promise<{ css: string }>>().mockResolvedValue({
			css: ".card {}",
		}),
		createModel: jest.fn<AnkiClient["createModel"]>().mockResolvedValue(),
		addNote: jest.fn<AnkiClient["addNote"]>().mockResolvedValue(777),
		addNotes: jest.fn<AnkiClient["addNotes"]>().mockResolvedValue([777]),
		canAddNotesWithErrorDetail: jest
			.fn<AnkiClient["canAddNotesWithErrorDetail"]>()
			.mockResolvedValue([{ canAdd: true }]),
		findNotes: jest.fn<(query: string) => Promise<number[]>>().mockResolvedValue([1, 2, 3]),
		notesInfo: jest.fn<AnkiClient["notesInfo"]>().mockResolvedValue([sampleNote]),
		updateNoteFields: jest.fn<AnkiClient["updateNoteFields"]>().mockResolvedValue(),
		updateNoteTags: jest.fn<AnkiClient["updateNoteTags"]>().mockResolvedValue(),
		addTags: jest.fn<AnkiClient["addTags"]>().mockResolvedValue(),
		removeTags: jest.fn<AnkiClient["removeTags"]>().mockResolvedValue(),
		deleteNotes: jest.fn<(ids: number[]) => Promise<void>>().mockResolvedValue(),
		...overrides,
	}) as unknown as AnkiClient;

describe("McpToolHandler schema", () => {
	it("exposes agent-friendly anki-prefixed tools with modern metadata", async () => {
		const handler = new McpToolHandler(createMockClient());
		const schema = await handler.getToolSchema();
		const names = schema.tools.map((tool) => tool.name);

		expect(names).toContain("anki_create_note");
		expect(names).toContain("anki_batch_create_notes");
		expect(names).toContain("anki_check_connection");
		expect(names).toContain("anki_list_tags");
		expect(names).not.toContain("create_note");

		const createNote = schema.tools.find((tool) => tool.name === "anki_create_note");
		expect(createNote?.outputSchema).toBeDefined();
		expect(createNote?.annotations).toMatchObject({
			readOnlyHint: false,
			destructiveHint: false,
			openWorldHint: false,
		});

		const listDecks = schema.tools.find((tool) => tool.name === "anki_list_decks");
		expect(listDecks?.inputSchema).toMatchObject({
			type: "object",
			additionalProperties: false,
		});
		expect(listDecks?.annotations).toMatchObject({ readOnlyHint: true });

		const addTags = schema.tools.find((tool) => tool.name === "anki_add_note_tags");
		expect(addTags?.inputSchema).toMatchObject({
			oneOf: [{ required: ["noteId"] }, { required: ["noteIds"] }],
		});
		expect(addTags?.annotations).toMatchObject({
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
		});
	});

	it("keeps legacy tool names callable without advertising them", async () => {
		const handler = new McpToolHandler(createMockClient());

		const result = await handler.executeTool("list_decks", {});

		expect(result.structuredContent).toEqual({
			decks: ["Default"],
			count: 1,
		});
		expect(textJson(result)).toEqual(result.structuredContent);
	});

	it("returns tool execution errors as isError results", async () => {
		const handler = new McpToolHandler(
			createMockClient({
				getDeckNames: jest.fn<() => Promise<string[]>>().mockRejectedValue(new Error("Anki is off")),
			})
		);

		const result = await handler.executeTool("anki_list_decks", {});

		expect(result.isError).toBe(true);
		expect(result.content[0]).toMatchObject({
			type: "text",
			text: "Error: Anki is off",
		});
	});

	it("lists decks with optional ID metadata", async () => {
		const handler = new McpToolHandler(createMockClient());

		const result = await handler.executeTool("anki_list_decks", { includeIds: true });

		expect(result.structuredContent).toEqual({
			decks: ["Default"],
			deckIds: { Default: 1 },
			count: 1,
		});
	});

	it("throws protocol errors for unknown tools", async () => {
		const handler = new McpToolHandler(createMockClient());

		await expect(handler.executeTool("missing_tool", {})).rejects.toMatchObject({
			code: ErrorCode.MethodNotFound,
		} satisfies Partial<McpError>);
	});
});

describe("McpToolHandler note workflows", () => {
	it("creates a note with preflight validation and structured output", async () => {
		const addNote = jest.fn<AnkiClient["addNote"]>().mockResolvedValue(456);
		const canAddNotesWithErrorDetail = jest
			.fn<AnkiClient["canAddNotesWithErrorDetail"]>()
			.mockResolvedValue([{ canAdd: true }]);
		const client = createMockClient({ addNote, canAddNotesWithErrorDetail });
		const handler = new McpToolHandler(client);

		const result = await handler.executeTool("anki_create_note", {
			type: "Basic",
			deck: "Programming",
			fields: { front: "Q", Back: "A" },
			tags: ["mcp"],
		});

		expect((client.createDeck as jest.Mock)).toHaveBeenCalledWith("Programming");
		expect(canAddNotesWithErrorDetail).toHaveBeenCalledWith([
			{
				deckName: "Programming",
				modelName: "Basic",
				fields: { Front: "Q", Back: "A" },
				tags: ["mcp"],
				options: { allowDuplicate: false },
			},
		]);
		expect(addNote).toHaveBeenCalledWith({
			deckName: "Programming",
			modelName: "Basic",
			fields: { Front: "Q", Back: "A" },
			tags: ["mcp"],
			options: { allowDuplicate: false },
		});
		expect(result.structuredContent).toEqual({
			noteId: 456,
			deck: "Programming",
			modelName: "Basic",
		});
	});

	it("treats null note IDs as failed note creation", async () => {
		const handler = new McpToolHandler(
			createMockClient({
				addNote: jest.fn<AnkiClient["addNote"]>().mockResolvedValue(null),
			})
		);

		const result = await handler.executeTool("anki_create_note", {
			type: "Basic",
			deck: "Default",
			fields: { Front: "Q", Back: "A" },
		});

		expect(result.isError).toBe(true);
		expect(result.content[0]).toMatchObject({
			type: "text",
			text: "Error: Anki rejected note creation without returning a note ID.",
		});
	});

	it("batch creates notes with cached model/deck lookups and per-note errors", async () => {
		const getModelFieldNames = jest
			.fn<(modelName: string) => Promise<string[]>>()
			.mockResolvedValue(["Front", "Back"]);
		const addNotes = jest.fn<AnkiClient["addNotes"]>().mockResolvedValue([101, null]);
		const canAddNotesWithErrorDetail = jest
			.fn<AnkiClient["canAddNotesWithErrorDetail"]>()
			.mockResolvedValue([{ canAdd: true }, { canAdd: true }]);
		const client = createMockClient({
			getModelFieldNames,
			addNotes,
			canAddNotesWithErrorDetail,
			getDeckNames: jest.fn<() => Promise<string[]>>().mockResolvedValue(["Default"]),
			getModelNames: jest.fn<() => Promise<string[]>>().mockResolvedValue(["Basic"]),
		});
		const handler = new McpToolHandler(client);

		const result = await handler.executeTool("anki_batch_create_notes", {
			notes: [
				{ type: "Basic", deck: "Default", fields: { Front: "Q1", Back: "A1" } },
				{ type: "Basic", deck: "Default", fields: { Front: "Q2", Back: "A2" } },
			],
		});

		expect(result.isError).toBe(true);
		expect(getModelFieldNames).toHaveBeenCalledTimes(1);
		expect(addNotes).toHaveBeenCalledTimes(1);
		expect(result.structuredContent).toMatchObject({
			total: 2,
			successful: 1,
			failed: 1,
			results: [
				{ success: true, noteId: 101, index: 0 },
				{
					success: false,
					index: 1,
					error: "Anki rejected note creation without returning a note ID.",
				},
			],
		});
	});

	it("preflights batch notes once and only submits creatable notes", async () => {
		const addNotes = jest.fn<AnkiClient["addNotes"]>().mockResolvedValue([202]);
		const canAddNotesWithErrorDetail = jest
			.fn<AnkiClient["canAddNotesWithErrorDetail"]>()
			.mockResolvedValue([{ canAdd: false, error: "duplicate" }, { canAdd: true }]);
		const client = createMockClient({
			addNotes,
			canAddNotesWithErrorDetail,
			getDeckNames: jest.fn<() => Promise<string[]>>().mockResolvedValue(["Default"]),
			getModelNames: jest.fn<() => Promise<string[]>>().mockResolvedValue(["Basic"]),
		});
		const handler = new McpToolHandler(client);

		const result = await handler.executeTool("anki_batch_create_notes", {
			notes: [
				{ type: "Basic", deck: "Default", fields: { Front: "Q1", Back: "A1" } },
				{ type: "Basic", deck: "Default", fields: { Front: "Q2", Back: "A2" } },
			],
		});

		expect(canAddNotesWithErrorDetail).toHaveBeenCalledTimes(1);
		expect(addNotes).toHaveBeenCalledWith([
			{
				deckName: "Default",
				modelName: "Basic",
				fields: { Front: "Q2", Back: "A2" },
				tags: [],
				options: { allowDuplicate: false },
			},
		]);
		expect(result.structuredContent).toMatchObject({
			successful: 1,
			failed: 1,
			results: [
				{ success: false, index: 0, error: "Cannot create note: duplicate" },
				{ success: true, index: 1, noteId: 202 },
			],
		});
	});

	it("rejects oversized batches before calling Anki", async () => {
		const client = createMockClient();
		const handler = new McpToolHandler(client);

		const result = await handler.executeTool("anki_batch_create_notes", {
			notes: Array.from({ length: 51 }, () => ({
				type: "Basic",
				deck: "Default",
				fields: { Front: "Q", Back: "A" },
			})),
		});

		expect(result.isError).toBe(true);
		expect(client.getDeckNames).not.toHaveBeenCalled();
	});
});

describe("McpToolHandler maintenance workflows", () => {
	it("searches notes with limit and offset metadata", async () => {
		const client = createMockClient({
			findNotes: jest.fn<(query: string) => Promise<number[]>>().mockResolvedValue([10, 11, 12]),
			notesInfo: jest.fn<AnkiClient["notesInfo"]>().mockResolvedValue([sampleNote]),
		});
		const handler = new McpToolHandler(client);

		const result = await handler.executeTool("anki_search_notes", {
			query: "deck:Default",
			limit: 1,
			offset: 1,
		});

		expect(client.notesInfo).toHaveBeenCalledWith([11]);
		expect(result.structuredContent).toMatchObject({
			query: "deck:Default",
			total: 3,
			offset: 1,
			limit: 1,
			hasMore: true,
			nextOffset: 2,
			notes: [sampleNote],
		});
	});

	it("updates fields and tags when both are provided", async () => {
		const client = createMockClient();
		const handler = new McpToolHandler(client);

		const result = await handler.executeTool("anki_update_note", {
			id: 1234567890,
			fields: { Front: "Updated" },
			tags: ["updated"],
		});

		expect(client.updateNoteFields).toHaveBeenCalledWith({
			id: 1234567890,
			fields: { Front: "Updated" },
		});
		expect(client.updateNoteTags).toHaveBeenCalledWith({
			id: 1234567890,
			tags: ["updated"],
		});
		expect(result.structuredContent).toEqual({
			success: true,
			noteId: 1234567890,
			updatedFields: true,
			updatedTags: true,
		});
	});

	it("lists and mutates tags for notes", async () => {
		const client = createMockClient();
		const handler = new McpToolHandler(client);

		const listed = await handler.executeTool("list_tags", {});
		const added = await handler.executeTool("anki_add_note_tags", {
			noteIds: [1234567890, 9876543210],
			tags: ["programming", "mcp"],
		});
		const removed = await handler.executeTool("anki_remove_note_tags", {
			noteId: 1234567890,
			tags: ["mcp"],
		});

		expect(listed.structuredContent).toEqual({
			tags: ["programming"],
			count: 1,
		});
		expect(client.addTags).toHaveBeenCalledWith({
			noteIds: [1234567890, 9876543210],
			tags: ["programming", "mcp"],
		});
		expect(added.structuredContent).toEqual({
			success: true,
			operation: "added",
			noteIds: [1234567890, 9876543210],
			tags: ["programming", "mcp"],
			updatedCount: 2,
		});
		expect(client.removeTags).toHaveBeenCalledWith({
			noteIds: [1234567890],
			tags: ["mcp"],
		});
		expect(removed.structuredContent).toEqual({
			success: true,
			operation: "removed",
			noteIds: [1234567890],
			tags: ["mcp"],
			updatedCount: 1,
		});
	});

	it("rejects whitespace tags for add/remove tag operations", async () => {
		const handler = new McpToolHandler(createMockClient());

		const result = await handler.executeTool("anki_add_note_tags", {
			noteId: 1234567890,
			tags: ["two words"],
		});

		expect(result.isError).toBe(true);
		expect(result.content[0]).toMatchObject({
			type: "text",
			text: "Error: tags must not contain whitespace for this operation: two words",
		});
	});

	it("deletes a single note through the legacy alias", async () => {
		const client = createMockClient();
		const handler = new McpToolHandler(client);

		const result = await handler.executeTool("delete_note", { noteId: 1234567890 });

		expect(client.deleteNotes).toHaveBeenCalledWith([1234567890]);
		expect(result.structuredContent).toEqual({
			success: true,
			deletedCount: 1,
			noteIds: [1234567890],
		});
	});
});
