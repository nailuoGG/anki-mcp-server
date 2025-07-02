import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { AnkiClient } from "./utils.js";

export class McpResourceHandler {
	private ankiClient: AnkiClient;

	constructor(ankiClient: AnkiClient) {
		this.ankiClient = ankiClient;
	}

	async listResources(): Promise<{
		resources: {
			uri: string;
			name: string;
			type: string;
			description: string;
		}[];
	}> {
		const resources = [];

		// List decks as resources
		const decks = await this.ankiClient.getDeckNames();
		for (const deckName of decks) {
			resources.push({
				uri: `/decks/${encodeURIComponent(deckName)}`,
				name: deckName,
				type: "deck",
				description: `Anki deck: ${deckName}`,
			});
		}

		// List note types as resources
		const noteTypes = await this.ankiClient.getModelNames();
		for (const noteType of noteTypes) {
			resources.push({
				uri: `/noteTypes/${encodeURIComponent(noteType)}`,
				name: noteType,
				type: "noteType",
				description: `Anki note type: ${noteType}`,
			});
		}

		// Add other resources as needed (e.g., server config, logs)
		resources.push({
			uri: "/server/config",
			name: "Server Configuration",
			type: "configuration",
			description: "Configuration of the Anki MCP Server",
		});

		return { resources };
	}

	async listResourceTemplates(): Promise<{
		templates: {
			uri: string;
			name: string;
			type: string;
			description: string;
			schema: Record<string, any>;
		}[];
	}> {
		const templates = [];

		// Template for creating a new deck
		templates.push({
			uri: "/templates/deck",
			name: "New Deck Template",
			type: "deck",
			description: "Template for creating a new Anki deck",
			schema: {
				type: "object",
				properties: {
					name: { type: "string", description: "Name of the new deck" },
				},
				required: ["name"],
			},
		});

		// Template for creating a new note type
		templates.push({
			uri: "/templates/noteType",
			name: "New Note Type Template",
			type: "noteType",
			description: "Template for creating a new Anki note type",
			schema: {
				type: "object",
				properties: {
					name: { type: "string", description: "Name of the new note type" },
					fields: {
						type: "array",
						items: { type: "string" },
						description: "Field names for the note type",
					},
					css: { type: "string", description: "CSS styling for the note type" },
					templates: {
						type: "array",
						items: {
							type: "object",
							properties: {
								name: { type: "string" },
								front: { type: "string" },
								back: { type: "string" },
							},
							required: ["name", "front", "back"],
						},
						description: "Card templates",
					},
				},
				required: ["name", "fields", "templates"],
			},
		});

		return { templates };
	}

	async readResource(uri: string): Promise<{
		content: { type: string; text: string }[];
	}> {
		if (uri.startsWith("/decks/")) {
			const deckName = decodeURIComponent(uri.substring("/decks/".length));
			const stats = await this.ankiClient.getDeckStats(deckName);
			return {
				content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
			};
		} else if (uri.startsWith("/noteTypes/")) {
			const modelName = decodeURIComponent(uri.substring("/noteTypes/".length));
			const [fields, templates, styling] = await Promise.all([
				this.ankiClient.getModelFieldNames(modelName),
				this.ankiClient.getModelTemplates(modelName),
				this.ankiClient.getModelStyling(modelName),
			]);
			const info = {
				modelName,
				fields,
				templates,
				css: styling.css,
			};
			return {
				content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
			};
		} else if (uri === "/server/config") {
			// Return a simplified config for demonstration
			const config = {
				ankiConnectUrl: "http://localhost:8765",
				apiVersion: 6,
			};
			return {
				content: [{ type: "text", text: JSON.stringify(config, null, 2) }],
			};
		}

		throw new McpError(ErrorCode.NotFound, `Resource not found: ${uri}`);
	}
}
