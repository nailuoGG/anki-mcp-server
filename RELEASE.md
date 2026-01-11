# Release Process

This document outlines the process for creating new releases of the anki-mcp-server package and publishing them to npm.

## Prerequisites

1. Ensure you have npm account with publish access to the package
2. Ensure you have the NPM_TOKEN secret set up in the GitHub repository settings

## Standard Release Process

### 1. Update Version

Update the version in `package.json` according to [Semantic Versioning](https://semver.org/):

- **Major version (x.0.0)**: Breaking changes
- **Minor version (0.x.0)**: New features (backwards compatible)
- **Patch version (0.0.x)**: Bug fixes and minor changes

```bash
# Update versions (package.json, manifest.json, server.json)
pnpm version patch  # or minor, or major
pnpm check:versions
```

### 2. Update Changelog

Ensure the CHANGELOG.md is updated with the new version and all changes since the last release.

### 3. Create a Pull Request

Create a pull request with the version bump and changelog updates.

### 4. Create a GitHub Release

Once the PR is merged:

1. Go to the [Releases page](https://github.com/nailuoGG/anki-mcp-server/releases)
2. Click "Draft a new release"
3. Create a new tag matching the version in package.json
   - You can use either format: `0.1.1` or `v0.1.1` (with or without the 'v' prefix)
   - The workflow will automatically handle both formats
4. Title the release with the version number
5. Add release notes (can be copied from CHANGELOG.md)
6. Click "Create release" (not "Publish release")

### 5. Attach Desktop Extension (.mcpb)

Optionally package and attach a Desktop Extension for Claude Desktop users:

```bash
npm install -g @anthropic-ai/mcpb
mcpb pack
```

This validates `manifest.json` and produces a `.mcpb` archive. Upload it as a release asset so users can install with a drag-and-drop in Claude Desktop. See: [Desktop Extensions: One-click MCP server installation for Claude Desktop](https://www.anthropic.com/engineering/desktop-extensions).

### 6. Monitor the Release Test Workflow

The GitHub Actions workflow will automatically:

1. Run the "Release Test" workflow first:

   - Build the package
   - Run tests on multiple Node.js versions
   - Validate the version matches the GitHub release tag
   - Check package validity

2. If all tests pass, the "Publish to NPM" workflow will run:
   - Build the package
   - Generate an SBOM (Software Bill of Materials)
   - Publish to npm with provenance

You can monitor the progress in the [Actions tab](https://github.com/nailuoGG/anki-mcp-server/actions).

### 7. Verify the Publication

Check that the package is available on npm:

```bash
npm view anki-mcp-server
```

## Beta Release Process

Beta releases allow for testing new features before they are included in a standard release.

### 1. Create and Switch to Beta Branch

```bash
# Create a new beta branch from the main branch
git checkout main
git pull
git checkout -b beta
```

### 2. Make Changes and Push

Make your changes, commit them, and push to the beta branch:

```bash
git add .
git commit -m "Your commit message"
git push -u origin beta
```

### 3. Monitor the Beta Release Workflow

The GitHub Actions workflow will automatically:

1. Run tests on the beta branch
2. Generate a beta version number (e.g., 0.1.2-beta.1)
3. Publish to npm with the beta tag
4. Create a git tag for the beta version

You can monitor the progress in the [Actions tab](https://github.com/nailuoGG/anki-mcp-server/actions).

### 4. Install and Test the Beta Version

Users can install the beta version using:

```bash
npm install anki-mcp-server@beta
```

### 5. Merge to Main

Once the beta version has been tested and is ready for a standard release:

1. Create a pull request from the beta branch to main
2. Follow the standard release process to create a new release

## Troubleshooting

If the publish workflow fails:

1. Check the workflow logs in GitHub Actions
2. Common issues:
   - Version mismatch between package.json and GitHub release tag
   - Failed tests
   - npm authentication issues

## NPM Token Setup

To set up the NPM_TOKEN secret:

1. Generate an npm access token with publish permissions
2. Go to GitHub repository settings > Secrets and variables > Actions
3. Add a new repository secret named `NPM_TOKEN` with the value of your npm token
