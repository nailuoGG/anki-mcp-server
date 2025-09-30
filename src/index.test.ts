import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { AnkiClient, AnkiConnectionError } from "./utils.js";
import { McpToolHandler } from "./mcpTools.js";
import { McpResourceHandler } from "./mcpResource.js";
import { AnkiMcpServer } from "./ankiMcpServer.js";

// Mock yanki-connect
jest.mock("yanki-connect", () => ({
	YankiConnect: jest.fn().mockImplementation(() => ({
		invoke: jest.fn(),
		deck: {
			deckNames: jest.fn(),
			createDeck: jest.fn(),
		},
		model: {
			modelNames: jest.fn(),
			modelFieldNames: jest.fn(),
			modelTemplates: jest.fn(),
			modelStyling: jest.fn(),
			createModel: jest.fn(),
		},
		note: {
			addNote: jest.fn(),
			addNotes: jest.fn(),
			findNotes: jest.fn(),
			notesInfo: jest.fn(),
			updateNoteFields: jest.fn(),
			deleteNotes: jest.fn(),
		},
	})),
}));

describe("Anki MCP Server - Core Tests", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should handle AnkiClient connection errors properly", async () => {
		const ankiClient = new AnkiClient();

		// Mock connection failure
		const mockInvoke = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));
		(ankiClient as any).client.invoke = mockInvoke;

		await expect(ankiClient.checkConnection()).rejects.toThrow(
			AnkiConnectionError,
		);
	});

	it("should generate correct tool schema for McpToolHandler", async () => {
		const toolHandler = new McpToolHandler();
		const schema = await toolHandler.getToolSchema();

		expect(schema.tools).toHaveLength(11);
		expect(schema.tools.some((tool) => tool.name === "list_decks")).toBe(true);
		expect(schema.tools.some((tool) => tool.name === "create_note")).toBe(true);
		expect(
			schema.tools.some((tool) => tool.name === "batch_create_notes"),
		).toBe(true);
	});

	it("should handle note creation with proper validation", async () => {
		const toolHandler = new McpToolHandler();

		// Mock AnkiClient methods
		const mockAnkiClient = {
			checkConnection: jest.fn().mockResolvedValue(true),
			getDeckNames: jest.fn().mockResolvedValue(["Default"]),
			getModelNames: jest.fn().mockResolvedValue(["Basic"]),
			getModelFieldNames: jest.fn().mockResolvedValue(["Front", "Back"]),
			addNote: jest.fn().mockResolvedValue(12345),
		};
		(toolHandler as any).ankiClient = mockAnkiClient;

		const result = await toolHandler.executeTool("create_note", {
			type: "Basic",
			deck: "Default",
			fields: { Front: "Test question", Back: "Test answer" },
		});

		expect(result.content[0].text).toContain("12345");
		expect(mockAnkiClient.addNote).toHaveBeenCalled();
	});

	it("should list resources correctly in McpResourceHandler", async () => {
		const resourceHandler = new McpResourceHandler();

		// Mock AnkiClient
		const mockAnkiClient = {
			checkConnection: jest.fn().mockResolvedValue(true),
		};
		(resourceHandler as any).ankiClient = mockAnkiClient;

		const resources = await resourceHandler.listResources();

		expect(resources.resources).toHaveLength(1);
		expect(resources.resources[0].uri).toBe("anki://decks/all");
		expect(resources.resources[0].name).toBe("All Decks");
	});

	it("should initialize AnkiMcpServer with correct configuration", () => {
		const server = new AnkiMcpServer(8765);

		expect(server).toBeInstanceOf(AnkiMcpServer);
		// Verify server is properly configured
		expect((server as any).ankiClient).toBeDefined();
		expect((server as any).resourceHandler).toBeDefined();
		expect((server as any).toolHandler).toBeDefined();
	});
});
