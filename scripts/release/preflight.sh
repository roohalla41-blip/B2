#!/usr/bin/env bash
set -euo pipefail

echo "=== B2 release source preflight ==="
blocked=0

check_file() {
  local label="$1" path="$2"
  if [[ -f "$path" ]]; then
    echo "READY   $label: $path"
  else
    echo "BLOCKED $label: missing $path"
    blocked=1
  fi
}

check_dir_source() {
  local label="$1" path="$2" marker="$3"
  if [[ -f "$path/$marker" ]]; then
    echo "READY   $label: source marker $path/$marker"
  else
    echo "BLOCKED $label: real source is not imported ($path/$marker missing)"
    blocked=1
  fi
}

check_file "Hesab Sarraf Android Gradle project" "app/build.gradle"
check_file "Hesab Sarraf Android manifest" "app/src/main/AndroidManifest.xml"
check_file "Existing signed Android workflow" ".github/workflows/build-apk.yml"

if [[ -f "package.json" ]]; then
  echo "READY   Web dependency manifest: package.json"
else
  echo "BLOCKED Web source build: package.json is missing; no reproducible web build can run yet"
  blocked=1
fi

if [[ -f "src/lib/supabaseDirectAuth.js" ]]; then
  echo "READY   Supabase direct-auth module"
else
  echo "BLOCKED Supabase auth source: src/lib/supabaseDirectAuth.js is missing but imported by the current code"
  blocked=1
fi

check_dir_source "Clinic Management Android" "apps/clinic-management/android" "settings.gradle"
check_dir_source "Clinic Management Windows" "apps/clinic-management/windows" "package.json"
check_dir_source "Hesab Sarraf Windows" "apps/hesab-sarraf/windows" "package.json"

if [[ "$blocked" -eq 0 ]]; then
  echo "RESULT: SOURCE PREFLIGHT PASSED"
else
  echo "RESULT: SOURCE PREFLIGHT BLOCKED — no installer or fake artifact was produced"
fi

# Readiness reporting is informational: missing source is reported, not hidden
# behind a fabricated successful build.
exit 0
