# API Documentation

This document provides comprehensive API documentation for the Anki MCP Server.

## Overview

The Anki MCP Server implements the Model Context Protocol (MCP) to enable LLMs to interact with Anki flashcard software through AnkiConnect.

## MCP Tools

### Deck Management

#### list_decks

Lists all available Anki decks.

**Parameters:** None

**Returns:**
```typescript
{
  decks: Array<{
    id: number;
    name: string;
    description: string;
    cards: number;
    newCards: number;
    reviewCards: number;
    learnCards: number;
  }>
}
```

**Example:**
```json
{
  "decks": [
    {
      "id": 1,
      "name": "Default",
      "description": "",
      "cards": 100,
      "newCards": 10,
      "reviewCards": 50,
      "learnCards": 40
    }
  ]
}
```

#### create_deck

Creates a new Anki deck.

**Parameters:**
```typescript
{
  name: string;
  description?: string;
}
```

**Returns:**
```typescript
{
  deckId: number;
  message: string;
}
```

**Example:**
```json
{
  "deckId": 2,
  "message": "Deck 'Spanish Vocabulary' created successfully"
}
```

### Note Management

#### create_note

Creates a new note (Basic or Cloze).

**Parameters:**
```typescript
{
  deckName: string;
  noteType: "Basic" | "Cloze";
  fields: Record<string, string>;
  tags?: string[];
  clozeIndex?: number; // Required for Cloze notes
}
```

**Returns:**
```typescript
{
  noteId: number;
  message: string;
}
```

**Example (Basic note):**
```json
{
  "noteId": 12345,
  "message": "Basic note created successfully"
}
```

**Example (Cloze note):**
```json
{
  "noteId": 12346,
  "message": "Cloze note created successfully"
}
```

#### batch_create_notes

Creates multiple notes at once.

**Parameters:**
```typescript
{
  notes: Array<{
    deckName: string;
    noteType: "Basic" | "Cloze";
    fields: Record<string, string>;
    tags?: string[];
    clozeIndex?: number;
  }>
}
```

**Returns:**
```typescript
{
  noteIds: number[];
  message: string;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}
```

**Example:**
```json
{
  "noteIds": [12345, 12346, 12347],
  "message": "3 notes created successfully",
  "errors": []
}
```

#### search_notes

Searches for notes using Anki query syntax.

**Parameters:**
```typescript
{
  query: string;
  limit?: number;
}
```

**Returns:**
```typescript
{
  noteIds: number[];
  totalCount: number;
}
```

**Example:**
```json
{
  "noteIds": [12345, 12346, 12347],
  "totalCount": 3
}
```

#### get_note_info

Gets detailed information about a note.

**Parameters:**
```typescript
{
  noteId: number;
}
```

**Returns:**
```typescript
{
  noteId: number;
  fields: Record<string, string>;
  tags: string[];
  noteType: string;
  deckName: string;
  created: number;
  modified: number;
  flags: number;
}
```

**Example:**
```json
{
  "noteId": 12345,
  "fields": {
    "Front": "Hello",
    "Back": "Hola"
  },
  "tags": ["spanish", "greetings"],
  "noteType": "Basic",
  "deckName": "Spanish Vocabulary",
  "created": 1698765432,
  "modified": 1698765432,
  "flags": 0
}
```

#### update_note

Updates an existing note.

**Parameters:**
```typescript
{
  noteId: number;
  fields?: Record<string, string>;
  tags?: string[];
}
```

**Returns:**
```typescript
{
  noteId: number;
  message: string;
}
```

**Example:**
```json
{
  "noteId": 12345,
  "message": "Note updated successfully"
}
```

#### delete_note

Deletes a note.

**Parameters:**
```typescript
{
  noteId: number;
}
```

**Returns:**
```typescript
{
  message: string;
}
```

**Example:**
```json
{
  "message": "Note deleted successfully"
}
```

### Note Type Management

#### list_note_types

Lists all available note types.

**Parameters:** None

**Returns:**
```typescript
{
  noteTypes: Array<{
    name: string;
    id: number;
    fields: string[];
    templates: Array<{
      name: string;
      front: string;
      back: string;
    }>;
  }>
}
```

**Example:**
```json
{
  "noteTypes": [
    {
      "name": "Basic",
      "id": 1,
      "fields": ["Front", "Back"],
      "templates": [
        {
          "name": "Card 1",
          "front": "{{Front}}",
          "back": "{{FrontSide}}\n\n---\n\n{{Back}}"
        }
      ]
    }
  ]
}
```

#### create_note_type

Creates a new note type.

**Parameters:**
```typescript
{
  name: string;
  fields: string[];
  templates: Array<{
    name: string;
    front: string;
    back: string;
  }>;
}
```

**Returns:**
```typescript
{
  noteTypeId: number;
  message: string;
}
```

**Example:**
```json
{
  "noteTypeId": 2,
  "message": "Note type 'Custom' created successfully"
}
```

#### get_note_type_info

Gets detailed structure of a note type.

**Parameters:**
```typescript
{
  noteTypeName: string;
}
```

**Returns:**
```typescript
{
  name: string;
  id: number;
  fields: Array<{
    name: string;
    ord: number;
    sticky: boolean;
    rtl: boolean;
    font: string;
    size: number;
  }>;
  templates: Array<{
    name: string;
    ord: number;
    qfmt: string;
    afmt: string;
    did: number;
  }>;
}
```

**Example:**
```json
{
  "name": "Basic",
  "id": 1,
  "fields": [
    {
      "name": "Front",
      "ord": 0,
      "sticky": false,
      "rtl": false,
      "font": "Arial",
      "size": 20
    }
  ],
  "templates": [
    {
      "name": "Card 1",
      "ord": 0,
      "qfmt": "{{Front}}",
      "afmt": "{{FrontSide}}\n\n---\n\n{{Back}}",
      "did": 1
    }
  ]
}
```

## Error Handling

### Error Response Format

All tools return errors in a consistent format:

```typescript
{
  error: {
    code: string;
    message: string;
    details?: any;
  }
}
```

### Common Error Codes

- `ANKI_CONNECT_ERROR` - AnkiConnect communication failed
- `DECK_NOT_FOUND` - Specified deck doesn't exist
- `NOTE_NOT_FOUND` - Specified note doesn't exist
- `INVALID_NOTE_TYPE` - Invalid note type specified
- `VALIDATION_ERROR` - Input validation failed
- `PERMISSION_ERROR` - Insufficient permissions

### Example Error Response

```json
{
  "error": {
    "code": "DECK_NOT_FOUND",
    "message": "Deck 'NonExistentDeck' not found",
    "details": {
      "deckName": "NonExistentDeck"
    }
  }
}
```

## AnkiConnect Integration

The server communicates with Anki through the AnkiConnect addon using HTTP requests.

### Connection Requirements

- Anki must be running
- AnkiConnect addon must be installed and enabled
- Default AnkiConnect URL: `http://localhost:8765`

### Request Format

All requests to AnkiConnect follow this format:

```typescript
{
  action: string;
  version: number;
  params?: any;
}
```

### Response Format

AnkiConnect responses:

```typescript
{
  result: any;
  error: string | null;
}
```

## Configuration

### Server Configuration

The server configuration is defined in `server.json`:

```json
{
  "name": "io.github.nailuoGG/anki-mcp-server",
  "description": "MCP server enabling LLMs to interact with Anki",
  "version": "0.1.8",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "anki-mcp-server",
      "version": "0.1.8",
      "transport": {
        "type": "stdio"
      }
    }
  ]
}
```

### Environment Variables

- `ANKI_CONNECT_URL` - AnkiConnect server URL (default: `http://localhost:8765`)
- `NODE_ENV` - Environment mode (`development` or `production`)

## Usage Examples

### Basic Note Creation

```typescript
// Create a basic note
const result = await mcpClient.callTool("create_note", {
  deckName: "Spanish Vocabulary",
  noteType: "Basic",
  fields: {
    "Front": "Hello",
    "Back": "Hola"
  },
  tags: ["spanish", "greetings"]
});
```

### Cloze Note Creation

```typescript
// Create a cloze note
const result = await mcpClient.callTool("create_note", {
  deckName: "Science",
  noteType: "Cloze",
  fields: {
    "Text": "The capital of France is {{c1::Paris}}."
  },
  clozeIndex: 1,
  tags: ["geography"]
});
```

### Batch Note Creation

```typescript
// Create multiple notes
const result = await mcpClient.callTool("batch_create_notes", {
  notes: [
    {
      deckName: "Spanish Vocabulary",
      noteType: "Basic",
      fields: { "Front": "Hello", "Back": "Hola" }
    },
    {
      deckName: "Spanish Vocabulary",
      noteType: "Basic",
      fields: { "Front": "Goodbye", "Back": "Adiós" }
    }
  ]
});
```

### Note Search

```typescript
// Search for notes
const result = await mcpClient.callTool("search_notes", {
  query: "deck:Spanish tag:greetings",
  limit: 10
});
```

## Best Practices

### Note Creation

1. **Use appropriate note types**: Basic for simple Q&A, Cloze for fill-in-the-blank
2. **Consistent field naming**: Use standard field names like "Front", "Back"
3. **Meaningful tags**: Use descriptive tags for organization
4. **Validate input**: Check field requirements before creating notes

### Deck Management

1. **Organize by subject**: Create separate decks for different subjects
2. **Use descriptive names**: Make deck names clear and meaningful
3. **Check deck existence**: Verify decks exist before creating notes

### Error Handling

1. **Always check for errors**: Handle both MCP and AnkiConnect errors
2. **Provide meaningful messages**: Give users clear error information
3. **Log errors**: Record errors for debugging purposes

## Limitations

### AnkiConnect Limitations

- Requires Anki to be running
- Limited to AnkiConnect API capabilities
- No real-time synchronization

### MCP Limitations

- Single-threaded execution
- Limited concurrent operations
- No persistent connections

## Troubleshooting

### Common Issues

1. **AnkiConnect not responding**
   - Check if Anki is running
   - Verify AnkiConnect addon is enabled
   - Check firewall settings

2. **Note creation failures**
   - Verify deck exists
   - Check field requirements
   - Validate note type

3. **Search not working**
   - Check query syntax
   - Verify deck names and tags
   - Use proper Anki query format

### Debug Mode

Enable debug logging:

```bash
DEBUG=anki-mcp-server npm run dev
```

---

For more information, see the [Development Guide](DEVELOPMENT.md) or the main [README](../README.md).
