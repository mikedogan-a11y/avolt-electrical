#!/usr/bin/env bash
# End-to-end proof: install the MortgageMD Calculators plugin on a *throwaway*
# WordPress, deploy two calculators entirely over the REST API (no dashboard
# clicking), then verify the calculator renders, computes, and captures a lead.
#
# Nothing here touches the live site. Real WordPress, real PHP, SQLite, no Docker.
# Requires: php (with pdo_sqlite), node, git, curl, and network access to github.com.
#
#   bash run-demo.sh
#
set -uo pipefail
PORT="${PORT:-9400}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_SRC="$ROOT/plugin/mmd-calculators"
WORK="${WORK:-/tmp/mmd-demo}"
SITE="$WORK/wpsite"
PASS=0; FAIL=0
ok(){ echo "  ✓ $1"; PASS=$((PASS+1)); }
no(){ echo "  ✗ $1"; FAIL=$((FAIL+1)); }
hr(){ printf '%s\n' "------------------------------------------------------------"; }

echo "### MortgageMD calculators — end-to-end deploy demo"; hr

# 1) Fetch WordPress core + the single-file SQLite drop-in (cached between runs).
mkdir -p "$WORK"
[ -f "$WORK/wpcore/wp-load.php" ] || { echo "→ cloning WordPress core…"; git clone --depth 1 --single-branch https://github.com/WordPress/WordPress "$WORK/wpcore" >/dev/null 2>&1; }
[ -f "$WORK/wp-sqlite-db/src/db.php" ] || { echo "→ cloning SQLite drop-in…"; git clone --depth 1 https://github.com/aaemnnosttv/wp-sqlite-db "$WORK/wp-sqlite-db" >/dev/null 2>&1; }
[ -f "$WORK/wpcore/wp-load.php" ] || { echo "FATAL: could not fetch WordPress core"; exit 1; }

# 2) Assemble a clean site: core + SQLite drop-in + our plugin.
echo "→ assembling clean WordPress…"
rm -rf "$SITE"; mkdir -p "$SITE"
(cd "$WORK/wpcore" && tar cf - --exclude=.git .) | (cd "$SITE" && tar xf -)
cp "$WORK/wp-sqlite-db/src/db.php" "$SITE/wp-content/db.php"
mkdir -p "$SITE/wp-content/plugins" "$SITE/wp-content/mu-plugins"
cp -r "$PLUGIN_SRC" "$SITE/wp-content/plugins/mmd-calculators"

cat > "$SITE/wp-config.php" <<PHP
<?php
define('DB_NAME','wordpress');define('DB_USER','root');define('DB_PASSWORD','');define('DB_HOST','localhost');
define('DB_CHARSET','utf8');define('DB_COLLATE','');
define('AUTH_KEY','a');define('SECURE_AUTH_KEY','b');define('LOGGED_IN_KEY','c');define('NONCE_KEY','d');
define('AUTH_SALT','e');define('SECURE_AUTH_SALT','f');define('LOGGED_IN_SALT','g');define('NONCE_SALT','h');
\$table_prefix='wp_';
define('WP_DEBUG',false);
define('WP_HOME','http://127.0.0.1:$PORT');define('WP_SITEURL','http://127.0.0.1:$PORT');
define('WP_ENVIRONMENT_TYPE','local');
if(!defined('ABSPATH'))define('ABSPATH',__DIR__.'/');
require_once ABSPATH.'wp-settings.php';
PHP

# DEMO-ONLY shims so Application Passwords work over local http (prod is HTTPS).
cat > "$SITE/wp-content/mu-plugins/demo-local-auth.php" <<'PHP'
<?php
add_filter('wp_is_application_passwords_available','__return_true');
if (empty($_SERVER['PHP_AUTH_USER'])) {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if (stripos($h,'basic ')===0){ $d=base64_decode(substr($h,6)); if($d&&strpos($d,':')!==false){ list($u,$p)=explode(':',$d,2); $_SERVER['PHP_AUTH_USER']=$u; $_SERVER['PHP_AUTH_PW']=$p; } }
}
PHP

cat > "$SITE/router.php" <<'PHP'
<?php
$uri=urldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
$f=__DIR__.$uri;
if($uri!=='/'&&file_exists($f)&&!is_dir($f))return false;
require __DIR__.'/index.php';
PHP

# 3) Install WordPress, activate the plugin, mint an Application Password.
echo "→ installing WordPress + activating plugin…"
APP_PASSWORD=$(php -r '
define("WP_INSTALLING",true);
require "'"$SITE"'/wp-load.php";                       // core autoloads upgrade fns + WP_Application_Passwords
require_once ABSPATH."wp-admin/includes/upgrade.php";
require_once ABSPATH."wp-admin/includes/plugin.php";
if(!is_blog_installed()) wp_install("MortgageMD Demo","admin","admin@example.com",true,"","admin-pass-123");
activate_plugin("mmd-calculators/mmd-calculators.php");
$u=get_user_by("login","admin");
list($pw)=WP_Application_Passwords::create_new_application_password($u->ID,array("name"=>"deploy"));
echo $pw;
' 2>"$WORK/install-err.log")
# A real app password is short and alphanumeric; if a fatal occurred WP prints an
# HTML error page to stdout — guard against that masquerading as success.
if [ -n "$APP_PASSWORD" ] && [ ${#APP_PASSWORD} -le 32 ] && ! printf '%s' "$APP_PASSWORD" | grep -q '<'; then
  ok "WordPress installed, plugin activated, app password issued"
else
  no "install failed"; echo "    --- install stderr ---"; sed 's/^/    /' "$WORK/install-err.log" | head -5; exit 1
fi

# 4) Serve it. Free the port first, then start from inside $SITE (so the router's
#    __DIR__ resolves correctly), and wait until the REST API is actually *ours*.
fuser -k "$PORT/tcp" 2>/dev/null; sleep 1
( cd "$SITE" && php -S 127.0.0.1:$PORT router.php ) >"$WORK/serve.log" 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT
ready=0
for i in $(seq 1 25); do
  if grep -q "Address already in use" "$WORK/serve.log" 2>/dev/null; then
    no "port $PORT is in use — set PORT=<free port> and retry"; exit 1
  fi
  # Confirm it's the WordPress REST root (JSON with our site name), not a stray 200.
  if curl -s -m3 "http://127.0.0.1:$PORT/?rest_route=/" | grep -q '"namespaces"'; then ready=1; break; fi
  sleep 1
done
[ "$ready" = "1" ] && ok "server up and REST responding on :$PORT" || { no "server did not become ready"; tail -3 "$WORK/serve.log" | sed 's/^/    /'; exit 1; }

hr; echo "### Deploy two calculators over the REST API (Prajwol's manual steps, automated)"; hr
export WP_URL="http://127.0.0.1:$PORT" WP_USER=admin WP_APP_PASSWORD="$APP_PASSWORD"
node "$ROOT/deploy/deploy.mjs" home-loan-repayment | sed 's/^/  /'
node "$ROOT/deploy/deploy.mjs" lmi-lvr            | sed 's/^/  /'

hr; echo "### Verify the live page"; hr
PAGE_ID=$(curl -s "http://127.0.0.1:$PORT/?rest_route=/wp/v2/pages&slug=home-loan-repayment-calculator" -u "admin:$APP_PASSWORD" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d)[0].id))')
curl -s "http://127.0.0.1:$PORT/?page_id=$PAGE_ID" -o "$WORK/rendered.html"

grep -q 'class="mmd-calc"' "$WORK/rendered.html" && ok "calculator markup rendered on the page" || no "calculator markup missing"
core=$(grep -n 'mmd-core.js' "$WORK/rendered.html" | head -1 | cut -d: -f1)
cl=$(grep -n 'home-loan-repayment.js' "$WORK/rendered.html" | head -1 | cut -d: -f1)
[ -n "$core" ] && [ -n "$cl" ] && [ "$core" -lt "$cl" ] && ok "assets enqueued, core loads before calculator (SG-Optimizer safe)" || no "asset order wrong"
grep -q 'window.MMDLeadHook=function' "$WORK/rendered.html" && ok "server-side lead hook wired into the page" || no "lead hook missing"
grep -q 'rank_math' "$WORK/rendered.html" >/dev/null; # meta is post meta, checked via REST below
META=$(curl -s "http://127.0.0.1:$PORT/?rest_route=/wp/v2/pages/$PAGE_ID" -u "admin:$APP_PASSWORD")
echo "$META" | grep -q 'Home Loan Repayment Calculator | MortgageMD' && ok "Rank Math SEO title/meta set via API" || no "SEO meta not set"

hr; echo "### Capture a lead end-to-end"; hr
curl -s -m6 -X POST "http://127.0.0.1:$PORT/?rest_route=/mmd/v1/lead" -H 'Content-Type: application/json' \
  -d '{"event":"mmd_lead_email","calculator":"repayments","leadTag":"Calculator - Repayments","email":"demo.lead@example.com","consent":true,"data":{"loan":650000,"rate":6.5}}' >/dev/null
LOG="$SITE/wp-content/uploads/mmd-leads.ndjson"
[ -f "$LOG" ] && grep -q 'demo.lead@example.com' "$LOG" && { ok "lead captured server-side with CRM tag"; echo "      $(tail -1 "$LOG")"; } || no "lead not captured"

hr; echo "### Verify the calculator actually computes (real JS, embedded markup)"; hr
( cd "$ROOT/demo" && [ -d node_modules/jsdom ] || npm install --no-audit --no-fund >/dev/null 2>&1; node functional-test.mjs ) | sed 's/^/  /'
[ "${PIPESTATUS[0]:-1}" -eq 0 ] && ok "computes correctly inside the embedded markup" || no "calculation failed"

hr; echo "### RESULT: $PASS passed, $FAIL failed"; hr
SUMMARY=$([ "$FAIL" -eq 0 ] && echo "PASS — the plugin + deploy app reproduces every per-calculator task end-to-end." || echo "FAIL — see above.")
echo "$SUMMARY"
echo "$PASS passed, $FAIL failed — $SUMMARY" > "$WORK/RESULT.txt"
exit $FAIL
