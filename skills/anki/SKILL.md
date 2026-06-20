---
name: anki
description: Use when the user wants to create Anki flashcards, manage Anki decks, search notes, or interact with Anki via AnkiConnect. Triggers on phrases like "create flashcards", "add to Anki", "make Anki cards", "batch create notes", or "manage my Anki deck".
metadata:
  author: nailuoGG
  version: "1.0.0"
---

# Anki MCP Server Skill

Create and manage Anki flashcards through the `anki-mcp-server` MCP integration.

## Prerequisites

1. Anki desktop app is running
2. [AnkiConnect](https://ankiweb.net/shared/info/2055492159) addon installed (default port 8765)
3. MCP server configured in Claude:

```json
{
  "mcpServers": {
    "anki": {
      "command": "npx",
      "args": ["-y", "anki-mcp-server"]
    }
  }
}
```

> **Note:** Do not use the `.mcpb` packaged version — it outputs Electron metadata to stdout which breaks the MCP stdio protocol.

## Quick Reference

| Goal | Tool | Key Args |
|---|---|---|
| Check connection | `anki_check_connection` | — |
| List all decks | `anki_list_decks` | — |
| Create deck | `anki_create_deck` | `name` |
| List all tags | `anki_list_tags` | — |
| Add note tags | `anki_add_note_tags` | `noteId` or `noteIds`, `tags` |
| Remove note tags | `anki_remove_note_tags` | `noteId` or `noteIds`, `tags` |
| Create one note | `anki_create_note` | `type`, `deck`, `fields` |
| Batch create notes | `anki_batch_create_notes` | `notes[]` (10–20 per batch) |
| Search notes | `anki_search_notes` | `query` (Anki syntax), `limit`, `offset` |
| Get note details | `anki_get_note_info` | `noteId` |
| Update note | `anki_update_note` | `id`, `fields`, `tags` |
| Delete note | `anki_delete_note` | `noteId` or `noteIds` |
| List note types | `anki_list_note_types` | — |
| Get field names | `anki_get_note_type_info` | `modelName` |

Legacy unprefixed tool names still work, but prefer the `anki_*` tools for new workflows.

## Core Workflows

### From text/notes → Flashcards

1. Call `anki_list_decks` to confirm target deck (create if needed)
2. Call `anki_get_note_type_info` to confirm field names for the chosen type
3. Extract knowledge points — one concept per card
4. Call `anki_batch_create_notes` (10–20 notes per call, max 50)

**Minimum information principle:** Each card tests exactly one thing.

### Note Types

| Type | Fields | Use For |
|---|---|---|
| `Basic` | `Front`, `Back` | Definitions, facts, Q&A |
| `Cloze` | `Text` with `{{c1::deletion}}` | Fill-in-the-blank, sequences |

**Always call `anki_get_note_type_info` first** when using custom note types — field names vary.

### Batch Create Example

```json
{
  "notes": [
    {
      "type": "Basic",
      "deck": "Programming::Python",
      "fields": {
        "Front": "What does list comprehension look like in Python?",
        "Back": "[expr for item in iterable if condition]"
      },
      "tags": ["python", "syntax"]
    },
    {
      "type": "Cloze",
      "deck": "Programming::Python",
      "fields": {
        "Text": "In Python, {{c1::def}} defines a function and {{c2::return}} sends back a value."
      },
      "tags": ["python", "basics"]
    }
  ],
  "allowDuplicate": false,
  "stopOnError": false
}
```

### Search Syntax

```
deck:Python              # Cards in Python deck
tag:重要 is:due          # Due cards tagged "重要"
is:new                   # Unseen cards
note:Basic               # Cards using Basic note type
"exact phrase"           # Exact text match
```

### Tags

Use `anki_list_tags` to inspect existing tags. For metadata-only changes, prefer `anki_add_note_tags` and `anki_remove_note_tags`; use `anki_update_note` only when replacing the full tag list.

## Deck Naming

Use `::` for hierarchy: `Language::English::Vocabulary`, `CS::Algorithms::Sorting`

## Common Mistakes

| Mistake | Fix |
|---|---|
| Not calling `anki_get_note_type_info` first | Always check field names before creating notes with custom types |
| Batches > 50 notes | Split into multiple calls of 10–20 |
| Using `.mcpb` file | Use `npx -y anki-mcp-server` instead |
| Anki not running | Start Anki, verify AnkiConnect is active |
| Wrong field names | Field names are case-sensitive — use `anki_get_note_type_info` to verify |
