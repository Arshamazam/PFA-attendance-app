#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$ROOT/dist-zips"
mkdir -p "$OUT"

echo "PFA Attendance — creating distribution zips"
echo "Output: $OUT"
echo ""

zip_app() {
  local name="$1"
  local src="$2"
  local zipfile="$OUT/${name}.zip"

  rm -f "$zipfile"
  echo "Zipping $name..."
  (cd "$src" && zip -r "$zipfile" . \
    -x "node_modules/*" \
    -x ".next/*" \
    -x "dist/*" \
    -x "build/*" \
    -x ".env" \
    -x ".env.*" \
    -x "uploads/*" \
    -x "public/uploads/*" \
    -x "*.log" \
    -x ".git/*" \
    -x ".DS_Store" \
    -x "package-lock.json" \
  )
  local size
  size=$(du -sh "$zipfile" | cut -f1)
  echo "  Done: ${name}.zip ($size)"
}

# Backend (NestJS) — include pre-built dist/
zip_app "backend" "$ROOT/apps/backend"

# Admin panel (Next.js)
zip_app "admin" "$ROOT/apps/admin"

# Super admin panel (Next.js)
zip_app "superadmin" "$ROOT/apps/superadmin"

# Mobile (Flutter)
rm -f "$OUT/mobile.zip"
echo "Zipping mobile..."
(cd "$ROOT/apps/mobile" && zip -r "$OUT/mobile.zip" . \
  -x "build/*" \
  -x ".dart_tool/*" \
  -x "ios/Pods/*" \
  -x "ios/.symlinks/*" \
  -x "android/.gradle/*" \
  -x "android/app/.cxx/*" \
  -x ".flutter-plugins" \
  -x ".flutter-plugins-dependencies" \
  -x "*.log" \
  -x ".DS_Store" \
  -x ".git/*" \
)
size=$(du -sh "$OUT/mobile.zip" | cut -f1)
echo "  Done: mobile.zip ($size)"

echo ""
echo "All zips ready in dist-zips/:"
ls -lh "$OUT/"
