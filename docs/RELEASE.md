# Release runbook

## Preconditions

- The GitHub repository is public and its default branch is `main`.
- The package's `repository.url` exactly matches the public GitHub repository.
- After the bootstrap publication, npm trusted publishing is configured for owner `abhid1234`, repository `evolveci`, workflow `release.yml`, and environment `npm`.
- The package name and version are aligned across `package.json`, `VERSION`, `src/version.ts`, and `CHANGELOG.md`.
- `main` is clean and CI is green at the exact release commit.

## Local gate

```bash
npm ci
npm run release:check
npm pack --dry-run --cache /tmp/evolveci-npm-cache
```

The release gate inspects the tarball manifest, installs that tarball into a clean temporary consumer, and runs its version and help commands. The manifest must contain compiled CLI files, schemas, README, changelog, license, and package metadata. It must not contain tests, demo worktrees, generated evidence, credentials, or local configuration.

## Bootstrap the package once

Trusted-publisher configuration requires an existing npm package. Publish the first version manually from the clean, tagged repository using account 2FA:

```bash
npm login --auth-type=web
npm whoami
npm publish --access public --provenance=false
```

Local npm publication cannot create GitHub Actions provenance. The explicit `--provenance=false` overrides the package default for this one bootstrap only. Immediately verify the registry readback below. Then configure the npm trusted publisher and remove any temporary automation credential. Never put an OTP or token in an issue, commit, workflow, or chat.

## Publish subsequent releases through trusted publishing

1. Merge the reviewed release commit to `main`.
2. Create a GitHub release tagged `v<package-version>` from that exact commit.
3. The release workflow uses Node 24 and npm 11.5.1 or newer, reruns the full gate, and publishes with automatic npm provenance. Pre-releases use the `next` dist-tag; stable versions use `latest`.
4. Do not rerun a failed publication blindly. Inspect the workflow and registry first.

## Independent readback

Publication is complete only after all checks pass:

```bash
npm view @avee1234/evolveci version --prefer-online
npm view @avee1234/evolveci dist.integrity --prefer-online
npm exec --yes --package=@avee1234/evolveci@<version> -- evolveci --version
```

Also verify the GitHub release points at the intended commit and contains the expected source archive. A local pack, successful workflow start, or browser authentication page is not registry proof.
