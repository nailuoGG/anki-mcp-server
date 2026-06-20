import { describe, expect, it, jest } from "@jest/globals";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { McpToolHandler } from "./mcpTools.js";
import type { AnkiClient } from "./utils.js";

type ToolResponse = {
	content: {
		type: string;
		text: string;
	}[];
};

type DeleteNoteArgs = {
	noteId?: number;
	noteIds?: number[];
};

type DeleteNoteHandler = {
	deleteNote(args: DeleteNoteArgs): Promise<ToolResponse>;
};

const createDeleteNoteHarness = () => {
	const deleteNotes = jest.fn<(ids: number[]) => Promise<void>>().mockResolvedValue();
	const handler = new McpToolHandler({ deleteNotes } as unknown as AnkiClient);

	return {
		deleteNotes,
		deleteNote: (handler as unknown as DeleteNoteHandler).deleteNote.bind(handler),
	};
};

// Simple tests that don't require external dependencies
describe("Anki MCP Server - Basic Tests", () => {
	it("should pass basic test", () => {
		expect(true).toBe(true);
	});

	it("should handle string operations", () => {
		const testString = "Hello, World!";
		expect(testString).toContain("World");
		expect(testString.length).toBe(13);
	});

	it("should handle array operations", () => {
		const testArray = [1, 2, 3, 4, 5];
		expect(testArray).toHaveLength(5);
		expect(testArray).toContain(3);
		expect(testArray[0]).toBe(1);
	});

	it("should handle object operations", () => {
		const testObject = { name: "test", value: 42 };
		expect(testObject).toHaveProperty("name");
		expect(testObject.name).toBe("test");
		expect(testObject.value).toBe(42);
	});
});

describe("delete_note tool", () => {
	it("should delete a single note by noteId", async () => {
		const { deleteNote, deleteNotes } = createDeleteNoteHarness();

		const result = await deleteNote({ noteId: 1234567890 });

		expect(deleteNotes).toHaveBeenCalledWith([1234567890]);
		expect(JSON.parse(result.content[0].text)).toEqual({
			success: true,
			deletedCount: 1,
			noteIds: [1234567890],
		});
	});

	it("should delete multiple notes by noteIds", async () => {
		const { deleteNote, deleteNotes } = createDeleteNoteHarness();

		const result = await deleteNote({ noteIds: [1234567890, 9876543210] });

		expect(deleteNotes).toHaveBeenCalledWith([1234567890, 9876543210]);
		expect(JSON.parse(result.content[0].text)).toEqual({
			success: true,
			deletedCount: 2,
			noteIds: [1234567890, 9876543210],
		});
	});

	it("should reject missing, duplicate, empty, or invalid note IDs", async () => {
		const { deleteNote, deleteNotes } = createDeleteNoteHarness();

		await expect(deleteNote({})).rejects.toMatchObject({
			code: ErrorCode.InvalidParams,
		} satisfies Partial<McpError>);
		await expect(deleteNote({ noteId: 1, noteIds: [2] })).rejects.toMatchObject({
			code: ErrorCode.InvalidParams,
		} satisfies Partial<McpError>);
		await expect(deleteNote({ noteIds: [] })).rejects.toMatchObject({
			code: ErrorCode.InvalidParams,
		} satisfies Partial<McpError>);
		await expect(deleteNote({ noteIds: [1, 0] })).rejects.toMatchObject({
			code: ErrorCode.InvalidParams,
		} satisfies Partial<McpError>);
		expect(deleteNotes).not.toHaveBeenCalled();
	});
});
