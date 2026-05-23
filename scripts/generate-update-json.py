#!/usr/bin/env python3
"""生成 Tauri updater 的 update.json

用法：python3 generate-update-json.py <版本号> <发布日期>
会自动扫描 /var/www/beehive-releases/ 目录下的制品文件。"""

import json
import os
import sys
from glob import glob


def find_file(release_dir, pattern):
    files = glob(os.path.join(release_dir, pattern))
    return files[0] if files else None


def read_sig(filepath):
    if filepath and os.path.isfile(filepath):
        with open(filepath, "r") as f:
            return f.read().strip()
    return ""


def main():
    if len(sys.argv) < 3:
        print("Usage: generate-update-json.py <version> <pub_date>")
        sys.exit(1)

    version = sys.argv[1]
    pub_date = sys.argv[2]
    release_dir = "/var/www/beehive-releases"

    platforms = {}

    # macOS x86_64 (dmg)
    dmg = find_file(release_dir, "*.dmg")
    dmg_sig = read_sig(find_file(release_dir, "*.dmg.sig"))
    if dmg and dmg_sig:
        platforms["darwin-x86_64"] = {
            "signature": dmg_sig,
            "url": f"https://107.173.70.124/releases/{os.path.basename(dmg)}",
        }

    # macOS aarch64 (app.tar.gz)
    app = find_file(release_dir, "*.app.tar.gz")
    app_sig = read_sig(find_file(release_dir, "*.app.tar.gz.sig"))
    if app and app_sig:
        platforms["darwin-aarch64"] = {
            "signature": app_sig,
            "url": f"https://107.173.70.124/releases/{os.path.basename(app)}",
        }

    # Windows MSI
    msi = find_file(release_dir, "*.msi")
    msi_sig = read_sig(find_file(release_dir, "*.msi.sig"))
    if msi and msi_sig:
        platforms["windows-x86_64-msi"] = {
            "signature": msi_sig,
            "url": f"https://107.173.70.124/releases/{os.path.basename(msi)}",
        }

    # Windows NSIS
    nsis = find_file(release_dir, "*.nsis.zip")
    nsis_sig = read_sig(find_file(release_dir, "*.nsis.zip.sig"))
    if nsis and nsis_sig:
        platforms["windows-x86_64"] = {
            "signature": nsis_sig,
            "url": f"https://107.173.70.124/releases/{os.path.basename(nsis)}",
        }

    data = {
        "version": version,
        "notes": f"Beehive Browser {version}",
        "pub_date": pub_date,
        "platforms": platforms,
    }

    output_path = os.path.join(release_dir, "update.json")
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Generated {output_path} with {len(platforms)} platforms")
    for k in platforms:
        print(f"  - {k}")


if __name__ == "__main__":
    main()
