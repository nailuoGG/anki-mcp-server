#!/usr/bin/env node
// Keep MCP registry metadata in sync with package.json during prebuild.
import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

// server.json (MCP registry metadata) repeats the version for the server and for
// each package entry; keep both in step so registry publishes are not stale.
const server = JSON.parse(readFileSync("server.json", "utf8"));
let serverChanged = false;
if (server.version !== pkg.version) {
	server.version = pkg.version;
	serverChanged = true;
}
for (const entry of server.packages ?? []) {
	if (entry.version !== pkg.version) {
		entry.version = pkg.version;
		serverChanged = true;
	}
}
if (serverChanged) {
	writeFileSync("server.json", `${JSON.stringify(server, null, 2)}\n`);
	console.log(`server.json: version -> ${pkg.version}`);
} else {
	console.log(`server.json: version already ${pkg.version}`);
}
