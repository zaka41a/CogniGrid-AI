#!/usr/bin/env bash
# =============================================================================
#  CogniGrid AI — Bootstrap ASSUME knowledge base (FALLBACK script)
#
#  Used when the in-app /api/ingestion/bootstrap/assume endpoint isn't deployed
#  yet (image rebuild stuck). Downloads the assume-framework/assume repo,
#  filters relevant docs/source/configs, and uploads each via the standard
#  /api/ingestion/upload endpoint — same pipeline the UI's drag-drop uses.
#
#  Usage: ./scripts/bootstrap-assume-docs.sh
# =============================================================================
set -uo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'
info() { echo -e "${CYAN}▶  $1${RESET}"; }
ok()   { echo -e "${GREEN}✅  $1${RESET}"; }
err()  { echo -e "${RED}❌  $1${RESET}"; exit 1; }

# Login → bearer token
info "Logging in as admin@gmail.com..."
TOKEN=$(curl -fsS -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@gmail.com","password":"admin4321"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('accessToken',''))")
[[ -n "$TOKEN" ]] || err "Login failed — is the gateway up on :8080?"
ok "Got token (${#TOKEN} chars)"

# Download tarball
TARBALL_URL="https://github.com/assume-framework/assume/archive/refs/heads/main.tar.gz"
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

info "Downloading ${TARBALL_URL}..."
curl -fsSL "$TARBALL_URL" -o "$TMPDIR/assume.tar.gz" || err "Download failed"
ok "Downloaded $(du -h "$TMPDIR/assume.tar.gz" | cut -f1)"

info "Extracting relevant files (.md .rst .py .yaml .yml)..."
mkdir -p "$TMPDIR/extracted"
tar -xzf "$TMPDIR/assume.tar.gz" -C "$TMPDIR/extracted"
REPO_ROOT=$(find "$TMPDIR/extracted" -maxdepth 1 -type d -name 'assume-*' | head -1)
[[ -d "$REPO_ROOT" ]] || err "Extraction failed"

# Build the file list. Exclude tests/, __pycache__/, .github/, build/, .venv
FILES=()
while IFS= read -r f; do
  FILES+=("$f")
done < <(find "$REPO_ROOT" -type f \( \
    -name '*.md' -o -name '*.rst' -o -name '*.py' -o -name '*.yaml' -o -name '*.yml' \
  \) \
  -not -path '*/tests/*' -not -path '*/test/*' \
  -not -path '*/__pycache__/*' -not -path '*/.github/*' \
  -not -path '*/build/*' -not -path '*/dist/*' -not -path '*/.venv/*')

TOTAL=${#FILES[@]}
ok "Found $TOTAL relevant files"
[[ $TOTAL -gt 0 ]] || err "No matching files in repo"

# Upload each
SUCCESS=0
FAILED=0
i=0
for f in "${FILES[@]}"; do
  i=$((i+1))
  rel="${f#$REPO_ROOT/}"
  size=$(wc -c < "$f")
  if (( size > 1024 * 1024 )); then
    echo -e "${YELLOW}  [$i/$TOTAL] skip (>1MB): $rel${RESET}"
    continue
  fi
  http_code=$(curl -s -o /tmp/cg-upload.out -w "%{http_code}" \
    -X POST http://localhost:8001/api/ingestion/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$f;filename=$rel")
  if [[ "$http_code" == "200" ]]; then
    SUCCESS=$((SUCCESS+1))
    if (( i % 10 == 0 )) || (( i == TOTAL )); then
      echo "  [$i/$TOTAL] uploaded ($SUCCESS ok, $FAILED fail)"
    fi
  else
    FAILED=$((FAILED+1))
    echo -e "${YELLOW}  [$i/$TOTAL] FAILED ($http_code): $rel${RESET}"
  fi
done

echo ""
ok "Done. $SUCCESS uploaded, $FAILED failed (out of $TOTAL)"
echo ""
echo -e "  Open http://localhost:5173 → ASSUME → Import Docs to watch indexing progress."
echo -e "  Background pipeline (chunking + embeddings + Neo4j NER) takes ~5-10 min for $SUCCESS files."
