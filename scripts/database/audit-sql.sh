#!/usr/bin/env bash
set -euo pipefail

shopt -s nullglob
files=(public/*.sql)
if (( ${#files[@]} == 0 )); then
  echo "BLOCKED: no SQL files found under public/"
  exit 1
fi

fatal=0
echo "=== Supabase SQL static safety audit (read-only; no SQL is executed) ==="

for file in "${files[@]}"; do
  echo "--- $file"
  if grep -Ein '^[[:space:]]*DROP[[:space:]]+(TABLE|SCHEMA)|^[[:space:]]*TRUNCATE|^[[:space:]]*DELETE[[:space:]]+FROM' "$file"; then
    echo "BLOCKED: destructive data/schema statement found"
    fatal=1
  fi

  if grep -Ein '\b(password|passwd)[[:space:]]+(text|varchar|character varying)' "$file"; then
    echo "BLOCKED: password-like column stored as ordinary text; use a vetted password-hashing/auth design"
    fatal=1
  fi

  if grep -Ein 'DROP[[:space:]]+POLICY|DROP[[:space:]]+TRIGGER|SECURITY[[:space:]]+DEFINER|USING[[:space:]]*\([[:space:]]*true[[:space:]]*\)' "$file"; then
    echo "REVIEW: policy/trigger replacement, privileged function, or broad policy requires manual security review"
  fi
done

if (( fatal != 0 )); then
  echo "RESULT: BLOCKED — do not apply these SQL files to Supabase until the findings are fixed and reviewed."
  exit 1
fi

echo "RESULT: no high-risk pattern detected by this basic scanner. This is not a substitute for SQL/RLS review."
