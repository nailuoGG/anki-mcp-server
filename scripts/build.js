#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Comprehensive build script that handles the complete build sequence:
 * 1. Build TypeScript files with tsup
 * 2. Update manifest.json version
 * 3. Execute mcpb pack
 * 4. Update server.json version and calculate SHA256
 */

function readJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return null;
    }
}

function writeJsonFile(filePath, data) {
    try {
        const content = JSON.stringify(data, null, '\t');
        fs.writeFileSync(filePath, content, 'utf8');
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
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
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

function execCommand(command, description) {
    try {
        console.log(`🔄 ${description}...`);
        execSync(command, { stdio: 'inherit' });
        console.log(`✅ ${description} completed`);
        return true;
    } catch (error) {
        console.error(`❌ ${description} failed:`, error.message);
        return false;
    }
}

function main() {
    const args = process.argv.slice(2);
    const isProduction = args.includes('--prod') || process.env.NODE_ENV === 'production';
    const skipMcpb = args.includes('--no-mcpb');
    
    console.log('🚀 Starting build process...');
    console.log(`Mode: ${isProduction ? 'Production' : 'Development'}`);
    console.log(`Skip mcpb: ${skipMcpb}`);
    
    // Step 1: Read package.json version
    const packageJson = readJsonFile('package.json');
    if (!packageJson) {
        console.error('❌ Failed to read package.json');
        process.exit(1);
    }
    
    const version = packageJson.version;
    console.log(`📦 Current version: ${version}`);
    
    // Step 2: Build TypeScript files with tsup
    if (!execCommand('tsup', 'Building TypeScript files')) {
        process.exit(1);
    }
    
    // Step 3: Update manifest.json version
    console.log('🔄 Updating manifest.json version...');
    const manifestData = readJsonFile('manifest.json');
    if (manifestData) {
        const updatedManifestData = updateManifestJson(manifestData, version);
        writeJsonFile('manifest.json', updatedManifestData);
    }
    
    // Step 4: Execute mcpb pack (if not skipped)
    if (!skipMcpb) {
        if (!execCommand('mcpb pack . release/anki-mcp-server.mcpb', 'Packaging with mcpb')) {
            process.exit(1);
        }
    }
    
    // Step 5: Update server.json version and calculate SHA256 (only in production)
    if (isProduction) {
        console.log('🔄 Updating server.json version and SHA256...');
        
        // Calculate SHA256 for .mcpb file
        const mcpbPath = 'release/anki-mcp-server.mcpb';
        const mcpbSha256 = calculateFileSha256(mcpbPath);
        if (mcpbSha256) {
            console.log(`🔐 SHA256 for ${mcpbPath}: ${mcpbSha256}`);
        }
        
        // Update server.json
        const serverData = readJsonFile('server.json');
        if (serverData) {
            const updatedServerData = updateServerJson(serverData, version, mcpbSha256);
            writeJsonFile('server.json', updatedServerData);
        }
    }
    
    console.log('🎉 Build process completed successfully!');
}

if (require.main === module) {
    main();
}
