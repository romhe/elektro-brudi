#!/usr/bin/env bash
# Build dist/ElektroBrudi.app for Phase 0 (issue #4).
#
# Steps:
#   1. install the workspace with the frozen lockfile and build the PWA
#   2. download Node 24.20.0 darwin-arm64 and verify it against the official
#      SHASUMS256.txt (and a pinned hash)
#   3. build the Swift launcher in release mode for arm64
#   4. assemble the bundle: launcher, Node runtime, server sources, PWA build,
#      workspace packages, node_modules including the project-local Chromium
#   5. sign the bundle ad hoc (no notarization)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist"
CACHE="$DIST/cache"
APP="$DIST/ElektroBrudi.app"
NODE_VERSION="24.20.0"
NODE_DIST="node-v${NODE_VERSION}-darwin-arm64"
NODE_TARBALL="${NODE_DIST}.tar.gz"
NODE_BASE_URL="https://nodejs.org/dist/v${NODE_VERSION}"
NODE_PINNED_SHA256="40e5607e5ecb3db9192723776da2d75d966260fc74a7a9e731c1bd67dda96bc8"

log() { printf '\n==> %s\n' "$*"; }

if [ "$(uname -m)" != "arm64" ]; then
  echo "This build targets arm64 macOS only." >&2
  exit 1
fi
command -v pnpm >/dev/null || { echo "pnpm 12.3.4 is required on PATH." >&2; exit 1; }
command -v swift >/dev/null || { echo "The Xcode Swift toolchain is required to build apps/launcher." >&2; exit 1; }

log "Installing workspace and building the PWA"
cd "$ROOT"
pnpm install --frozen-lockfile
pnpm build

log "Fetching and verifying Node ${NODE_VERSION} darwin-arm64"
mkdir -p "$CACHE"
cd "$CACHE"
if [ ! -f "$NODE_TARBALL" ]; then
  curl -fsSL -o "$NODE_TARBALL" "${NODE_BASE_URL}/${NODE_TARBALL}"
fi
curl -fsSL -o SHASUMS256.txt "${NODE_BASE_URL}/SHASUMS256.txt"
grep " ${NODE_TARBALL}\$" SHASUMS256.txt | shasum -a 256 -c -
ACTUAL_SHA256="$(shasum -a 256 "$NODE_TARBALL" | cut -d' ' -f1)"
if [ "$ACTUAL_SHA256" != "$NODE_PINNED_SHA256" ]; then
  echo "Node tarball hash ${ACTUAL_SHA256} does not match the pinned hash." >&2
  exit 1
fi
rm -rf "$NODE_DIST"
tar -xzf "$NODE_TARBALL"
"$CACHE/$NODE_DIST/bin/node" --version | grep -qx "v${NODE_VERSION}"

log "Building the Swift launcher"
cd "$ROOT"
swift build -c release --arch arm64 --package-path apps/launcher
LAUNCHER_BIN="$(swift build -c release --arch arm64 --package-path apps/launcher --show-bin-path)/ElektroBrudiLauncher"
test -x "$LAUNCHER_BIN"

log "Assembling ${APP}"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/app"
cp apps/launcher/Resources/Info.plist "$APP/Contents/Info.plist"
cp "$LAUNCHER_BIN" "$APP/Contents/MacOS/ElektroBrudiLauncher"
cp -R "$CACHE/$NODE_DIST" "$APP/Contents/Resources/runtime"
rm -rf "$APP/Contents/Resources/runtime/include" "$APP/Contents/Resources/runtime/share"

rsync -a \
  --include='/package.json' \
  --include='/pnpm-workspace.yaml' \
  --include='/apps/' \
  --include='/apps/server/' \
  --include='/apps/server/package.json' \
  --include='/apps/server/src/***' \
  --include='/apps/web/' \
  --include='/apps/web/package.json' \
  --include='/apps/web/dist/***' \
  --include='/packages/' \
  --include='/packages/browser/' \
  --include='/packages/browser/package.json' \
  --include='/packages/browser/src/***' \
  --include='/packages/storage/' \
  --include='/packages/storage/package.json' \
  --include='/packages/storage/src/***' \
  --include='/packages/contracts/' \
  --include='/packages/contracts/package.json' \
  --include='/packages/contracts/src/***' \
  --exclude='/*' \
  "$ROOT/" "$APP/Contents/Resources/app/"

# Workspace node_modules: relative symlinks stay valid inside the copy. The
# headless shell and ffmpeg are not used by the capture path.
rsync -a \
  --exclude='.cache' \
  --exclude='chromium_headless_shell-*' \
  --exclude='ffmpeg-*' \
  "$ROOT/node_modules/" "$APP/Contents/Resources/app/node_modules/"
for package in apps/server apps/web packages/browser packages/storage packages/contracts; do
  if [ -d "$ROOT/$package/node_modules" ]; then
    rsync -a "$ROOT/$package/node_modules/" "$APP/Contents/Resources/app/$package/node_modules/"
  fi
done

log "Signing ad hoc"
codesign --force --sign - "$APP/Contents/MacOS/ElektroBrudiLauncher"
codesign --force --sign - "$APP"
codesign --verify --verbose=2 "$APP"

log "Bundle summary"
"$APP/Contents/Resources/runtime/bin/node" --version
CHROME="$(find "$APP/Contents/Resources/app/node_modules/.pnpm" -path '*playwright-core/.local-browsers/chromium-*' -name 'Google Chrome for Testing' -type f | head -n 1)"
test -n "$CHROME" && "$CHROME" --version
du -sh "$APP"
echo "Built ${APP}"
