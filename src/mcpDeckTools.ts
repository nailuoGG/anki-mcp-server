import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toolResult } from "./mcpToolResponses.js";
import { requireString } from "./mcpToolValidation.js";
import type { AnkiClient } from "./utils.js";

export const checkConnection = async (ankiClient: AnkiClient): Promise<CallToolResult> => {
	const version = await ankiClient.getVersion();
	return toolResult({ connected: true, version });
};

export const sync = async (ankiClient: AnkiClient): Promise<CallToolResult> => {
	await ankiClient.sync();
	return toolResult({
		success: true,
		message:
			"Sync requested. AnkiConnect does not confirm completion; check Anki for pending dialogs if changes do not appear on AnkiWeb.",
	});
};

export const listDecks = async (ankiClient: AnkiClient): Promise<CallToolResult> => {
	const decks = await ankiClient.getDeckNames();
	return toolResult({ decks, count: decks.length });
};

export const createDeck = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown>
): Promise<CallToolResult> => {
	const name = requireString(args.name, "name");
	const deckId = await ankiClient.createDeck(name);
	return toolResult({ deckId, name });
};
