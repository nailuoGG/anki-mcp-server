#!/usr/bin/env node

import fs from "fs";

/**
 * Update version number in manifest.json to match package.json
 * This should run before mcpb pack since manifest.json is used for building .mcpb
 */

function readJsonFile(filePath) {
	try {
		const content = fs.readFileSync(filePath, "utf8");
		return JSON.parse(content);
	} catch (error) {
		console.error(`Error reading ${filePath}:`, error.message);
		process.exit(1);
	}
}

function writeJsonFile(filePath, data) {
	try {
		const content = JSON.stringify(data, null, "\t");
		fs.writeFileSync(filePath, content, "utf8");
		console.log(`✅ Updated ${filePath}`);
	} catch (error) {
		console.error(`Error writing ${filePath}:`, error.message);
		process.exit(1);
	}
}

function updateManifestJson(manifestData, version) {
	manifestData.version = version;
	return manifestData;
}

function main() {
	console.log("🔄 Updating manifest.json version...");

	// Read package.json to get current version
	const packageJson = readJsonFile("package.json");
	const version = packageJson.version;
	console.log(`📦 Current version: ${version}`);

	// Update manifest.json
	const manifestJsonPath = "manifest.json";
	const manifestData = readJsonFile(manifestJsonPath);
	const updatedManifestData = updateManifestJson(manifestData, version);
	writeJsonFile(manifestJsonPath, updatedManifestData);

	console.log("✅ Manifest version update completed!");
}

// ES module entry point
main();
