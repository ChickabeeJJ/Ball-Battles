#!/usr/bin/env bash
# Packages the game for upload to the CrazyGames developer portal: dist/ball-vs-ball.zip
# (index.html at the zip root; tools/ and marketing/ are left out).
# For fast loading, all game scripts are bundled into one minified game.js and the stylesheet is
# minified (one request each instead of ~27). Source files stay untouched for development.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist && mkdir -p dist/game/js dist/game/css
cp -r fonts music lib dist/game/
# script order exactly as index.html lists them
SCRIPTS=$(grep -o 'src="js/[^"]*"' index.html | sed 's/src="//;s/"$//')
cat $SCRIPTS > dist/game/js/game.src.js
if npx -y esbuild --version >/dev/null 2>&1; then
  npx -y esbuild dist/game/js/game.src.js --minify --target=es2020 --log-level=error --outfile=dist/game/js/game.js
  npx -y esbuild css/style.css --minify --log-level=error --outfile=dist/game/css/style.css
else
  cp dist/game/js/game.src.js dist/game/js/game.js; cp css/style.css dist/game/css/style.css
fi
rm dist/game/js/game.src.js
python3 - <<'PY'
import re
s = open('index.html').read()
s = re.sub(r'(\s*<script defer src="js/[^"]+"></script>)+', '\n  <script defer src="js/game.js"></script>', s, count=1)
open('dist/game/index.html', 'w').write(s)
PY
(cd dist/game && python3 -c "
import zipfile, os
with zipfile.ZipFile('../ball-vs-ball.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk('.'):
        for f in sorted(files):
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, '.'))
")
echo "dist/ball-vs-ball.zip: $(du -h dist/ball-vs-ball.zip | cut -f1), $(find dist/game -type f | wc -l) files, game.js $(du -h dist/game/js/game.js | cut -f1)"
