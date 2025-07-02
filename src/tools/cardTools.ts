import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { AnkiClient } from "../utils.js";
import { BaseTool, IMcpTool } from "./baseTool.js";

export class ListCardsTool extends BaseTool implements IMcpTool {
	name = "list_cards";
	description = "List cards based on a query";
	inputSchema = {
		type: "object",
		properties: {
			query: {
				type: "string",
				description: "Anki search query for cards",
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

			const cardIds = await this.ankiClient.findCards(args.query);

			return this.formatSuccessResponse({
				query: args.query,
				total: cardIds.length,
				cardIds,
			});
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class GetCardInfoTool extends BaseTool implements IMcpTool {
	name = "get_card_info";
	description = "Get detailed information about a card";
	inputSchema = {
		type: "object",
		properties: {
			cardId: {
				type: "number",
				description: "ID of the card to get info for",
			},
		},
		required: ["cardId"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: { cardId: number }): Promise<{
		content: { type: string; text: string }[];
	}> {
		try {
			if (!args.cardId) {
				throw new McpError(ErrorCode.InvalidParams, "Card ID is required");
			}

			const cardInfo = await this.ankiClient.cardsInfo([args.cardId]);

			if (!cardInfo || cardInfo.length === 0) {
				throw new McpError(
					ErrorCode.InvalidParams,
					`Card not found: ${args.cardId}`,
				);
			}

			return this.formatSuccessResponse(cardInfo[0]);
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class SuspendCardsTool extends BaseTool implements IMcpTool {
	name = "suspend_cards";
	description = "Suspend cards";
	inputSchema = {
		type: "object",
		properties: {
			cardIds: {
				type: "array",
				items: {
					type: "number",
				},
				description: "Array of card IDs to suspend",
			},
		},
		required: ["cardIds"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: { cardIds: number[] }): Promise<{
		content: { type: string; text: string }[];
	}> {
		try {
			if (!args.cardIds || args.cardIds.length === 0) {
				throw new McpError(ErrorCode.InvalidParams, "Card IDs are required");
			}

			await this.ankiClient.suspendCards(args.cardIds);

			return this.formatSuccessResponse({
				success: true,
				cardIds: args.cardIds,
			});
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class UnsuspendCardsTool extends BaseTool implements IMcpTool {
	name = "unsuspend_cards";
	description = "Unsuspend cards";
	inputSchema = {
		type: "object",
		properties: {
			cardIds: {
				type: "array",
				items: {
					type: "number",
				},
				description: "Array of card IDs to unsuspend",
			},
		},
		required: ["cardIds"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: { cardIds: number[] }): Promise<{
		content: { type: string; text: string }[];
	}> {
		try {
			if (!args.cardIds || args.cardIds.length === 0) {
				throw new McpError(ErrorCode.InvalidParams, "Card IDs are required");
			}

			await this.ankiClient.unsuspendCards(args.cardIds);

			return this.formatSuccessResponse({
				success: true,
				cardIds: args.cardIds,
			});
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class ForgetCardsTool extends BaseTool implements IMcpTool {
	name = "forget_cards";
	description = "Forget cards, resetting their progress";
	inputSchema = {
		type: "object",
		properties: {
			cardIds: {
				type: "array",
				items: {
					type: "number",
				},
				description: "Array of card IDs to forget",
			},
		},
		required: ["cardIds"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: { cardIds: number[] }): Promise<{
		content: { type: string; text: string }[];
	}> {
		try {
			if (!args.cardIds || args.cardIds.length === 0) {
				throw new McpError(ErrorCode.InvalidParams, "Card IDs are required");
			}

			await this.ankiClient.forgetCards(args.cardIds);

			return this.formatSuccessResponse({
				success: true,
				cardIds: args.cardIds,
			});
		} catch (error) {
			return this.handleError(error);
		}
	}
}

export class RelearnCardsTool extends BaseTool implements IMcpTool {
	name = "relearn_cards";
	description = "Relearn cards, moving them to the relearn queue";
	inputSchema = {
		type: "object",
		properties: {
			cardIds: {
				type: "array",
				items: {
					type: "number",
				},
				description: "Array of card IDs to relearn",
			},
		},
		required: ["cardIds"],
	};

	constructor(ankiClient: AnkiClient) {
		super(ankiClient);
	}

	async execute(args: { cardIds: number[] }): Promise<{
		content: { type: string; text: string }[];
	}> {
		try {
			if (!args.cardIds || args.cardIds.length === 0) {
				throw new McpError(ErrorCode.InvalidParams, "Card IDs are required");
			}

			await this.ankiClient.relearnCards(args.cardIds);

			return this.formatSuccessResponse({
				success: true,
				cardIds: args.cardIds,
			});
		} catch (error) {
			return this.handleError(error);
		}
	}
}
