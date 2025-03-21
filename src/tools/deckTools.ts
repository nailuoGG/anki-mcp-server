/**
 * Deck tool handlers
 */
import { IDeckService } from "../interfaces/services.js";
import { CreateDeckArgs, ListDecksArgs } from "../interfaces/schemas.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/**
 * DeckTools class handles deck-related MCP tools
 */
export class DeckTools {
	/**
	 * Constructor
	 *
	 * @param deckService Deck service
	 */
	constructor(private deckService: IDeckService) {}

	/**
	 * List all decks
	 *
	 * @param args Empty arguments object
	 * @returns Promise resolving to tool response with deck list
	 */
	async listDecks(args?: ListDecksArgs) {
		const decks = await this.deckService.listDecks();
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(decks, null, 2),
				},
			],
		};
	}

	/**
	 * Create a new deck
	 *
	 * @param args Deck creation arguments
	 * @returns Promise resolving to tool response with creation result
	 */
	async createDeck(args: CreateDeckArgs) {
		if (!args || !args.name) {
			throw new McpError(ErrorCode.InvalidParams, "Deck name is required");
		}

		await this.deckService.createDeck(args.name);
		return {
			content: [
				{
					type: "text",
					text: `Created deck: ${args.name}`,
				},
			],
		};
	}
}
