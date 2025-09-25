# Installing anki-mcp-server with LLMs

This guide provides step-by-step instructions for installing and configuring the anki-mcp-server MCP server using Large Language Models (LLMs).

## Installation Steps

### Preferred: Install via Desktop Extension (.mcpb)

1. Download the `.mcpb` bundle from the Releases page (or build locally with `mcpb pack`).
2. Open Claude Desktop → Settings → Extensions.
3. Drag the `.mcpb` file into the window and click Install.

To build the bundle locally:

```bash
npm install -g @anthropic-ai/mcpb
mcpb pack
```

This validates `manifest.json` and outputs an installable archive. See: [Desktop Extensions: One-click MCP server installation for Claude Desktop](https://www.anthropic.com/engineering/desktop-extensions).

### Alternative: Manual configuration for Claude Desktop

Edit your Claude configuration file:

- MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "anki": {
      "command": "npx",
      "args": ["--yes", "anki-mcp-server"]
    }
  }
}
```

### Configuration for Cline

Add the anki server to your `cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "anki": {
      "command": "npx",
      "args": ["--yes", "anki-mcp-server"]
    }
  }
}
```

## Verification

To verify the installation:

1. Ensure Anki is running
2. Start Claude
3. Try creating a new note with the following prompt:

```
Create an Anki card in the "Default" deck with:
Front: What is the capital of France?
Back: Paris
```

## Troubleshooting

1. "Cannot connect to AnkiConnect" error:

   - Ensure Anki is running
   - Check if AnkiConnect is properly installed
   - Restart Anki and try again

2. "Permission denied" when running the server:

   - Ensure the build file is executable:

   ```bash
   chmod +x build/index.js
   ```

3. "Deck not found" error:
   - Create the deck manually in Anki first
   - Check for exact deck name spelling

## Testing

To run the test suite:

```bash
npm test
```

This will verify:

- Server initialization
- AnkiConnect communication
- Note creation/deletion
- Deck operations

For development with auto-rebuild:

```bash
npm run watch
```
