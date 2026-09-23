# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-23

### Changed
- **Breaking:** `update_note` takes `noteId` instead of `id`, matching `get_note_info`,
  `delete_note`, and the tag tools
- `sync` no longer runs on a bare call: it requires `{"confirm": true}`, because a full
  AnkiWeb sync can merge or overwrite local and remote collections
- `delete_note` declares the `noteId`/`noteIds` mutual exclusion in its schema (the tag
  tools already did), so the constraint is visible before the call
- Toolchain pinned to Node 24 and pnpm 11 through mise; CI and the publish workflow run
  through `jdx/mise-action`
- Dependencies upgraded to their latest versions with exact pins

### Fixed
- The packed MCPB no longer ships a stale manifest version, and the release workflow
  verifies the MCPB asset is actually attached to the release
- `console.log` is redirected to stderr so stray stdout writes cannot corrupt the
  stdio JSON-RPC stream (#30)

### Added
- Automatic beta/stable channel selection in the publish workflow: tags containing a
  prerelease suffix publish to the `beta` dist-tag, clean versions publish to `latest`
- OIDC trusted publishing for npm (no long-lived `NPM_TOKEN`)

## [Unreleased]

### Added
- Batch deletion support in `delete_note` tool
- `delete_note` tool now accepts either `noteId` for one note or `noteIds` for multiple notes
- Enhanced `delete_note` response format with `deletedCount` and deleted `noteIds`
- GitHub Actions workflow for automated npm publishing
- GitHub Actions workflow for testing on pull requests
- Release test workflow to ensure quality before publishing
- Beta release workflow for publishing prerelease versions
- Dedicated beta branch for prerelease development
- Automatic beta version numbering (e.g., 0.1.2-beta.1)
- Sequential workflow execution (test → publish)
- Robust version validation supporting multiple tag formats
- npm package configuration
- Installation instructions for npm package

### Changed
- `delete_note` tool description now reflects single-note and batch deletion support

## [0.1.0] - 2025-03-20


### Added

- Initial release
- MCP server implementation for Anki integration
- Support for creating, reading, updating, and deleting notes
- Support for managing decks
- Support for creating note types
- Automatic language detection for Anki interface
- Support for both English and Chinese Anki interfaces

## [0.1.0] - 2025-03-23

### Added

- Add  `get_note_type_info` - Get detailed structure of a note type
- Add Resources `anki://decks/all`, `anki://note-types/{modelName}` etc 
- Support for detect card type fields before create card

### Changed

- Build base on  `yanki-connect` now 
