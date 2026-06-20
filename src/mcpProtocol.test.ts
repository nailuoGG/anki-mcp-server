import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { AnkiMcpServer } from "./ankiMcpServer.js";
import type { AnkiClient } from "./utils.js";

const sampleNote = {
	noteId: 1234567890,
	modelName: "Basic",
	tags: ["protocol"],
	fields: {
		Front: { value: "What is MCP?", order: 0 },
		Back: { value: "Model Context Protocol", order: 1 },
	},
};

type ProtocolHarness = {
	client: Client;
	server: AnkiMcpServer;
	ankiClient: AnkiClient;
	close(): Promise<void>;
};

const activeHarnesses: ProtocolHarness[] = [];

const createMockClient = (overrides: Partial<Record<keyof AnkiClient, unknown>> = {}) =>
	({
		getVersion: jest.fn<() => Promise<number>>().mockResolvedValue(6),
		sync: jest.fn<() => Promise<void>>().mockResolvedValue(),
		checkConnection: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
		getDeckNames: jest.fn<() => Promise<string[]>>().mockResolvedValue(["Default"]),
		createDeck: jest.fn<(name: string) => Promise<number>>().mockResolvedValue(42),
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
		canAddNotesWithErrorDetail: jest
			.fn<AnkiClient["canAddNotesWithErrorDetail"]>()
			.mockResolvedValue([{ canAdd: true }]),
		findNotes: jest.fn<(query: string) => Promise<number[]>>().mockResolvedValue([1234567890]),
		notesInfo: jest.fn<AnkiClient["notesInfo"]>().mockResolvedValue([sampleNote]),
		updateNoteFields: jest.fn<AnkiClient["updateNoteFields"]>().mockResolvedValue(),
		updateNoteTags: jest.fn<AnkiClient["updateNoteTags"]>().mockResolvedValue(),
		deleteNotes: jest.fn<(ids: number[]) => Promise<void>>().mockResolvedValue(),
		...overrides,
	}) as unknown as AnkiClient;

const createHarness = async (
	overrides: Partial<Record<keyof AnkiClient, unknown>> = {}
): Promise<ProtocolHarness> => {
	const ankiClient = createMockClient(overrides);
	const server = new AnkiMcpServer(8765, "localhost", {
		ankiClient,
		registerSignalHandlers: false,
	});
	const client = new Client({ name: "anki-mcp-test-client", version: "1.0.0" }, { capabilities: {} });
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

	await server.connect(serverTransport);
	await client.connect(clientTransport);

	const harness = {
		client,
		server,
		ankiClient,
		close: async () => {
			await client.close();
			await server.close();
		},
	};
	activeHarnesses.push(harness);
	return harness;
};

const firstTextContent = (content: unknown): string => {
	if (!Array.isArray(content)) {
		throw new Error("Expected MCP content array");
	}

	const [first] = content as { type?: unknown; text?: unknown }[];
	if (first?.type !== "text" || typeof first.text !== "string") {
		throw new Error("Expected first MCP content block to be text");
	}

	return first.text;
};

const firstResourceText = (contents: { text?: string; blob?: string }[]): string => {
	const [first] = contents;
	if (!first || typeof first.text !== "string") {
		throw new Error("Expected first MCP resource content to be text");
	}

	return first.text;
};

afterEach(async () => {
	await Promise.all(activeHarnesses.splice(0).map((harness) => harness.close()));
});

describe("MCP protocol integration", () => {
	it("lists tools without connecting to Anki", async () => {
		const getVersion = jest.fn<() => Promise<number>>().mockRejectedValue(new Error("Anki is off"));
		const { client } = await createHarness({ getVersion });

		const tools = await client.listTools();

		expect(tools.tools.map((tool) => tool.name)).toContain("anki_create_note");
		expect(tools.tools.find((tool) => tool.name === "anki_create_note")).toMatchObject({
			outputSchema: expect.any(Object),
			annotations: expect.objectContaining({
				readOnlyHint: false,
				openWorldHint: false,
			}),
		});
		expect(getVersion).not.toHaveBeenCalled();
	});

	it("returns structuredContent and matching text JSON for tool calls", async () => {
		const { client } = await createHarness();

		const result = await client.callTool({
			name: "anki_list_decks",
			arguments: {},
		});

		expect(result.structuredContent).toEqual({
			decks: ["Default"],
			count: 1,
		});
		expect(firstTextContent(result.content)).toBe(
			JSON.stringify(result.structuredContent, null, 2)
		);
	});

	it("reports Anki execution failures as tool errors", async () => {
		const { client } = await createHarness({
			getDeckNames: jest.fn<() => Promise<string[]>>().mockRejectedValue(new Error("Anki is off")),
		});

		const result = await client.callTool({
			name: "anki_list_decks",
			arguments: {},
		});

		expect(result.isError).toBe(true);
		expect(firstTextContent(result.content)).toBe("Error: Anki is off");
	});

	it("reads resources through the MCP resource protocol", async () => {
		const { client, ankiClient } = await createHarness();

		const listed = await client.listResources();
		const resource = await client.readResource({ uri: "anki://decks/all" });

		expect(listed.resources).toContainEqual(
			expect.objectContaining({
				uri: "anki://decks/all",
				mimeType: "application/json",
			})
		);
		expect(JSON.parse(firstResourceText(resource.contents))).toEqual({
			decks: ["Default"],
			count: 1,
		});
		expect(ankiClient.checkConnection).toHaveBeenCalled();
	});
});
