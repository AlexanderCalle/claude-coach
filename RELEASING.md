# Releasing Claude Coach

This document describes how to release a new version of Claude Coach.

## Prerequisites

- npm account with publish access to `claude-coach`
- GitHub account with push access to the repository
- GitHub CLI (`gh`) installed and authenticated

## Release Steps

### 1. Update Version

Update the version number in `package.json`:

```bash
npm version patch  # or minor, or major
```

This will:

- Bump the version in package.json
- Create a git commit
- Create a git tag

The About tab automatically reads the version from package.json at build time.

### 2. Build Everything

```bash
# Build the viewer (creates templates/plan-viewer.html)
npm run build:viewer

# Build the skill zips (creates dist/coach-skill.zip and dist/coach-checkin-skill.zip)
npm run build:skill
npm run build:skill-checkin
```

### 3. Publish to npm

```bash
npm publish
```

This publishes the package to npm, making it available via `npx claude-coach`.

### 4. Push to GitHub

```bash
git push origin main --tags
```

### 5. Create GitHub Release

Create a new release on GitHub with the skill zip attached:

```bash
# Get the version from package.json
VERSION=$(node -p "require('./package.json').version")

# Create the release with both skill zips
gh release create "v$VERSION" \
  --title "v$VERSION" \
  --notes "See [CHANGELOG.md](CHANGELOG.md) for details." \
  dist/coach-skill.zip \
  dist/coach-checkin-skill.zip
```

Or manually:

1. Go to https://github.com/felixrieseberg/claude-coach/releases/new
2. Choose the tag you just pushed (e.g., `v0.1.0`)
3. Set the release title (e.g., `v0.1.0`)
4. Add release notes
5. Attach `dist/coach-skill.zip` and `dist/coach-checkin-skill.zip` as binaries
6. Click "Publish release"

## Quick Release Script

For convenience, here's a one-liner (after updating version):

```bash
npm run build:viewer && \
npm run build:skill && \
npm run build:skill-checkin && \
npm publish && \
git push origin main --tags && \
VERSION=$(node -p "require('./package.json').version") && \
gh release create "v$VERSION" --title "v$VERSION" --generate-notes dist/coach-skill.zip dist/coach-checkin-skill.zip
```

## What Gets Released

| Artifact           | Destination                    | Contents                                                              |
| ------------------ | ------------------------------ | --------------------------------------------------------------------- |
| npm package        | npmjs.com/package/claude-coach | CLI tool, viewer builder                                              |
| Skill zip          | GitHub Releases                | `skill/` directory for Claude.ai — creates plans                      |
| Check-in skill zip | GitHub Releases                | `skill-checkin/` directory for Claude.ai — feedback + plan adaptation |

## Verification

After releasing:

1. **npm**: Run `npx claude-coach --help` to verify the CLI works
2. **Skill**: Download both zips from GitHub releases, install in Claude.ai, and test — create a plan with `coach-skill.zip`, then check in on it with `coach-checkin-skill.zip`
