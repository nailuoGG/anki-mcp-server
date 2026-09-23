# Release Process

Publishing is automated by `.github/workflows/publish.yml` using npm **Trusted Publishing (OIDC)** —
no `NPM_TOKEN` is involved. The package's npm settings must list this repository and
`publish.yml` as a trusted publisher, with environment `npm`.

## Stable release (dist-tag `latest`)

```bash
npm version <patch|minor|major>   # bumps package.json and creates the git tag
git push --follow-tags
```

The workflow verifies the tag matches `package.json`, runs lint + tests, publishes,
and creates a GitHub release.

## Beta release (dist-tag `beta`)

```bash
npm version 0.2.1-beta.1          # any version containing a prerelease suffix
git push --follow-tags
```

Tags containing `-` (e.g. `v0.2.1-beta.1`) publish with `--tag beta` (never `latest`),
skip the test gate (fast channel), and create a GitHub **pre-release**. Consumers
install with `npm install anki-mcp-server@beta`.

## One-time setup

1. npmjs.com → package `anki-mcp-server` → Settings → Trusted Publishing →
   add: repository `nailuoGG/anki-mcp-server`, workflow `publish.yml`, environment `npm`.
2. A GitHub environment named `npm` must exist (create it under repo Settings →
   Environments; no protection rules needed).
