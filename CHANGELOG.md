# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] - 2026-10-27

### Security
- Update transitive `body-parser` to 2.4.0 and `fast-uri` to 3.1.9, clearing
  five security advisories. Full dependency audit findings drop from seven to two.
- Remaining high-severity findings affect `node-forge` 1.4.0 (via `@anthropic-ai/mcpb`)
  and Zod 3.25.76 (via the MCP SDK and MCPB tooling). `node-forge` has no fixed
  release; resolving the Zod finding requires a compatible migration to Zod 4.

### Changed
- `@modelcontextprotocol/sdk` 1.32.1 → 1.32.2, `@biomejs/biome` 2.5.15 → 2.6.3,
  and `@swc/core` 1.16.18 → 1.16.20.
- Refresh compatible transitive dependencies and remove the expired `ignore`
  quarantine override, allowing 7.0.14.
- Migrate the Biome configuration to the 2.6.3 schema and recommended preset.

## [0.2.2] - 2026-10-20

### Security
- `tmp` pinned to 0.2.7 across the dependency tree via a pnpm override,
  clearing GHSA-ph9p-34f9-6g65 (high) and GHSA-52f5-9888-hmc6. `external-editor`
  (via `@anthropic-ai/mcpb` → `@inquirer`) pins `tmp@^0.0.33`, so an override is
  the only way to move it; remove the entry once upstream releases a fixed
  transitive
- Known remaining audit findings with no upstream fix: `node-forge` 1.4.0
  (GHSA-86w9-cpqp-85rv) and `sprintf-js` 1.1.3 (GHSA-hp3w-g68c-fv3c); both are
  devDependencies transitives that do not ship in `dist`

### Changed
- `tsup` 8.5.1 → 9.0.0 (build tool only), which moves the bundler to `esbuild`
  0.28.2 and clears GHSA-g7r4-m6w7-qqqr

## [0.2.1] - 2026-10-13

### Changed
- Toolchain upgraded to TypeScript 7.0.2 (native compiler line); `tsconfig` adapted
  (removed `baseUrl`, explicit `types: ["node"]`)
- Test transform migrated from `ts-jest` to `@swc/jest` (transpile-only); type
  checking is now owned by `pnpm typecheck` (`tsc --noEmit`) and runs in CI
- `@modelcontextprotocol/sdk` 1.30.0 → 1.32.1, `yanki-connect` 4.0.11 → 4.0.12,
  plus patch bumps for `@biomejs/biome`, `@types/node`, `lint-staged`

### Removed
- Stale `package-lock.json` (the project is managed by pnpm; the unmaintained npm
  lockfile was the source of 69 of the 74 open Dependabot alerts)

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
