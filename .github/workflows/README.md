# GitHub Actions Workflows

This directory contains the GitHub Actions workflows for the Anki MCP Server project.

## Workflow Architecture

### 1. CI Workflow (`ci.yml`)
**Trigger:** Push to `master` branch, Pull Requests to `master`
**Purpose:** Continuous Integration - Code quality and testing

**Jobs:**
- `test`: Multi-version testing (Node 18.x, 20.x, 22.x)
  - Lint code
  - Format check
  - Build project
  - Run tests
  - Validate MCP schema
  - Check package validity
- `build-check`: Build verification
  - Test MCP Inspector
  - Upload build artifacts

### 2. Release Workflow (`release.yml`)
**Trigger:** GitHub Release created
**Purpose:** Publish stable releases to NPM and MCP Registry

**Jobs:**
- `test`: Pre-release testing (Node 18.x, 20.x, 22.x)
  - Same as CI test job
- `publish-npm`: Publish to NPM
  - Build and publish to NPM with provenance
  - Upload NPM logs
- `publish-mcp`: Publish to MCP Registry
  - Validate server.json schema
  - Install MCP Publisher CLI
  - Login with OIDC
  - Publish to MCP Registry
  - Upload MCP logs
- `notify`: Release status notification
  - Report success/failure status

### 3. Beta Release Workflow (`beta-release.yml`)
**Trigger:** Push to `release-beta/*` branches
**Purpose:** Publish beta releases for testing

**Jobs:**
- `beta-test`: Beta testing (Node 18.x, 20.x)
  - Same as CI test job
- `beta-publish-npm`: Publish beta to NPM
  - Generate beta version number
  - Update package.json and server.json versions
  - Publish with beta tag
  - Create Git tag
- `beta-publish-mcp`: Publish beta to MCP Registry
  - Same as release MCP publishing
- `beta-notify`: Beta release status notification

## Key Features

### ✅ **Unified Architecture**
- Clear separation of concerns
- Consistent testing across all workflows
- Parallel execution where possible

### ✅ **Comprehensive Testing**
- Multi-version Node.js testing
- Code quality checks (lint, format)
- MCP schema validation
- Package validity verification

### ✅ **Dual Publishing**
- Automatic publishing to both NPM and MCP Registry
- Independent failure handling
- Status notifications

### ✅ **Beta Support**
- Automated beta version generation
- Version synchronization across files
- Separate beta publishing pipeline

### ✅ **Error Handling**
- Detailed logging and artifact uploads
- Status notifications
- Independent job failure handling

## Usage

### Creating a Release
1. Update version in `package.json`
2. Create a GitHub Release
3. Workflows automatically handle testing and publishing

### Creating a Beta Release
1. Create a branch named `release-beta/feature-name`
2. Push to the branch
3. Beta version will be automatically generated and published

### Manual Validation
```bash
npm run validate-mcp
```

## Dependencies

- **NPM_TOKEN**: Required for NPM publishing
- **GITHUB_TOKEN**: Automatically provided for Git operations
- **OIDC**: Used for MCP Registry authentication

## Monitoring

All workflows include:
- Detailed step logging
- Artifact uploads for debugging
- Status notifications
- Error reporting
