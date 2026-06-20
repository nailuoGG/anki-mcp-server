/**
 * Anki MCP Server implementation
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
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

type AnkiMcpServerOptions = {
	ankiClient?: AnkiClient;
	registerSignalHandlers?: boolean;
};

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
	constructor(port = 8765, host = "localhost", options: AnkiMcpServerOptions = {}) {
		this.server = new Server(
			{
				name: "anki-connect-server",
				version: MCP_VERSION,
			},
			{
				capabilities: {
					tools: {
						listChanged: true, // Tools list may change dynamically
					},
					resources: {
						subscribe: false, // Resources don't support subscription
						listChanged: true, // Resources list may change dynamically
					},
				},
			}
		);

		this.ankiClient =
			options.ankiClient ??
			new AnkiClient({
				ankiConnectUrl: `http://${host}:${port}`,
			});
		this.resourceHandler = new McpResourceHandler(this.ankiClient);
		this.toolHandler = new McpToolHandler(this.ankiClient, () => this.resourceHandler.clearCache());

		this.setupHandlers();

		this.server.onerror = (error) => console.error("[MCP Error]", error);
		if (options.registerSignalHandlers ?? true) {
			process.on("SIGINT", async () => {
				await this.server.close();
				process.exit(0);
			});
		}
	}

	/**
	 * Setup all request handlers
	 */
	private setupHandlers(): void {
		// Resource handlers
		this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
			return this.resourceHandler.listResources();
		});

		this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
			return this.resourceHandler.listResourceTemplates();
		});

		this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
			await this.checkConnection();
			return this.resourceHandler.readResource(request.params.uri);
		});

		// Tool handlers
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			return this.toolHandler.getToolSchema();
		});

		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			return this.toolHandler.executeTool(request.params.name, request.params.arguments ?? {});
		});
	}

	/**
	 * Check if Anki is available
	 */
	private async checkConnection(): Promise<void> {
		try {
			await this.ankiClient.checkConnection();
		} catch (_error) {
			throw new McpError(
				ErrorCode.InternalError,
				"Failed to connect to Anki. Please make sure Anki is running and the AnkiConnect plugin is enabled."
			);
		}
	}

	/**
	 * Run the server
	 */
	async run() {
		const transport = new StdioServerTransport();
		await this.connect(transport);
		console.error("Anki MCP server running on stdio");

		// Send notifications to inform client about available tools and resources
		try {
			await this.server.sendToolListChanged();
		} catch (error) {
			console.error("Failed to send tools list changed notification:", error);
		}
		try {
			await this.server.sendResourceListChanged();
		} catch (error) {
			console.error("Failed to send resources list changed notification:", error);
		}
	}

	async connect(transport: Transport): Promise<void> {
		await this.server.connect(transport);
	}

	async close(): Promise<void> {
		await this.server.close();
	}
}
