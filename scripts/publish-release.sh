#!/usr/bin/env bash
set -euo pipefail

# 蜂巢桌面端发布脚本
# 用法: ./scripts/publish-release.sh <版本号> <制品目录>
# 示例: ./scripts/publish-release.sh 0.4.1 ./desktop/beehive-browser/target/release/bundle

VERSION="${1:-}"
ARTIFACTS_DIR="${2:-}"
VPS_HOST="root@107.173.70.124"
VPS_RELEASE_DIR="/var/www/beehive-releases"
SSH_KEY="$HOME/.ssh/vps_deploy_key"

if [[ -z "$VERSION" || -z "$ARTIFACTS_DIR" ]]; then
  echo "用法: $0 <版本号> <制品目录>"
  echo "示例: $0 0.4.1 ./desktop/beehive-browser/target/release/bundle"
  exit 1
fi

if [[ ! -d "$ARTIFACTS_DIR" ]]; then
  echo "错误: 制品目录不存在: $ARTIFACTS_DIR"
  exit 1
fi

echo "=== 发布版本 $VERSION ==="

# 查找签名文件和安装包
# 支持的平台: macOS (dmg, app.tar.gz), Windows (msi, nsis.exe), Linux (AppImage, deb)
PLATFORMS=("macos" "windows" "linux")
UPDATES=()

for platform in "${PLATFORMS[@]}"; do
  case "$platform" in
    macos)
      FILES=$(find "$ARTIFACTS_DIR" -maxdepth 2 -type f \( -name "*.dmg" -o -name "*.app.tar.gz" \) 2>/dev/null || true)
      ;;
    windows)
      FILES=$(find "$ARTIFACTS_DIR" -maxdepth 2 -type f \( -name "*.msi" -o -name "*.exe" -o -name "*.nsis.zip" \) 2>/dev/null || true)
      ;;
    linux)
      FILES=$(find "$ARTIFACTS_DIR" -maxdepth 2 -type f \( -name "*.AppImage" -o -name "*.deb" -o -name "*.AppImage.tar.gz" \) 2>/dev/null || true)
      ;;
  esac

  for file in $FILES; do
    if [[ -f "$file" ]]; then
      basename_file=$(basename "$file")
      echo "上传: $basename_file"
      scp -o StrictHostKeyChecking=no -i "$SSH_KEY" "$file" "$VPS_HOST:$VPS_RELEASE_DIR/$basename_file"
      
      # 如果有对应的签名文件，也上传
      if [[ -f "$file.sig" ]]; then
        echo "上传签名: $basename_file.sig"
        scp -o StrictHostKeyChecking=no -i "$SSH_KEY" "$file.sig" "$VPS_HOST:$VPS_RELEASE_DIR/$basename_file.sig"
      fi
      
      UPDATES+=("$basename_file")
    fi
  done
done

if [[ ${#UPDATES[@]} -eq 0 ]]; then
  echo "警告: 未找到任何制品文件"
  exit 1
fi

echo "=== 生成 update.json ==="

# 在 VPS 上生成 update.json
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$VPS_HOST" bash -s <<'REMOTE_SCRIPT'
RELEASE_DIR="/var/www/beehive-releases"
VERSION="$1"
shift

cat > "$RELEASE_DIR/update.json" <<EOF
{
  "version": "$VERSION",
  "notes": "Beehive Browser $VERSION",
  "pub_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platforms": {
EOF

FIRST=1
for file in "$@"; do
  url="https://107.173.70.124/releases/$file"
  sig=""
  if [[ -f "$RELEASE_DIR/$file.sig" ]]; then
    sig=$(cat "$RELEASE_DIR/$file.sig")
  fi
  
  # 检测平台
  platform=""
  if [[ "$file" == *.dmg ]]; then
    platform="darwin-x86_64"
  elif [[ "$file" == *.app.tar.gz ]]; then
    platform="darwin-aarch64"
  elif [[ "$file" == *.msi ]]; then
    platform="windows-x86_64"
  elif [[ "$file" == *.nsis.zip ]]; then
    platform="windows-x86_64"
  elif [[ "$file" == *.AppImage ]]; then
    platform="linux-x86_64"
  elif [[ "$file" == *.AppImage.tar.gz ]]; then
    platform="linux-x86_64"
  fi
  
  if [[ -n "$platform" && -n "$sig" ]]; then
    if [[ $FIRST -eq 1 ]]; then
      FIRST=0
    else
      echo "," >> "$RELEASE_DIR/update.json"
    fi
    
    cat >> "$RELEASE_DIR/update.json" <<EOF
    "$platform": {
      "signature": "$sig",
      "url": "$url"
    }
EOF
  fi
done

cat >> "$RELEASE_DIR/update.json" <<EOF
  }
}
EOF

chown -R www-data:www-data "$RELEASE_DIR"
chmod -R 755 "$RELEASE_DIR"
echo "update.json 已更新"
REMOTE_SCRIPT

echo "=== 发布完成 ==="
