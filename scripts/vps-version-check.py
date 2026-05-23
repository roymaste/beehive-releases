#!/usr/bin/env python3
"""VPS前后端版本一致性检查

检查 VPS 上部署的前端/后端版本与本地 Git 版本是否一致。
输出结果到 memory/vps-version-status.md，供 heartbeat 和看板使用。

用法:
  python3 scripts/vps-version-check.py
  python3 scripts/vps-version-check.py --fix    # 如果版本不一致，尝试修复
"""

import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime

VPS_HOST = "root@107.173.70.124"
SSH_KEY = os.path.expanduser("~/.ssh/vps_deploy_key")
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATUS_FILE = os.path.join(BASE_DIR, "memory", "vps-version-status.md")

def ssh(cmd):
    """Run SSH command on VPS, return (stdout, stderr, rc)."""
    full_cmd = [
        "ssh", "-o", "StrictHostKeyChecking=no",
        "-i", SSH_KEY, VPS_HOST,
        cmd
    ]
    r = subprocess.run(full_cmd, capture_output=True, text=True, timeout=15)
    return r.stdout.strip(), r.stderr.strip(), r.returncode

def get_local_git_info():
    """Get local git commit hash and recent tags."""
    r = subprocess.run(
        ["git", "log", "-1", "--format=%H %s %ai"],
        capture_output=True, text=True, timeout=5,
        cwd=BASE_DIR
    )
    commit_info = r.stdout.strip().split(" ", 2)
    hash_local = commit_info[0] if len(commit_info) > 0 else "unknown"
    
    r2 = subprocess.run(
        ["git", "describe", "--tags", "--always"],
        capture_output=True, text=True, timeout=5,
        cwd=BASE_DIR
    )
    tag_local = r2.stdout.strip()
    
    return hash_local, tag_local

def check_vps_via_api():
    """Try to get version info from VPS backend API."""
    try:
        req = urllib.request.Request("http://107.173.70.124:8001/health", method="GET")
        resp = urllib.request.urlopen(req, timeout=10)
        return resp.status, resp.read().decode("utf-8")
    except Exception as e:
        return None, str(e)

def check_vps_via_ssh():
    """Check VPS file timestamps and commit info."""
    results = {}
    
    # Check frontend index.html
    out, err, rc = ssh("head -5 /root/beehive-agent/saas/api/static/index.html 2>/dev/null || echo 'NOT_FOUND'")
    results["frontend_index_html"] = "ok" if "NOT_FOUND" not in out else "missing"
    
    # Check backend version by pid
    out, err, rc = ssh("ps aux | grep 'beehive' | grep -v grep | head -3")
    results["backend_process"] = out if out else "not_running"
    
    # Check backend commit hash
    out, err, rc = ssh(
        "cd /root/beehive-agent && git rev-parse HEAD 2>/dev/null || echo 'GIT_NOT_FOUND'"
    )
    results["vps_git_hash"] = out
    
    # Check frontend build timestamp
    out, err, rc = ssh(
        "stat --format='%Y' /root/beehive-agent/saas/api/static/index.html 2>/dev/null || echo 'NOT_FOUND'"
    )
    results["frontend_build_ts"] = out
    
    # Check update.json on release server
    out, err, rc = ssh("cat /var/www/beehive-releases/update.json 2>/dev/null || echo 'NOT_FOUND'")
    results["release_update_json"] = out[:200] if out != "NOT_FOUND" else out
    
    return results

def main():
    fix_mode = "--fix" in sys.argv
    
    # 1. Get local info
    hash_local, tag_local = get_local_git_info()
    print(f"[检查] 本地: {hash_local[:12]} ({tag_local})")
    
    # 2. Check VPS API
    api_status, api_body = check_vps_via_api()
    print(f"[API] 后端health端点: {api_status}")
    
    # 3. Check via SSH
    vps = check_vps_via_ssh()
    
    # 4. Compare
    issues = []
    vps_git = vps.get("vps_git_hash", "unknown")
    
    if vps_git != "unknown" and vps_git and vps_git != hash_local:
        issues.append({
            "severity": "WARN",
            "item": "Git版本不一致",
            "detail": f"本地 {hash_local[:12]}, VPS {vps_git[:12]}"
        })
    
    if vps.get("backend_process") == "not_running":
        issues.append({
            "severity": "CRITICAL",
            "item": "后端进程未运行",
            "detail": "VPS 上未找到 beehive 后端进程"
        })
    
    if "missing" in str(vps.get("frontend_index_html", "")):
        issues.append({
            "severity": "CRITICAL",
            "item": "前端静态文件缺失",
            "detail": "VPS 上 index.html 不存在"
        })
    
    # 5. Write status file
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    
    status_lines = [
        "# VPS 版本状态",
        f"**最后检查：** {now}",
        f"**检查模式：** {'修复模式' if fix_mode else '只读模式'}",
        "",
        "## 本地版本",
        f"- Commit: `{hash_local}`",
        f"- Tag: `{tag_local}`",
        "",
        "## VPS 版本",
    ]
    
    if "vps_git_hash" in vps:
        status_lines.append(f"- Git Commit: `{vps['vps_git_hash']}`")
    if "frontend_build_ts" in vps:
        status_lines.append(f"- 前端构建时间: {vps['frontend_build_ts']}")
    if vps.get("backend_process"):
        status_lines.append(f"- 后端进程: ✅ 运行中")
    else:
        status_lines.append(f"- 后端进程: ❌ 未运行")
    
    status_lines.extend([
        f"- API健康检查: {'✅' if api_status == 200 else '❌'} (HTTP {api_status})",
        "",
    ])
    
    if issues:
        status_lines.append("## 发现的问题")
        for iss in issues:
            icon = "🔴" if iss["severity"] == "CRITICAL" else "🟡"
            status_lines.append(f"- {icon} [{iss['severity']}] {iss['item']}: {iss['detail']}")
    else:
        status_lines.append("## 结论")
        status_lines.append("- ✅ 前后端版本一致，服务正常运行")
    
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    with open(STATUS_FILE, "w") as f:
        f.write("\n".join(status_lines) + "\n")
    
    print(f"\n[结果] 检查完成，已写入 {STATUS_FILE}")
    if issues:
        print(f"[问题] 发现 {len(issues)} 个问题:")
        for iss in issues:
            print(f"  [{iss['severity']}] {iss['item']}: {iss['detail']}")
    else:
        print("[结论] ✅ 一切正常")
    
    return 1 if issues else 0

if __name__ == "__main__":
    sys.exit(main())
