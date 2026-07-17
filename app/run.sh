#!/usr/bin/env bash
# Run from any directory — the script resolves the repo root itself.
DIR="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$DIR/app/main.py"
