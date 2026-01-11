# Development Guide

This document provides a comprehensive guide for developing the Anki MCP Server project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Build System](#build-system)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Version Management](#version-management)
- [Release Process](#release-process)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you start developing, ensure you have the following installed:

- **Node.js** (>= 18.0.0)
- **npm** (comes with Node.js)
- **Anki** with **AnkiConnect** addon
- **Git**

### Anki Setup

1. Install [Anki](https://apps.ankiweb.net/)
2. Install the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) addon
3. Ensure Anki is running and AnkiConnect is enabled

## Project Structure

```
anki-mcp-server/
├── docs/                    # Documentation
├── scripts/                 # Build and utility scripts
│   ├── build.js            # Main build orchestrator
│   ├── update-manifest.js  # Manifest version management
│   └── update-version.js   # Server version management
├── src/                     # Source code
│   ├── ankiMcpServer.ts    # Main MCP server class
│   ├── mcpTools.ts         # MCP tool implementations
│   ├── mcpResource.ts      # MCP resource handlers
│   ├── utils.ts            # Utility functions
│   └── index.ts            # Entry point
├── dist/                    # Built files (generated)
├── release/                 # Release artifacts (generated)
├── assets/                  # Static assets
├── package.json            # Project configuration
├── tsup.config.ts          # Build configuration
└── server.json             # MCP server configuration
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/nailuoGG/anki-mcp-server.git
   cd anki-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development**
   ```bash
   npm run dev
   ```

## Development Workflow

### Daily Development

1. **Start the development server**
   ```bash
   npm run dev
   ```
   This runs tsup in watch mode, automatically rebuilding when files change.

2. **Make your changes**
   - Edit files in the `src/` directory
   - The build system will automatically recompile

3. **Test your changes**
   ```bash
   npm run test
   ```

4. **Check code quality**
   ```bash
   npm run check
   ```

### Build Process

The project uses a comprehensive build system that handles:

1. **TypeScript compilation** (via tsup)
2. **Version management** (automatic synchronization)
3. **Package creation** (mcpb format)
4. **SHA256 calculation** (for security)

#### Available Build Commands

```bash
# Development build (includes mcpb pack)
npm run build

# Production build (full version management)
npm run build:prod

# Build without mcpb packaging
npm run build:no-mcpb

# Complete release process
npm run release
```

## Build System

The build system is modular and handles the complete build sequence:

### Build Sequence

1. **Build TypeScript files** (`tsup`)
2. **Update manifest.json version**
3. **Execute mcpb pack**
4. **Update server.json version and calculate SHA256** (production only)

### Scripts Overview

- **`scripts/build.js`** - Main build orchestrator
- **`scripts/update-manifest.js`** - Updates manifest.json version
- **`scripts/update-version.js`** - Updates server.json and calculates SHA256

### Configuration

Build behavior is controlled by:

- **Environment variables**: `NODE_ENV=production`
- **Command line flags**: `--prod`, `--no-mcpb`
- **tsup.config.ts**: TypeScript compilation settings

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

Tests are located in `src/` with `.test.ts` extension:

```typescript
// Example test file: src/index.test.ts
import { describe, it, expect } from '@jest/globals';

describe('Anki MCP Server - Basic Tests', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true);
  });
});
```

## Code Quality

The project uses Biome for code formatting and linting:

### Available Commands

```bash
# Format code
npm run format

# Lint code
npm run lint

# Run all quality checks
npm run check
```

### Code Style

- **Indentation**: Tabs
- **Quotes**: Double quotes
- **Semicolons**: Required
- **Line length**: 100 characters

### Pre-commit Hooks

The project uses Husky and lint-staged for pre-commit quality checks:

- Automatic code formatting
- Lint checking
- Git staging of formatted files

## Version Management

Version numbers are automatically synchronized across all files:

### Files Updated

- `package.json` - Source of truth
- `manifest.json` - MCP manifest
- `server.json` - MCP server configuration

### Version Update Process

1. **Development builds**: Only update `manifest.json`
2. **Production builds**: Update all files and calculate SHA256

### Manual Version Updates

If you need to update versions manually:

```bash
# Update manifest.json only
npm run version:manifest

# Update server.json only
npm run version:server

# Update all version files
npm run version:all
```

## Release Process

### Creating a Release

1. **Update version in package.json**
   ```json
   {
     "version": "0.1.9"
   }
   ```

2. **Run the release process**
   ```bash
   npm run release
   ```

3. **Verify the release**
   - Check `release/anki-mcp-server.mcpb` exists
   - Verify version numbers in all files
   - Confirm SHA256 is calculated

### Release Artifacts

The release process creates:

- `release/anki-mcp-server.mcpb` - MCP package file
- Updated version files with correct versions
- Calculated SHA256 for security verification

## Troubleshooting

### Common Issues

#### Build Failures

**Problem**: TypeScript compilation errors
```bash
# Solution: Check TypeScript errors
npm run build
# Fix errors in src/ files
```

**Problem**: mcpb pack failures
```bash
# Solution: Check AnkiConnect is running
# Ensure Anki is open with AnkiConnect enabled
```

#### Version Sync Issues

**Problem**: Version numbers don't match
```bash
# Solution: Force version update
npm run version:all
```

#### ES Module Issues

**Problem**: `require is not defined` errors
```bash
# Solution: Ensure scripts use ES module syntax
# Check import statements use double quotes
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run build
```

### Getting Help

1. Check the [Issues](https://github.com/nailuoGG/anki-mcp-server/issues) page
2. Review the [MCP Documentation](https://modelcontextprotocol.io/)
3. Check [AnkiConnect Documentation](https://ankiweb.net/shared/info/2055492159)

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and quality checks
5. Submit a pull request

### Code Standards

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all checks pass

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

3. **Run quality checks**
   ```bash
   npm run check
   npm run test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feat/your-feature-name
   ```

## Additional Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [AnkiConnect API](https://github.com/FooSoft/anki-connect)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Jest Testing Framework](https://jestjs.io/)
- [Biome Documentation](https://biomejs.dev/)

---

For more information, see the [README](../README.md) or open an [issue](https://github.com/nailuoGG/anki-mcp-server/issues).
