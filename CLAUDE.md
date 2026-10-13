# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is an MCP (Model Context Protocol) server that enables LLMs to interact with Anki flashcard software through AnkiConnect. The server provides tools for creating, searching, updating, and managing Anki notes and decks.

## Development Commands

### Build & Development

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Development mode with auto-rebuild
npm run watch

# Run the MCP Inspector for debugging
npm run inspector
```

### Testing

```bash
# Run tests (currently no test files exist)
npm test
npm run test:watch
npm run test:coverage
```

### Code Quality

```bash
# Format code with Biome
npm run format

# Lint code
npm run lint  

# Check and auto-fix issues
npm run check
```

## Architecture

### Core Components

- **`src/index.ts`**: Entry point that initializes and runs the AnkiMcpServer
- **`src/ankiMcpServer.ts`**: Main server class that handles MCP protocol communication and request routing
- **`src/mcpTools.ts`**: Implements all MCP tool handlers for Anki operations (create/update/delete notes, manage decks)
- **`src/mcpResource.ts`**: Handles MCP resource endpoints for listing decks and note types
- **`src/utils.ts`**: AnkiClient class that communicates with AnkiConnect API

### MCP Tools Available

The server implements the following tools:
- `anki_list_decks` - List all available Anki decks
- `anki_create_deck` - Create a new Anki deck
- `anki_create_note` - Create a new note (Basic or Cloze)
- `anki_batch_create_notes` - Create multiple notes at once
- `anki_search_notes` - Search for notes using Anki query syntax
- `anki_get_note_info` - Get detailed information about a note
- `anki_update_note` - Update an existing note
- `anki_delete_note` - Delete one or multiple notes
- `anki_list_note_types` - List all available note types
- `anki_create_note_type` - Create a new note type
- `anki_get_note_type_info` - Get detailed structure of a note type
- `anki_check_connection` - Check whether AnkiConnect is reachable
- `anki_list_tags` / `anki_add_note_tags` / `anki_remove_note_tags` - Tag management
- `anki_sync` - Trigger AnkiWeb sync (requires `{"confirm": true}`)

### Build Configuration

- **TypeScript**: ES2020 target with Node16 module system
- **Bundler**: tsup with ESM and CJS outputs
- **Code Formatter**: Biome (configured via lint-staged pre-commit hook)
- **Testing**: Jest with ts-jest preset (though no test files currently exist)

### Dependencies

- **Core**: `@modelcontextprotocol/sdk`, `axios`, `yanki-connect`
- **Development**: TypeScript, tsup, Jest, Biome, Husky

## Important Notes

- The server requires Anki and AnkiConnect addon to be running
- Version is managed in package.json and automatically injected into `src/_version.ts` during build
- Pre-commit hooks run Biome formatting via lint-staged
- The server communicates via stdio with the MCP client