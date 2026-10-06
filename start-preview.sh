#!/bin/sh
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null 2>&1 || { echo "Node.js is required."; exit 1; }
echo "Open http://localhost:8080 in your browser."
exec node serve.mjs
