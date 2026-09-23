#!/usr/bin/env bash
# Generate a privacy-preserving traffic report for portfolio.getparkerai.com.
#
# The site ships no analytics runtime — no script, no cookie, no third party —
# and says so publicly on /status/ and in the footer. This keeps that true: it
# reads the access log the edge Caddy already writes and renders a static HTML
# report server-side. Nothing is added to any page.
#
# The report is written OUTSIDE the served dist/ directory and is not reachable
# over HTTP. Read it by copying it down:
#   scp deploy@<host>:/home/deploy/sites/portfolio/analytics/report.html .
#
# Known limitation: the edge Caddy writes its logs inside the container rather
# than to a host mount, so history resets if that container is recreated. Fixing
# that means adding a log volume to the shared proxy compose file, which is
# owned by the Contabo-VPS-Ops repo, not this one.
set -euo pipefail

CADDY_CONTAINER="${CADDY_CONTAINER:-caddy}"
LOG_PATH="${LOG_PATH:-/var/log/caddy/portfolio.log}"
OUT_DIR="${OUT_DIR:-/home/deploy/sites/portfolio/analytics}"
OUT_FILE="${OUT_DIR}/report.html"
# GoAccess 1.11, pinned by digest: the report reads every visitor address in
# the raw log, so the image mustn't change under it between runs. To update,
# pull the new tag, check `--version`, and replace the digest.
GOACCESS_IMAGE="${GOACCESS_IMAGE:-allinurl/goaccess@sha256:85028c6c9b6ddb06e5f63bffd092ecaa3d1fa72235de2f5291920d5745a3aa6d}"

mkdir -p "$OUT_DIR"

if ! docker exec "$CADDY_CONTAINER" test -f "$LOG_PATH"; then
  echo "analytics-report: $LOG_PATH not found in container $CADDY_CONTAINER" >&2
  exit 1
fi

# --anonymize-ip keeps the report useful without retaining visitor addresses.
# Writing to a temp file first means a failed run leaves the previous report in
# place rather than truncating it.
# The edge logs only these fields (deploy/vps/caddy-block.txt): the user agent
# and referrer are top-level fields rather than request headers, so GoAccess's
# CADDY preset can't read them. The files already stored on 2026-09-23 were
# rewritten into the same shape that day, so the whole window reads alike.
LOG_FORMAT='{"ts":"%x.%^","request":{"client_ip":"%h","proto":"%H","method":"%m","host":"%v","uri":"%U"},"duration":"%T","size":"%b","status":"%s","user_agent":"%u","referer":"%R"}'

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

# The edge rolls this log at midnight and deletes rolled files after 30 days
# (deploy/vps/caddy-block.txt; /privacy/ states the period), so the report
# reads the gzipped rolled files and the live one together to cover the whole
# retention window.
docker exec "$CADDY_CONTAINER" sh -c '
  for rolled in "${0%.log}"-*.log.gz; do
    [ -e "$rolled" ] && zcat "$rolled"
  done
  cat "$0"' "$LOG_PATH" \
  | docker run --rm -i --network none --read-only --tmpfs /work -w /work "$GOACCESS_IMAGE" - \
      -o html \
      --log-format="$LOG_FORMAT" \
      --date-format=%s \
      --time-format=%s \
      --anonymize-ip \
      --no-progress \
      --html-report-title="portfolio.getparkerai.com" \
  > "$TMP_FILE"

if [ ! -s "$TMP_FILE" ]; then
  echo "analytics-report: goaccess produced an empty report; keeping the previous one" >&2
  exit 1
fi

mv "$TMP_FILE" "$OUT_FILE"
chmod 600 "$OUT_FILE"
trap - EXIT
echo "analytics-report: wrote $OUT_FILE ($(wc -c < "$OUT_FILE") bytes)"
