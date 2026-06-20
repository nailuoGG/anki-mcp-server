/**
 * MCP Tool dispatcher for Anki.
 */
import {
	ErrorCode,
	McpError,
	type CallToolResult,
	type ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { checkConnection, createDeck, listDecks, sync } from "./mcpDeckTools.js";
import { createNoteType, getNoteTypeInfo, listNoteTypes } from "./mcpModelTools.js";
import {
	batchCreateNotes,
	createModelSpecificNote,
	createNote,
	deleteNote,
	getNoteInfo,
	searchNotes,
	updateNote,
} from "./mcpNoteTools.js";
import { toolErrorResult } from "./mcpToolResponses.js";
import { LEGACY_TOOL_ALIASES, TOOLS } from "./mcpToolSchemas.js";
import { AnkiClient } from "./utils.js";

/**
 * Handles MCP tool dispatch for Anki.
 */
export class McpToolHandler {
	private readonly ankiClient: AnkiClient;
	private readonly onCatalogChanged?: () => void;

	constructor(ankiClient?: AnkiClient, onCatalogChanged?: () => void) {
		this.ankiClient = ankiClient ?? new AnkiClient();
		this.onCatalogChanged = onCatalogChanged;
	}

	async getToolSchema(): Promise<ListToolsResult> {
		return { tools: TOOLS };
	}

	async executeTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
		try {
			const toolName = LEGACY_TOOL_ALIASES[name] ?? name;

			switch (toolName) {
				case "anki_check_connection":
					return await checkConnection(this.ankiClient);
				case "anki_list_decks":
					return await listDecks(this.ankiClient);
				case "anki_sync":
					return await sync(this.ankiClient);
				case "anki_create_deck":
					return await createDeck(this.ankiClient, args);
				case "anki_list_note_types":
					return await listNoteTypes(this.ankiClient);
				case "anki_get_note_type_info":
					return await getNoteTypeInfo(this.ankiClient, args);
				case "anki_create_note":
					return await createNote(this.ankiClient, args);
				case "anki_batch_create_notes":
					return await batchCreateNotes(this.ankiClient, args);
				case "anki_search_notes":
					return await searchNotes(this.ankiClient, args);
				case "anki_get_note_info":
					return await getNoteInfo(this.ankiClient, args);
				case "anki_update_note":
					return await updateNote(this.ankiClient, args);
				case "anki_delete_note":
					return await deleteNote(this.ankiClient, args);
				case "anki_create_note_type":
					return await createNoteType(this.ankiClient, args, this.onCatalogChanged);
				default: {
					const modelName = this.resolveDynamicModelName(name);
					if (modelName) {
						return await createModelSpecificNote(this.ankiClient, modelName, args);
					}

					throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
				}
			}
		} catch (error) {
			if (error instanceof McpError) {
				throw error;
			}

			return toolErrorResult(error);
		}
	}

	private resolveDynamicModelName(name: string): string | null {
		const match = name.match(/^create_(.+)_note$/) ?? name.match(/^anki_create_(.+)_note$/);
		return match ? match[1].replace(/_/g, " ") : null;
	}
}
