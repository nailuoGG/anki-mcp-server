# Installing anki-mcp-server with LLMs

This guide provides step-by-step instructions for installing and configuring the anki-mcp-server MCP server using Large Language Models (LLMs).

## Installation Steps

### Configure an MCP client

Use an MCP client that supports stdio servers. Run the published npm package with `npx --yes anki-mcp-server`; for clients using `mcpServers`, add:

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
2. Start your MCP client
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
   chmod +x dist/index.js
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
