import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { AnkiClient } from "../utils.js";
import { BaseTool, IMcpTool } from "./baseTool.js";

export class ListDecksTool extends BaseTool implements IMcpTool {
	name = "list_decks";
	description = "List all available Anki decks";
	inputSchema = {
		type: "object",
		properties: {},
		required: [],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(
		args: any,
	): Promise<{ content: { type: string; text: string }[] }> {
		try {
			const decks = await this.ankiClient.getDeckNames();
			return this.formatSuccessResponse({ decks, count: decks.length });
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class CreateDeckTool extends BaseTool implements IMcpTool {
	name = "create_deck";
	description = "Create a new Anki deck";
	inputSchema = {
		type: "object",
		properties: {
			name: {
				type: "string",
				description: "Name of the deck to create",
			},
		},
		required: ["name"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: { name: string }): Promise<{
		content: { type: string; text: string }[];
	}> {
		try {
			if (!args.name) {
				throw new McpError(ErrorCode.InvalidParams, "Deck name is required");
			}
			const deckId = await this.ankiClient.createDeck(args.name);
			return this.formatSuccessResponse({ deckId, name: args.name });
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class DeleteDeckTool extends BaseTool implements IMcpTool {
	name = "delete_deck";
	description = "Delete an Anki deck";
	inputSchema = {
		type: "object",
		properties: {
			name: {
				type: "string",
				description: "Name of the deck to delete",
			},
		},
		required: ["name"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: { name: string }): Promise<{
		content: { type: string; text: string }[];
	}> {
		try {
			if (!args.name) {
				throw new McpError(ErrorCode.InvalidParams, "Deck name is required");
			}
			await this.ankiClient.deleteDeck(args.name);
			return this.formatSuccessResponse({ success: true, name: args.name });
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class GetDeckStatsTool extends BaseTool implements IMcpTool {
	name = "get_deck_stats";
	description = "Get statistics for a given deck";
	inputSchema = {
		type: "object",
		properties: {
			name: {
				type: "string",
				description: "Name of the deck to get stats for",
			},
		},
		required: ["name"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: { name: string }): Promise<{
		content: { type: string; text: string }[];
	}> {
		try {
			if (!args.name) {
				throw new McpError(ErrorCode.InvalidParams, "Deck name is required");
			}
			const stats = await this.ankiClient.getDeckStats(args.name);
			return this.formatSuccessResponse(stats);
		} catch (error) {
			return this.handleError(error);
		}
	}
}
