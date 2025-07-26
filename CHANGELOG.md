# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
- Example cards system for note types
  - `get_note_type_examples` tool - Get examples for a note type from example cards
  - `create_example_card` tool - Create a new example card for a note type
  - `update_example_card` tool - Update an existing example card
  - `find_example_cards` tool - Find example cards for a specific note type
- Support for special tags to identify example cards (`example-card`, `template-example`, `示例卡片`)
- Automatic example card discovery and description extraction
- Enhanced example management with rich descriptions and flexible marking

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

- Add `get_note_type_info` - Get detailed structure of a note type
- Add Resources `anki://decks/all`, `anki://note-types/{modelName}` etc
- Support for detect card type fields before create card

### Changed

- Build base on `yanki-connect` now
