#!/usr/bin/env sh
# One-time generation of the lead-notification credentials, run on the VPS from
# the portfolio site directory (/home/deploy/sites/portfolio):
#
#   sh provision-notify-secrets.sh            refuses to overwrite existing files
#   sh provision-notify-secrets.sh --rotate   replaces both files, then run
#                                             `docker compose --env-file csp.env up -d --force-recreate`
#
# Writes two files that compose requires and that are never committed:
#   ntfy-auth.env        declarative ntfy users, access rules and tokens
#   contact-secrets.env  the contact handler's write-only token and smoke secret
#
# ntfy denies everything by default (NTFY_AUTH_DEFAULT_ACCESS=deny-all):
#   leads-writer  write-only to portfolio-leads and portfolio-leads-smoke (the contact handler)
#   leads-reader  read-only on portfolio-leads (the owner's phone)
#   smoke-reader  read-only on portfolio-leads-smoke (the deploy smoke)
#
# Prints the phone token, the smoke token and the smoke secret once, as JSON.
# Store them (the smoke pair as PORTFOLIO_NTFY_SMOKE_TOKEN and
# PORTFOLIO_CONTACT_SMOKE_SECRET on the deploy machine); they are not shown again.
set -eu

IMAGE="binwiederhier/ntfy:v2.28.0" # keep in step with docker-compose.yml
cd "$(dirname "$0")"

if [ "${1:-}" != "--rotate" ] && { [ -e ntfy-auth.env ] || [ -e contact-secrets.env ]; }; then
  echo "provision-notify-secrets: ntfy-auth.env or contact-secrets.env already exists; pass --rotate to replace them." >&2
  exit 1
fi

token() {
  value=$(docker run --rm "$IMAGE" token generate | tr -d '\r\n ')
  case "$value" in
    tk_*) ;;
    *) echo "provision-notify-secrets: unexpected token format from $IMAGE" >&2; exit 1 ;;
  esac
  if [ "${#value}" -ne 32 ] || printf '%s' "$value" | grep -q '[^a-z0-9_]'; then
    echo "provision-notify-secrets: unexpected token format from $IMAGE" >&2
    exit 1
  fi
  printf '%s' "$value"
}

# The users only ever authenticate with tokens; each password is random and
# discarded, and exists because ntfy's declarative users need a bcrypt hash.
password_hash() {
  password=$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)
  value=$(printf '%s\n%s\n' "$password" "$password" | docker run --rm -i "$IMAGE" user hash 2>/dev/null | grep -o '\$2a\$[^[:space:]]*' | tail -1)
  if [ -z "$value" ]; then
    echo "provision-notify-secrets: could not produce a bcrypt hash with $IMAGE" >&2
    exit 1
  fi
  printf '%s' "$value"
}

writer_token=$(token)
reader_token=$(token)
smoke_token=$(token)
writer_hash=$(password_hash)
reader_hash=$(password_hash)
smoke_hash=$(password_hash)
smoke_secret=$(head -c 64 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 40)

umask 077
# Single quotes keep compose from interpolating the $ signs in the bcrypt hashes.
cat > ntfy-auth.env <<EOF
NTFY_AUTH_USERS='leads-writer:${writer_hash}:user,leads-reader:${reader_hash}:user,smoke-reader:${smoke_hash}:user'
NTFY_AUTH_ACCESS='leads-writer:portfolio-leads:wo,leads-writer:portfolio-leads-smoke:wo,leads-reader:portfolio-leads:ro,smoke-reader:portfolio-leads-smoke:ro'
NTFY_AUTH_TOKENS='leads-writer:${writer_token}:contact-handler,leads-reader:${reader_token}:owner-phone,smoke-reader:${smoke_token}:deploy-smoke'
EOF
cat > contact-secrets.env <<EOF
NTFY_TOKEN='${writer_token}'
CONTACT_SMOKE_SECRET='${smoke_secret}'
EOF
chmod 600 ntfy-auth.env contact-secrets.env

printf '{"readerToken":"%s","smokeToken":"%s","smokeSecret":"%s"}\n' "$reader_token" "$smoke_token" "$smoke_secret"
