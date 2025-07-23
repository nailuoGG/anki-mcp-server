/**
 * MCP Tool handlers for Anki
 */
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { AnkiClient } from "./utils.js";
import { IMcpTool } from "./tools/baseTool.js";
import {
	ListDecksTool,
	CreateDeckTool,
	DeleteDeckTool,
	GetDeckStatsTool,
} from "./tools/deckTools.js";
import {
	ListNoteTypesTool,
	CreateNoteTypeTool,
	UpdateNoteTypeTemplatesTool,
	GetNoteTypeInfoTool,
} from "./tools/noteTypeTools.js";
import {
	CreateNoteTool,
	BatchCreateNotesTool,
	SearchNotesTool,
	GetNoteInfoTool,
	UpdateNoteTool,
	DeleteNoteTool,
	CreateModelSpecificNoteTool,
} from "./tools/noteTools.js";
import {
	ListCardsTool,
	GetCardInfoTool,
	SuspendCardsTool,
	UnsuspendCardsTool,
	ForgetCardsTool,
	RelearnCardsTool,
} from "./tools/cardTools.js";
import {
	LearningProgressAnalyzerTool,
	KnowledgeConnectionAnalyzerTool,
} from "./tools/analysisTools.js";

/**
 * Handles all MCP tool operations for Anki
 */
export class McpToolHandler {
	private ankiClient: AnkiClient;
	private tools: Map<string, IMcpTool> = new Map();

	constructor() {
		this.ankiClient = new AnkiClient();
		this.registerTools();
	}

	private register(tool: IMcpTool) {
		this.tools.set(tool.name, tool);
	}

	private registerTools() {
		// Deck tools
		this.register(new ListDecksTool(this.ankiClient));
		this.register(new CreateDeckTool(this.ankiClient));
		this.register(new DeleteDeckTool(this.ankiClient));
		this.register(new GetDeckStatsTool(this.ankiClient));

		// Note type tools
		this.register(new ListNoteTypesTool(this.ankiClient));
		this.register(new CreateNoteTypeTool(this.ankiClient));
		this.register(new UpdateNoteTypeTemplatesTool(this.ankiClient));
		this.register(new GetNoteTypeInfoTool(this.ankiClient));

		// Note tools
		this.register(new CreateNoteTool(this.ankiClient));
		this.register(new BatchCreateNotesTool(this.ankiClient));
		this.register(new SearchNotesTool(this.ankiClient));
		this.register(new GetNoteInfoTool(this.ankiClient));
		this.register(new UpdateNoteTool(this.ankiClient));
		this.register(new DeleteNoteTool(this.ankiClient));
		// Dynamic model-specific note creation is handled in executeTool for now
		// this.register(new CreateModelSpecificNoteTool(this.ankiClient, "Basic")); // Example

		// Card tools
		this.register(new ListCardsTool(this.ankiClient));
		this.register(new GetCardInfoTool(this.ankiClient));
		this.register(new SuspendCardsTool(this.ankiClient));
		this.register(new UnsuspendCardsTool(this.ankiClient));
		this.register(new ForgetCardsTool(this.ankiClient));
		this.register(new RelearnCardsTool(this.ankiClient));

		// Analysis tools
		this.register(new LearningProgressAnalyzerTool(this.ankiClient));
		this.register(new KnowledgeConnectionAnalyzerTool(this.ankiClient));
	}

	/**
	 * Get tool schema for all available tools
	 */
	async getToolSchema(): Promise<{
		tools: {
			name: string;
			description: string;
			inputSchema: Record<string, any>;
		}[];
	}> {
		const toolSchemas = Array.from(this.tools.values()).map((tool) => ({
			name: tool.name,
			description: tool.description,
			inputSchema: tool.inputSchema,
		}));

		// Add dynamic model-specific note creation schema
		const modelNames = await this.ankiClient.getModelNames();
		for (const modelName of modelNames) {
			const dynamicTool = new CreateModelSpecificNoteTool(
				this.ankiClient,
				modelName,
			);
			toolSchemas.push({
				name: dynamicTool.name,
				description: dynamicTool.description,
				inputSchema: dynamicTool.inputSchema,
			});
		}

		return {
			tools: toolSchemas,
		};
	}

	/**
	 * Handle tool execution
	 */
	async executeTool(
		name: string,
		args: any,
	): Promise<{
		content: {
			type: string;
			text: string;
		}[];
		isError?: boolean;
	}> {
		await this.ankiClient.checkConnection();

		try {
			let tool = this.tools.get(name);

			// Handle dynamic model-specific note creation
			if (!tool) {
				const typeToolMatch = name.match(/^create_(.+)_note$/);
				if (typeToolMatch) {
					// Get the lowercase version from the tool name
					const lowercaseModelName = typeToolMatch[1].replace(/_/g, " ");

					// Find the actual model name with correct casing
					const modelNames = await this.ankiClient.getModelNames();
					const actualModelName = modelNames.find(
						(m) => m.toLowerCase() === lowercaseModelName,
					);

					if (actualModelName) {
						tool = new CreateModelSpecificNoteTool(
							this.ankiClient,
							actualModelName,
						);
					}
				}
			}

			if (tool) {
				return await tool.execute(args);
			} else {
				throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
			}
		} catch (error) {
			if (error instanceof McpError) {
				throw error;
			}

			return {
				content: [
					{
						type: "text",
						text: `Error: ${
							error instanceof Error ? error.message : String(error)
						}`,
					},
				],
				isError: true,
			};
		}
	}
}
