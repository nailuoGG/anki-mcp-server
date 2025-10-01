#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Update version numbers in server.json and manifest.json to match package.json
 * and calculate SHA256 for .mcpb file
 */

function readJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        process.exit(1);
    }
}

function writeJsonFile(filePath, data) {
    try {
        const content = JSON.stringify(data, null, 4);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated ${filePath}`);
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error.message);
        process.exit(1);
    }
}

function calculateFileSha256(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️  File ${filePath} does not exist, skipping SHA256 calculation`);
            return null;
        }
        
        const fileBuffer = fs.readFileSync(filePath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    } catch (error) {
        console.error(`Error calculating SHA256 for ${filePath}:`, error.message);
        return null;
    }
}

function updateServerJson(serverData, version, mcpbSha256) {
    // Update main version
    serverData.version = version;
    
    // Update package versions
    serverData.packages.forEach(pkg => {
        pkg.version = version;
        
        // Update mcpb package identifier URL
        if (pkg.registryType === 'mcpb') {
            pkg.identifier = `https://github.com/nailuoGG/anki-mcp-server/releases/download/v${version}/anki-mcp-server.mcpb`;
            
            // Update SHA256 if provided
            if (mcpbSha256) {
                pkg.fileSha256 = mcpbSha256;
            }
        }
    });
    
    return serverData;
}

// Note: updateManifestJson function removed as manifest.json is now updated before mcpb pack

function main() {
    console.log('🔄 Updating version numbers...');
    
    // Read package.json to get current version
    const packageJson = readJsonFile('package.json');
    const version = packageJson.version;
    console.log(`📦 Current version: ${version}`);
    
    // Calculate SHA256 for .mcpb file
    const mcpbPath = 'release/anki-mcp-server.mcpb';
    const mcpbSha256 = calculateFileSha256(mcpbPath);
    if (mcpbSha256) {
        console.log(`🔐 SHA256 for ${mcpbPath}: ${mcpbSha256}`);
    }
    
    // Update server.json
    const serverJsonPath = 'server.json';
    const serverData = readJsonFile(serverJsonPath);
    const updatedServerData = updateServerJson(serverData, version, mcpbSha256);
    writeJsonFile(serverJsonPath, updatedServerData);
    
    // Note: manifest.json is updated before mcpb pack, so we don't need to update it here
    
    console.log('✅ Version update completed successfully!');
}

if (require.main === module) {
    main();
}
