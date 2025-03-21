/**
 * Anki MCP Server implementation
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { IConfigService } from "../interfaces/services.js";
import { MCP_VERSION } from "../_version.js";
import { ServiceFactory } from "./factories/ServiceFactory.js";
import { ToolFactory } from "./factories/ToolFactory.js";
import { RouterFactory } from "./factories/RouterFactory.js";
import { ConnectionManager } from "./managers/ConnectionManager.js";

/**
 * AnkiMcpServer is the main server class that handles MCP protocol communication
 */
export class AnkiMcpServer {
	private server: Server;
	private serviceFactory: ServiceFactory;
	private toolFactory: ToolFactory;
	private routerFactory: RouterFactory;
	private connectionManager: ConnectionManager;

	/**
	 * Constructor
	 *
	 * @param configService
	 */
	constructor(configService: IConfigService) {
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

		this.serviceFactory = new ServiceFactory(configService);
		this.connectionManager = new ConnectionManager(
			this.serviceFactory.getAnkiConnectService(),
		);
		this.toolFactory = new ToolFactory(
			this.serviceFactory.getDeckService(),
			this.serviceFactory.getNoteService(),
			this.serviceFactory.getModelService(),
		);
		this.routerFactory = new RouterFactory(this.server);

		this.initializeRouters();

		this.server.onerror = (error) => console.error("[MCP Error]", error);
		process.on("SIGINT", async () => {
			await this.server.close();
			process.exit(0);
		});
	}

	private initializeRouters(): void {
		this.routerFactory.createResourceRouter(
			this.serviceFactory.getDeckService(),
			this.serviceFactory.getModelService(),
			this.connectionManager,
		);

		this.routerFactory.createToolRouter(
			this.toolFactory,
			this.serviceFactory.getModelService(),
			this.connectionManager,
		);
	}

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error("Anki MCP server running on stdio");
	}
}
