#!/usr/bin/env node
import { ConfigService } from "./services/ConfigService.js";
import { AnkiMcpServer } from "./server/AnkiMcpServer.js";

/**
 * Main entry point for the Anki MCP Server
 *
 */
async function main() {
	try {
		const configService = new ConfigService();

		const server = new AnkiMcpServer(configService);

		await server.run();
	} catch (error) {
		console.error("Failed to start Anki MCP Server:", error);
		process.exit(1);
	}
}

// Start the server
main().catch(console.error);
