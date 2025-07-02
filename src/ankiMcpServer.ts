/**
 * Anki MCP Server implementation
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ErrorCode,
	ListResourcesRequestSchema,
	ListResourceTemplatesRequestSchema,
	ListToolsRequestSchema,
	McpError,
	ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { McpResourceHandler } from "./mcpResource.js";
import { McpToolHandler } from "./mcpTools.js";
import { AnkiClient } from "./utils.js";
import { MCP_VERSION } from "./_version.js";

/**
 * AnkiMcpServer is the main server class that handles MCP protocol communication
 */
export class AnkiMcpServer {
	private server: Server;
	private resourceHandler: McpResourceHandler;
	private toolHandler: McpToolHandler;
	private ankiClient: AnkiClient;

	/**
	 * Constructor
	 */
	constructor() {
		this.server = new Server(
			{
				name: "anki-connect-server",
				version: MCP_VERSION,
			},
			{
				capabilities: {
					tools: {},
					resources: {},
				},
			},
		);

		this.ankiClient = new AnkiClient();
		this.resourceHandler = new McpResourceHandler(this.ankiClient);
		this.toolHandler = new McpToolHandler();

		this.setupHandlers();

		this.server.onerror = (error) => console.error("[MCP Error]", error);
		process.on("SIGINT", async () => {
			await this.server.close();
			process.exit(0);
		});
	}

	/**
	 * Setup all request handlers
	 */
	private setupHandlers(): void {
		// Resource handlers
		this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
			await this.checkConnection();
			return this.resourceHandler.listResources();
		});

		this.server.setRequestHandler(
			ListResourceTemplatesRequestSchema,
			async () => {
				await this.checkConnection();
				return this.resourceHandler.listResourceTemplates();
			},
		);

		this.server.setRequestHandler(
			ReadResourceRequestSchema,
			async (request) => {
				await this.checkConnection();
				return this.resourceHandler.readResource(request.params.uri);
			},
		);

		// Tool handlers
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			await this.checkConnection();
			return this.toolHandler.getToolSchema();
		});

		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			await this.checkConnection();
			return this.toolHandler.executeTool(
				request.params.name,
				request.params.arguments,
			);
		});
	}

	/**
	 * Check if Anki is available
	 */
	private async checkConnection(): Promise<void> {
		try {
			await this.ankiClient.checkConnection();
		} catch (error) {
			throw new McpError(
				ErrorCode.InternalError,
				"Failed to connect to Anki. Please make sure Anki is running and the AnkiConnect plugin is enabled.",
			);
		}
	}

	/**
	 * Run the server
	 */
	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error("Anki MCP server running on stdio");
	}
}
