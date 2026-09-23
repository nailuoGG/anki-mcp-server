import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toolResult } from "./mcpToolResponses.js";
import { optionalBoolean, requireString } from "./mcpToolValidation.js";
import type { AnkiClient } from "./utils.js";

export const checkConnection = async (ankiClient: AnkiClient): Promise<CallToolResult> => {
	const version = await ankiClient.getVersion();
	return toolResult({ connected: true, version });
};

export const sync = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown> = {}
): Promise<CallToolResult> => {
	if (args.confirm !== true) {
		return toolResult({
			success: false,
			message:
				'Sync not performed. A full AnkiWeb sync can overwrite or merge local and remote collections, so it requires explicit confirmation: call anki_sync with {"confirm": true} to proceed.',
		});
	}

	await ankiClient.sync();
	return toolResult({
		success: true,
		message:
			"Sync requested. AnkiConnect does not confirm completion; check Anki for pending dialogs if changes do not appear on AnkiWeb.",
	});
};

export const listDecks = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown> = {}
): Promise<CallToolResult> => {
	const includeIds = optionalBoolean(args.includeIds, false);
	const decks = await ankiClient.getDeckNames();
	const deckIds = includeIds ? await ankiClient.getDeckNamesAndIds() : undefined;

	return toolResult({
		decks,
		count: decks.length,
		...(deckIds ? { deckIds } : {}),
	});
};

export const createDeck = async (
	ankiClient: AnkiClient,
	args: Record<string, unknown>
): Promise<CallToolResult> => {
	const name = requireString(args.name, "name");
	const deckId = await ankiClient.createDeck(name);
	return toolResult({ deckId, name });
};
