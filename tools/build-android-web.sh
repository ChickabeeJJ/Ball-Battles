#!/usr/bin/env bash
# Create a self-contained local web bundle for Capacitor without changing the CrazyGames web build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

rm -rf www
mkdir -p www
cp index.html www/index.html
cp privacy-policy.html www/privacy-policy.html
cp -R css fonts js lib music www/

# The CrazyGames SDK is only for the browser-hosted CrazyGames build.
# The game already handles an absent SDK and falls back to local storage / standalone play.
python3 - <<'PY'
from pathlib import Path
import re

p = Path("www/index.html")
html = p.read_text(encoding="utf-8")
html, removed = re.subn(
    r'\s*<script\s+src=["\']https://sdk\.crazygames\.com/crazygames-sdk-v3\.js["\']\s*>\s*</script>',
    '',
    html,
    flags=re.IGNORECASE,
)
if removed != 1:
    raise SystemExit(f"Expected to remove exactly one CrazyGames SDK script, removed {removed}")
p.write_text(html, encoding="utf-8")
PY

# Fail early if a local script or stylesheet referenced by index.html was not copied.
python3 - <<'PY'
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

root = Path("www")
class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for attr in ("src", "href"):
            value = a.get(attr, "")
            if not value or value.startswith(("http://", "https://", "data:", "#", "javascript:")):
                continue
            # Only check local references used by script/link elements.
            if (tag == "script" and attr == "src") or (tag == "link" and attr == "href"):
                self.refs.append(value)

parser = References()
parser.feed((root / "index.html").read_text(encoding="utf-8"))
missing = [r for r in parser.refs if not (root / urlparse(r).path).is_file()]
if missing:
    raise SystemExit("Missing local resources in Android bundle: " + ", ".join(missing))
print(f"Android web bundle prepared; validated {len(parser.refs)} local script/style references.")
PY
