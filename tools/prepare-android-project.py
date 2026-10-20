#!/usr/bin/env python3
"""Apply repeatable settings to Capacitor's generated Android project."""
from pathlib import Path
import argparse
import re
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--enable-release-signing", action="store_true")
args = parser.parse_args()

root = Path(__file__).resolve().parents[1]
variables = root / "android" / "variables.gradle"
app_gradle = root / "android" / "app" / "build.gradle"

if not variables.is_file() or not app_gradle.is_file():
    sys.exit("Android project not found. Run 'npx cap add android' first.")

text = variables.read_text(encoding="utf-8")
for key in ("compileSdkVersion", "targetSdkVersion"):
    pattern = rf"(?m)^([ \\t]*{key}[ \\t]*=[ \\t]*)\\d+([ \\t]*(?://.*)?$)"
    text, count = re.subn(pattern, rf"\\g<1>36\\g<2>", text)
    if count != 1:
        sys.exit(f"Could not safely set {key} to Android API 36 in {variables}.")
variables.write_text(text, encoding="utf-8")
print("Configured compileSdkVersion and targetSdkVersion to API 36.")

if args.enable_release_signing:
    gradle = app_gradle.read_text(encoding="utf-8")
    if 'System.getenv("PLAY_KEYSTORE_PATH")' not in gradle:
        marker = re.search(r"(?m)^android[ \\t]*\\{", gradle)
        if not marker:
            sys.exit(f"Could not find android {{ block in {app_gradle}.")
        signing = '''
    signingConfigs {
        release {
            storeFile file(System.getenv("PLAY_KEYSTORE_PATH"))
            storePassword System.getenv("PLAY_KEYSTORE_PASSWORD")
            keyAlias System.getenv("PLAY_KEY_ALIAS")
            keyPassword System.getenv("PLAY_KEY_PASSWORD")
        }
    }
'''
        gradle = gradle[:marker.end()] + signing + gradle[marker.end():]

    # Select the release block inside buildTypes, not the signingConfigs.release block.
    build_types = re.search(r"(?m)^[ \\t]*buildTypes[ \\t]*\\{", gradle)
    if not build_types:
        sys.exit(f"Could not find buildTypes in {app_gradle}.")
    relative_release = re.search(r"(?m)^[ \\t]*release[ \\t]*\\{", gradle[build_types.end():])
    if not relative_release:
        sys.exit(f"Could not find the release build type in {app_gradle}.")
    block_start = build_types.end() + relative_release.start()
    open_brace = gradle.find("{", block_start)
    depth, end = 1, open_brace + 1
    while end < len(gradle) and depth:
        if gradle[end] == "{":
            depth += 1
        elif gradle[end] == "}":
            depth -= 1
        end += 1
    if depth:
        sys.exit(f"Unbalanced release build type braces in {app_gradle}.")
    block = gradle[block_start:end]
    if re.search(r"signingConfig[ \\t]+signingConfigs\\.debug", block):
        block = re.sub(r"signingConfig[ \\t]+signingConfigs\\.debug",
                       "signingConfig signingConfigs.release", block, count=1)
    elif not re.search(r"signingConfig[ \\t]+signingConfigs\\.release", block):
        block = re.sub(r"(release[ \\t]*\\{)", r"\\1\\n            signingConfig signingConfigs.release",
                       block, count=1)
    gradle = gradle[:block_start] + block + gradle[end:]
    app_gradle.write_text(gradle, encoding="utf-8")
    print("Configured release signing using PLAY_KEYSTORE_* environment variables.")
