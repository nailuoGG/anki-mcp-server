import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { IDeckService, IModelService } from "../../interfaces/services.js";
import { ConnectionManager } from "../managers/ConnectionManager.js";
import { ResourceRouter } from "../routers/ResourceRouter.js";
import { ToolRouter } from "../routers/ToolRouter.js";
import { ToolFactory } from "./ToolFactory.js";

export class RouterFactory {
	/**
	 * @param server - MCP server instance for router configuration
	 */
	constructor(private server: Server) {}

	/**
	 * Creates the resource router instance with core service dependencies
	 * @param connectionManager - Handles Anki connection state validation
	 */
	createResourceRouter(
		deckService: IDeckService,
		modelService: IModelService,
		connectionManager: ConnectionManager,
	): ResourceRouter {
		return new ResourceRouter(
			this.server,
			deckService,
			modelService,
			connectionManager,
		);
	}

	/**
	 * Creates the tool router with factory and service dependencies
	 * @param toolFactory - Central factory for tool implementations
	 */
	createToolRouter(
		toolFactory: ToolFactory,
		modelService: IModelService,
		connectionManager: ConnectionManager,
	): ToolRouter {
		return new ToolRouter(
			this.server,
			toolFactory,
			modelService,
			connectionManager,
		);
	}
}
