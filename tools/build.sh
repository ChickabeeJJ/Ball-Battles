#!/usr/bin/env bash
# Packages the game for upload to the CrazyGames developer portal: dist/ball-vs-ball.zip
# (index.html at the zip root; tools/ and marketing/ are left out).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist && mkdir -p dist/game
cp -r index.html css js fonts music lib dist/game/
(cd dist/game && python3 -c "
import zipfile, os
with zipfile.ZipFile('../ball-vs-ball.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk('.'):
        for f in sorted(files):
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, '.'))
")
echo "dist/ball-vs-ball.zip: $(du -h dist/ball-vs-ball.zip | cut -f1), $(find dist/game -type f | wc -l) files"
