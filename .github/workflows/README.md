# GitHub Actions Workflows

## CI (`ci.yml`)

Runs on pushes and pull requests to `master` using Node 24 and pnpm 11 via mise.
The test job runs a frozen dependency install, lint, typecheck, build, MCP metadata
validation, tests, and a package dry run. The dependent build-check job builds again
and uploads `dist/` as a temporary CI artifact.

## Publishing (`publish.yml`)

Runs only when a `v*` tag is pushed. The workflow verifies that the tag matches
`package.json`, installs frozen dependencies, and builds the npm package.
Stable tags run lint and tests, publish to npm with dist-tag `latest`, and create
a GitHub Release. Prerelease tags containing `-` publish with dist-tag `beta`
and create a GitHub prerelease.

npm publishing uses Trusted Publishing (OIDC) in the `npm` environment.
GitHub Release creation uses the workflow's `GITHUB_TOKEN`; no `NPM_TOKEN` is used.
See [RELEASE.md](../../RELEASE.md) for the release procedure and required setup.

MCP Registry publication remains a separate manual operation documented in the
[README](../../README.md#publishing-to-mcp-registry). To validate its metadata locally:

```bash
pnpm run validate-mcp
```
