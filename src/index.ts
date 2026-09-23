#!/usr/bin/env node
/**
 * Main entry point for the Anki MCP Server
 */
import { AnkiMcpServer } from "./ankiMcpServer.js";

/**
 * stdio safety guard: stdout carries the MCP JSON-RPC transport exclusively.
 * Any stray console.log (ours or a dependency's, e.g. environment diagnostics
 * from bundled launchers) would corrupt the protocol stream — route it to
 * stderr instead. console.error already goes to stderr.
 */
console.log = (...args: unknown[]) => {
	process.stderr.write(args.map(String).join(" ") + "\n");
};

/**
 * Parse command line arguments
 */
function parseArgs() {
	const args = process.argv.slice(2);
	const portIndex = args.indexOf("--port");
	const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : 8765;

	if (Number.isNaN(port) || port < 1 || port > 65535) {
		console.error("Invalid port number. Please provide a valid port between 1-65535");
		process.exit(1);
	}

	const hostIndex = args.indexOf("--host");
	const host = hostIndex !== -1 && args[hostIndex + 1] ? args[hostIndex + 1] : "localhost";

	return { port, host };
}

/**
 * Main function
 */
async function main() {
	try {
		const { port, host } = parseArgs();
		const server = new AnkiMcpServer(port, host);
		await server.run();
	} catch (error) {
		console.error("Failed to start Anki MCP Server:", error);
		process.exit(1);
	}
}

// Start the server
main().catch(console.error);
