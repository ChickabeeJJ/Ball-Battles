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
    pattern = rf"(?m)^(\s*{key}\s*=\s*)\d+(\s*(?://.*)?$)"
    text, count = re.subn(pattern, rf"\g<1>36\g<2>", text)
    if count != 1:
        sys.exit(f"Could not safely set {key} to Android API 36 in {variables}.")
variables.write_text(text, encoding="utf-8")
print("Configured compileSdkVersion and targetSdkVersion to API 36.")

# Ball Vs Ball launcher icons (replace Capacitor's default icon).
import shutil
icons = root / "android-assets" / "res"
res = root / "android" / "app" / "src" / "main" / "res"
if icons.is_dir():
    for src in icons.rglob("*.png"):
        dst = res / src.relative_to(icons)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
    bg = res / "values" / "ic_launcher_background.xml"
    if bg.is_file():
        bg.write_text('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1E5BD8</color>\n</resources>\n', encoding="utf-8")
    print("Installed Ball Vs Ball launcher icons.")

# Play needs a higher versionCode on every upload: CI passes its run number.
import os
vc = os.environ.get("VERSION_CODE", "").strip()
if vc.isdigit():
    g = app_gradle.read_text(encoding="utf-8")
    g, n = re.subn(r"(?m)^(\s*versionCode\s+)\d+", rf"\g<1>{int(vc)}", g)
    g = re.sub(r'(?m)^(\s*versionName\s+)"[^"]*"', rf'\g<1>"1.0.{int(vc)}"', g)
    if n != 1:
        sys.exit("Could not set versionCode in app/build.gradle.")
    app_gradle.write_text(g, encoding="utf-8")
    print(f"versionCode {vc}, versionName 1.0.{vc}")

if args.enable_release_signing:
    gradle = app_gradle.read_text(encoding="utf-8")
    if 'System.getenv("PLAY_KEYSTORE_PATH")' not in gradle:
        marker = re.search(r"(?m)^android\s*\{", gradle)
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

    # Select release only inside buildTypes, not the earlier signingConfigs.release block.
    build_types = re.search(r"(?m)^\s*buildTypes\s*\{", gradle)
    if not build_types:
        sys.exit(f"Could not find buildTypes in {app_gradle}.")
    relative_release = re.search(r"(?m)^\s*release\s*\{", gradle[build_types.end():])
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
    if re.search(r"signingConfig\s+signingConfigs\.debug", block):
        block = re.sub(r"signingConfig\s+signingConfigs\.debug",
                       "signingConfig signingConfigs.release", block, count=1)
    elif not re.search(r"signingConfig\s+signingConfigs\.release", block):
        block = re.sub(r"(release\s*\{)", r"\1\n            signingConfig signingConfigs.release",
                       block, count=1)
    gradle = gradle[:block_start] + block + gradle[end:]
    app_gradle.write_text(gradle, encoding="utf-8")
    print("Configured release signing using PLAY_KEYSTORE_* environment variables.")
