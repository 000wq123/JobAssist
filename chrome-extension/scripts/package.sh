#!/usr/bin/env sh
set -eu

extension_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
version=$(node -p "JSON.parse(require('fs').readFileSync('$extension_dir/manifest.json', 'utf8')).version")
output_dir="$extension_dir/dist"
output_file="$output_dir/jobassist-bewerbungshelfer-$version.zip"

mkdir -p "$output_dir"
rm -f "$output_file"

cd "$extension_dir"
zip -q -r "$output_file" \
  manifest.json \
  background.js \
  _locales \
  assets/icon-16.png \
  assets/icon-32.png \
  assets/icon-48.png \
  assets/icon-128.png \
  content \
  onboarding \
  popup

printf '%s\n' "$output_file"
