# Anki MCP Evaluations

These evaluation assets exercise the high-value read-only paths that agents rely on:

- discover decks and tags
- inspect note type requirements
- search notes with pagination
- read stable MCP resources
- use structured tool results instead of scraping text

## Fixture

Load `fixtures/anki-agent-readonly-fixture.json` into a disposable Anki profile with
`anki_batch_create_notes`. After the fixture is loaded, the questions in
`anki-agent-readonly-evaluation.xml` are read-only.

The fixture deck is `MCP Eval::Agent Basics`; every fixture note has the
`mcp-eval` tag.

## Expected Server Capabilities

The evaluation assumes these read-only tools and resources are available:

- `anki_list_decks`
- `anki_list_tags`
- `anki_list_note_types`
- `anki_get_note_type_info`
- `anki_search_notes`
- `anki_get_note_info`
- `anki://decks/all`
- `anki://tags/all`
- `anki://note-types/all`
- `anki://note-types/{modelName}`

Mutation tools are only needed to load the fixture into a disposable profile.
