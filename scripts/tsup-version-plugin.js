#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * TSUP Plugin for version management
 * Updates manifest.json before build and server.json after build
 */

function readJsonFile(filePath) {
	try {
		const content = fs.readFileSync(filePath, "utf8");
		return JSON.parse(content);
	} catch (error) {
		console.error(`Error reading ${filePath}:`, error.message);
		return null;
	}
}

function writeJsonFile(filePath, data) {
	try {
		const content = JSON.stringify(data, null, "\t");
		fs.writeFileSync(filePath, content, "utf8");
		console.log(`✅ Updated ${filePath}`);
		return true;
	} catch (error) {
		console.error(`Error writing ${filePath}:`, error.message);
		return false;
	}
}

function calculateFileSha256(filePath) {
	try {
		if (!fs.existsSync(filePath)) {
			console.warn(`⚠️  File ${filePath} does not exist, skipping SHA256 calculation`);
			return null;
		}

		const fileBuffer = fs.readFileSync(filePath);
		const hashSum = crypto.createHash("sha256");
		hashSum.update(fileBuffer);
		return hashSum.digest("hex");
	} catch (error) {
		console.error(`Error calculating SHA256 for ${filePath}:`, error.message);
		return null;
	}
}

function updateManifestJson(manifestData, version) {
	manifestData.version = version;
	return manifestData;
}

function updateServerJson(serverData, version, mcpbSha256) {
	// Update main version
	serverData.version = version;

	// Update package versions
	serverData.packages.forEach((pkg) => {
		pkg.version = version;

		// Update mcpb package identifier URL
		if (pkg.registryType === "mcpb") {
			pkg.identifier = `https://github.com/nailuoGG/anki-mcp-server/releases/download/v${version}/anki-mcp-server.mcpb`;

			// Update SHA256 if provided
			if (mcpbSha256) {
				pkg.fileSha256 = mcpbSha256;
			}
		}
	});

	return serverData;
}

// TSUP Plugin
function versionPlugin(options = {}) {
	const {
		updateManifest = true,
		updateServer = true,
		mcpbPath = "release/anki-mcp-server.mcpb",
	} = options;

	return {
		name: "version-plugin",

		// Before build starts
		buildStart() {
			if (!updateManifest) return;

			console.log("🔄 Updating manifest.json version...");

			// Read package.json to get current version
			const packageJson = readJsonFile("package.json");
			if (!packageJson) return;

			const version = packageJson.version;
			console.log(`📦 Current version: ${version}`);

			// Update manifest.json
			const manifestData = readJsonFile("manifest.json");
			if (manifestData) {
				const updatedManifestData = updateManifestJson(manifestData, version);
				writeJsonFile("manifest.json", updatedManifestData);
			}
		},

		// After build completes
		buildEnd() {
			if (!updateServer) return;

			console.log("🔄 Updating server.json version and SHA256...");

			// Read package.json to get current version
			const packageJson = readJsonFile("package.json");
			if (!packageJson) return;

			const version = packageJson.version;

			// Calculate SHA256 for .mcpb file
			const mcpbSha256 = calculateFileSha256(mcpbPath);
			if (mcpbSha256) {
				console.log(`🔐 SHA256 for ${mcpbPath}: ${mcpbSha256}`);
			}

			// Update server.json
			const serverData = readJsonFile("server.json");
			if (serverData) {
				const updatedServerData = updateServerJson(serverData, version, mcpbSha256);
				writeJsonFile("server.json", updatedServerData);
			}

			console.log("✅ Version update completed!");
		},
	};
}

module.exports = versionPlugin;
