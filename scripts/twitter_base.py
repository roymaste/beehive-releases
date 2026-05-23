"""
Twitter 自动化框架
基于 BeehiveBrowser（源码级指纹防护）
"""
import json
import sys
import random
import time
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from beehivebrowser import launch, ProxySettings
from beehivebrowser._version import __version__

BASE_DIR = Path(__file__).parent.parent
ACCOUNTS_DIR = BASE_DIR / "accounts"
CONFIGS_DIR = BASE_DIR / "configs"
LOGS_DIR = BASE_DIR / "logs"

# BeehiveBrowser 版本
CB_VERSION = __version__

def load_accounts():
    """加载账号配置"""
    with open(CONFIGS_DIR / "accounts.json", encoding="utf-8") as f:
        data = json.load(f)
    return data["accounts"]

def create_browser_context(account_id: str, proxy: dict = None):
    """
    为账号创建独立的 BeehiveBrowser 上下文
    BeehiveBrowser 内置指纹防护，无需额外 stealth 插件
    """
    proxy_settings = None
    if proxy:
        proxy_settings = ProxySettings(
            server=f"{proxy['protocol']}://{proxy['server']}:{proxy['port']}",
            username=proxy.get("username", ""),
            password=proxy.get("password", ""),
        )

    browser = launch(
        headless=True,
        proxy=proxy_settings,
        # BeehiveBrowser 内置 humanize 可选开启
        # humanize=True,  # 人类行为模拟，开销较大，按需启用
    )

    context = browser.contexts[0] if browser.contexts else browser.new_context(
        locale="en-US",
        timezone_id="America/New_York",
        viewport={"width": 1280, "height": 720},
        geolocation={"latitude": 40.7128, "longitude": -74.0060},
        permissions=["geolocation"],
    )

    storage_path = ACCOUNTS_DIR / account_id / "storage_state.json"
    storage_path.parent.mkdir(parents=True, exist_ok=True)

    return browser, context, storage_path

def save_state(context, path: Path):
    """保存浏览器状态（cookie/localStorage）"""
    path.parent.mkdir(parents=True, exist_ok=True)
    context.storage_state(path=str(path))

def load_state(context, path: Path):
    """加载浏览器状态"""
    if path.exists():
        context.storage_state(path=str(path))

def log_action(account_id: str, action: str, status: str, detail: str = ""):
    """记录操作日志"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_file = LOGS_DIR / f"{account_id}.log"
    log_file.parent.mkdir(parents=True, exist_ok=True)
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {action} | {status} | {detail}\n")

def wait_random(min_sec=2, max_sec=5):
    """随机等待，模拟人类操作间隔"""
    time.sleep(random.uniform(min_sec, max_sec))

def test_fingerprint():
    """测试 BeehiveBrowser 指纹防护"""
    from beehivebrowser import launch
    browser = launch(headless=True)
    page = browser.new_page()
    page.goto("https://browserleaks.com/canvas")
    # 检查是否显示真实 canvas 指纹（被伪造）
    title = page.title()
    browser.close()
    return title
