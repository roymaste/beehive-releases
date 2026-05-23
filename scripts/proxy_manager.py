"""蜂巢智能体 — 代理健康检查

检测模式：
1. HTTP 直测 — 对可直接连接的代理（localhost、miyaip），检测出口IP + 各平台可达性
2. mihomo API — 对通过 clash/mihomo 管理的节点，查 alive 状态 + 延迟
"""
import json
import sys
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, build_opener, ProxyHandler, HTTPError

sys.path.insert(0, str(Path(__file__).parent.parent))

BASE_DIR = Path(__file__).parent.parent
CONFIGS_DIR = BASE_DIR / "configs"
LOGS_DIR = BASE_DIR / "logs"

CHECK_TARGETS = ["twitter", "weibo", "xhs"]
CHECK_URLS = {
    "twitter": "https://twitter.com",
    "weibo": "https://weibo.com",
    "xhs": "https://www.xiaohongshu.com",
}
IPINFO_URL = "https://ipinfo.io/json"
MIHOMO_SOCK = "/tmp/verge/verge-mihomo.sock"


# ── 模式1：HTTP 直测 ──

def http_detect(proxy: dict, timeout: int = 15) -> dict:
    """通过 HTTP 请求检测代理：出口IP + 各平台可达性"""
    result = {"id": proxy["id"], "reachable": False, "error": None}
    proxy_url = _build_url(proxy)

    try:
        handler = ProxyHandler({"http": proxy_url, "https": proxy_url})
        opener = build_opener(handler)

        # 获取出口 IP 信息
        start = time.time()
        with opener.open(IPINFO_URL, timeout=timeout) as resp:
            data = json.loads(resp.read())
        result["latency_ms"] = round((time.time() - start) * 1000, 1)
        result["public_ip"] = data.get("ip")
        result["ip_type"] = _classify_ip(data.get("org", ""), data.get("hostname", ""))
        result["reachable"] = True
    except HTTPError as e:
        result["error"] = f"HTTP {e.code}"
        return result
    except Exception as e:
        result["error"] = str(e)[:80]
        return result

    # 检测各平台
    result["sites"] = {}
    for site in CHECK_TARGETS:
        sr = {"reachable": False}
        try:
            start = time.time()
            req = Request(CHECK_URLS[site])
            with opener.open(req, timeout=timeout) as resp:
                sr["reachable"] = True
                sr["latency_ms"] = round((time.time() - start) * 1000, 1)
                sr["status"] = resp.status
        except HTTPError as e:
            sr["status"] = e.code
            sr["note"] = "IP被平台封禁" if e.code == 403 else str(e.code)
        except Exception as e:
            sr["error"] = str(e)[:60]
        result["sites"][site] = sr

    return result


def _build_url(proxy: dict) -> str:
    proto = proxy.get("protocol", "http").replace("socks5", "socks5").replace("socks", "socks5")
    if proxy.get("username"):
        return f"{proto}://{proxy['username']}:{proxy['password']}@{proxy['server']}:{proxy['port']}"
    return f"{proto}://{proxy['server']}:{proxy['port']}"


def _classify_ip(org: str, hostname: str) -> str:
    combined = (org + " " + hostname).lower()
    if any(kw in combined for kw in ["datacenter", "cloud", "server", "aws", "gcp",
                                      "azure", "digitalocean", "vultr", "hetzner", "ovh"]):
        return "datacenter"
    if any(kw in combined for kw in ["broadband", "dsl", "cable", "fiber"]):
        return "residential"
    if "mobile" in combined or "cellular" in combined:
        return "mobile"
    return "unknown"


# ── 模式2：mihomo API 检测 ──

def _mihomo_api(path: str) -> dict:
    """调 mihomo unix socket API"""
    import http.client
    conn = http.client.HTTPConnection("localhost")
    conn.sock = _unix_connect(MIHOMO_SOCK)
    conn.request("GET", path)
    resp = conn.getresponse()
    data = json.loads(resp.read())
    conn.close()
    return data


def _unix_connect(sock_path: str):
    import socket as sock_mod
    s = sock_mod.socket(sock_mod.AF_UNIX, sock_mod.SOCK_STREAM)
    s.connect(sock_path)
    return s


def mihomo_status() -> dict:
    """获取 mihomo 代理节点状态"""
    result = {"groups": {}, "nodes": {}}
    try:
        data = _mihomo_api("/proxies")
    except Exception as e:
        return {"error": f"mihomo API 不可用: {e}"}

    for name, info in data.get("proxies", {}).items():
        t = info.get("type", "")
        if t in ("Selector", "Fallback", "URLTest", "LoadBalance"):
            nodes = []
            for p in info.get("all", []):
                nd = data.get("proxies", {}).get(p, {})
                hist = nd.get("history", [])
                delay = hist[-1].get("delay", 0) if hist else 0
                alive = nd.get("alive", False)
                nodes.append({"name": p, "type": nd.get("type", ""), "alive": alive, "delay": delay})
            result["groups"][name] = {
                "type": t,
                "now": info.get("now", ""),
                "nodes": nodes,
            }
        elif t not in ("Direct", "Reject", "Compatible", "Pass"):
            hist = info.get("history", [])
            delay = hist[-1].get("delay", 0) if hist else 0
            result["nodes"][name] = {"type": t, "alive": info.get("alive", False), "delay": delay}

    return result


# ── 报告 ──

def print_report(http_results: list[dict], mihomo: dict = None):
    print(f"\n{'='*60}")
    print("代理检测报告")
    print(f"{'='*60}")

    # HTTP 检测结果
    reachable = [r for r in http_results if r.get("reachable")]
    failed = [r for r in http_results if not r.get("reachable")]
    print(f"\n📡 HTTP 直测: {len(reachable)} 可用 / {len(failed)} 不可用")

    for r in reachable:
        ip_type = r.get("ip_type", "")
        ip_info = f" [{ip_type}]" if ip_type else ""
        print(f"  ✅ {r['id']}")
        print(f"     出口IP: {r.get('public_ip', '?')}{ip_info}  ({r.get('latency_ms', '?')}ms)")
        for site, sr in r.get("sites", {}).items():
            if sr.get("reachable"):
                print(f"     ✅ {site}: {sr.get('latency_ms', '?')}ms")
            else:
                print(f"     ❌ {site}: {sr.get('note', sr.get('error', '?'))}")

    for r in failed:
        print(f"  ❌ {r['id']}: {r['server']}:{r['port']} — {r.get('error', 'unknown')}")

    # mihomo 状态
    if mihomo:
        if "error" in mihomo:
            print(f"\n📡 mihomo API: {mihomo['error']}")
        else:
            print("\n📡 mihomo 代理节点:")
            for gname, ginfo in mihomo.get("groups", {}).items():
                print(f"  📁 {gname} ({ginfo['type']}) → 当前: {ginfo['now']}")
                for n in ginfo["nodes"]:
                    icon = "🟢" if n["alive"] else "🔴"
                    print(f"    {icon} {n['name']:25s} {n['delay']}ms")
            for nname, ninfo in mihomo.get("nodes", {}).items():
                icon = "🟢" if ninfo["alive"] else "🔴"
                print(f"  {icon} {nname:30s} [{ninfo['type']:12s}] {ninfo['delay']}ms")

    # 保存报告
    report_path = LOGS_DIR / f"proxy_report_{time.strftime('%Y%m%d_%H%M%S')}.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "http_detect": http_results,
            "mihomo": mihomo,
        }, f, indent=2, ensure_ascii=False)
    print(f"\n报告已保存: {report_path}")


# ── 主入口 ──

def load_proxies() -> list[dict]:
    pf = CONFIGS_DIR / "proxies.json"
    if not pf.exists():
        print(f"[WARN] 代理配置文件不存在: {pf}")
        return []
    with open(pf) as f:
        return json.load(f).get("proxies", [])


if __name__ == "__main__":
    proxies = load_proxies()
    if not proxies:
        print("请先配置 configs/proxies.json")
        sys.exit(1)

    # 只检测可直接连接的代理（排除 hysteria2 隧道端口）
    direct_proxies = [p for p in proxies if p.get("type") != "vps"]
    print(f"HTTP 直测 {len(direct_proxies)} 个代理...")
    results = []
    with ThreadPoolExecutor(max_workers=5) as ex:
        futures = {ex.submit(http_detect, p): p for p in direct_proxies}
        for f in as_completed(futures):
            results.append(f.result())

    mihomo = mihomo_status()
    print_report(results, mihomo)
