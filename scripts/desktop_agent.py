#!/usr/bin/env python3
"""
蜂巢桌面端后台代理脚本 (Desktop Agent)
=====================================

运行在装有 beehiive-browser 的机器上，连接 SaaS 后端拉取并执行社媒发布任务。

功能：
  1. 读取配置文件（JSON格式）：api_base_url、api_key、poll_interval
  2. 启动时向 SaaS 后端注册自己
  3. 定期轮询待执行任务（pending 状态）
  4. 执行任务（发推/登录），通过 agent_executor 调用 BeehiveBrowser
  5. 执行完成后通过 API 返回结果
  6. 支持 Ctrl+C 优雅退出

用法：
  python desktop_agent.py [--config CONFIG_PATH] [--once]
  python desktop_agent.py --api-base http://192.168.31.225:8000 --api-key bee_xxx --poll-interval 30

配置文件 ~/.beehive/config.json：
  {
    "api_base_url": "http://192.168.31.225:8000",
    "api_key": "bee_xxx",
    "poll_interval": 30,
    "worker_id": "desktop-01"
  }
"""

import argparse
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

# ── 路径设置 ──────────────────────────────────────────────
AGENT_DIR = Path(__file__).parent.parent.resolve()
SYS_PATH = str(AGENT_DIR)
if SYS_PATH not in sys.path:
    sys.path.insert(0, SYS_PATH)

# ── 日志配置 ──────────────────────────────────────────────
LOG_DIR = Path.home() / ".beehive"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "agent.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("desktop_agent")


# ── 异常定义 ──────────────────────────────────────────────

class AgentConfigError(Exception):
    """配置错误"""
    pass


class AgentAPIError(Exception):
    """API 请求错误"""
    pass


class AgentExecutionError(Exception):
    """任务执行错误"""
    pass


# ── 配置加载 ──────────────────────────────────────────────

DEFAULT_CONFIG_PATH = Path.home() / ".beehive" / "config.json"


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """加载配置文件"""
    path = Path(config_path) if config_path else DEFAULT_CONFIG_PATH

    if not path.exists():
        raise AgentConfigError(f"配置文件不存在: {path}\n"
                                f"请创建配置文件或使用命令行参数")

    try:
        with open(path, "r", encoding="utf-8") as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        raise AgentConfigError(f"配置文件 JSON 格式错误: {e}")

    # 验证必需字段
    required = ["api_base_url", "api_key"]
    for field in required:
        if not config.get(field):
            raise AgentConfigError(f"配置文件缺少必需字段: {field}")

    # 填充默认值
    config.setdefault("poll_interval", 30)
    config.setdefault("worker_id", f"desktop-{os.environ.get('HOSTNAME', 'unknown')}")

    return config


def merge_cli_config(config: Dict[str, Any], args) -> Dict[str, Any]:
    """合并命令行参数到配置（命令行优先级更高）"""
    if args.api_base:
        config["api_base_url"] = args.api_base.rstrip("/")
    if args.api_key:
        config["api_key"] = args.api_key
    if args.poll_interval is not None:
        config["poll_interval"] = args.poll_interval
    if args.worker_id:
        config["worker_id"] = args.worker_id
    return config


# ── API 客户端 ────────────────────────────────────────────

_session = requests.Session()
_session.headers.update({"Content-Type": "application/json"})


def api_request(method: str, path: str, base_url: str, api_key: str,
                data: Optional[Dict] = None, retry: int = 3,
                retry_delay: float = 5.0) -> Dict[str, Any]:
    """
    发送 API 请求，带重试机制

    Args:
        method: HTTP 方法
        path: API 路径（相对于 base_url）
        base_url: API 基础 URL
        api_key: API 密钥
        data: 请求体数据
        retry: 重试次数
        retry_delay: 重试间隔（秒）

    Returns:
        响应 JSON 数据

    Raises:
        AgentAPIError: API 请求失败
    """
    url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    headers = {"X-API-Key": api_key}

    for attempt in range(retry + 1):
        try:
            if method.upper() == "GET":
                resp = _session.get(url, headers=headers, params=data or {}, timeout=30)
            elif method.upper() == "POST":
                resp = _session.post(url, headers=headers, json=data, timeout=60)
            elif method.upper() == "PATCH":
                resp = _session.patch(url, headers=headers, json=data, timeout=30)
            else:
                raise ValueError(f"不支持的 HTTP 方法: {method}")

            resp.raise_for_status()
            return resp.json()

        except requests.exceptions.ConnectionError as e:
            logger.warning(f"[{attempt+1}/{retry+1}] 连接失败: {e}")
            if attempt < retry:
                logger.info(f"等待 {retry_delay}s 后重试...")
                time.sleep(retry_delay)
            else:
                raise AgentAPIError(f"无法连接到服务器: {url}")

        except requests.exceptions.Timeout as e:
            logger.warning(f"[{attempt+1}/{retry+1}] 请求超时: {e}")
            if attempt < retry:
                time.sleep(retry_delay)
            else:
                raise AgentAPIError(f"请求超时: {url}")

        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP 错误: {e.response.status_code} - {e.response.text}")
            raise AgentAPIError(f"API 错误 {e.response.status_code}: {e.response.text}")

        except requests.exceptions.RequestException as e:
            logger.error(f"请求异常: {e}")
            raise AgentAPIError(f"请求失败: {e}")

    raise AgentAPIError(f"API 请求失败，已重试 {retry} 次")


# ── 后端交互 ─────────────────────────────────────────────

def register_agent(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    启动时向 SaaS 后端注册自己

    POST /api/v1/agents/status
    """
    try:
        result = api_request("GET", "/api/v1/agents/status",
                             config["api_base_url"], config["api_key"])
        logger.info(f"✅ 后端连接成功: {result.get('service', 'Unknown')}")
        logger.info(f"   - 版本: {result.get('version', 'N/A')}")
        logger.info(f"   - 租户: {result.get('tenant_name', 'N/A')} ({result.get('tenant_id', 'N/A')})")
        logger.info(f"   - 套餐: {result.get('tenant_plan', 'N/A')}")
        return result
    except AgentAPIError as e:
        logger.error(f"❌ 后端连接失败: {e}")
        raise


def poll_pending_tasks(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    轮询待执行任务

    GET /api/v1/automations/tasks?status=pending
    """
    try:
        result = api_request("GET", "/api/v1/automations/tasks",
                             config["api_base_url"], config["api_key"],
                             data={"status": "pending", "limit": 20})
        tasks = result.get("tasks", [])
        return tasks
    except AgentAPIError as e:
        logger.error(f"轮询任务失败: {e}")
        return []


def report_task_result(config: Dict[str, Any], task_id: str,
                       status: str, result: Optional[Dict] = None) -> bool:
    """
    上报任务执行结果

    PATCH /api/v1/automations/tasks/{task_id}
    """
    try:
        payload = {"status": status}
        if result:
            payload["result"] = result

        api_request("PATCH", f"/api/v1/automations/tasks/{task_id}",
                    config["api_base_url"], config["api_key"], data=payload)
        return True
    except AgentAPIError as e:
        logger.error(f"上报任务结果失败: {e}")
        return False


# ── 任务执行 ──────────────────────────────────────────────

def execute_task(task: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    执行单个任务

    Args:
        task: 任务数据（来自后端）
        config: 代理配置

    Returns:
        执行结果 {"status": "completed"|"failed", "result": {...}, "error": str|None}
    """
    task_id = task.get("id", "unknown")
    action = task.get("action", "")
    account_id = task.get("account_id")

    logger.info(f"执行任务 [{task_id}]: action={action}, account_id={account_id}")

    # 懒加载 agent_executor（避免启动时就依赖 BeehiveBrowser）
    try:
        from saas.services import agent_executor
    except ImportError as e:
        logger.error(f"无法导入 agent_executor: {e}")
        return {"status": "failed", "error": f"导入失败: {e}"}

    try:
        if action == "post":
            return execute_post_task(task, config, agent_executor)
        elif action == "login":
            return execute_login_task(task, config, agent_executor)
        elif action == "check":
            return execute_check_task(task, config, agent_executor)
        else:
            logger.warning(f"未知任务类型: {action}")
            return {"status": "failed", "error": f"不支持的任务类型: {action}"}

    except agent_executor.LoginError as e:
        logger.error(f"登录失败 [{task_id}]: {e}")
        return {"status": "failed", "error": f"登录失败: {e}"}
    except agent_executor.PostError as e:
        logger.error(f"发布失败 [{task_id}]: {e}")
        return {"status": "failed", "error": f"发布失败: {e}"}
    except agent_executor.NetworkError as e:
        logger.error(f"网络错误 [{task_id}]: {e}")
        return {"status": "failed", "error": f"网络错误: {e}"}
    except Exception as e:
        logger.error(f"执行异常 [{task_id}]: {e}")
        return {"status": "failed", "error": f"执行异常: {e}"}


def execute_post_task(task: Dict[str, Any], config: Dict[str, Any],
                      agent_executor) -> Dict[str, Any]:
    """执行发推任务"""
    account_id = task.get("account_id")
    params = task.get("params", {}) or {}
    profile_id = task.get("profile_id") or params.get("cloak_profile_id")

    if not profile_id:
        # 尝试从 account_id 获取已登录的 profile
        profile_id = find_logged_in_profile(config, account_id)
        if not profile_id:
            return {"status": "failed", "error": "未找到已登录的浏览器Profile，请先执行登录任务"}

    content = params.get("content", "")
    media_urls = params.get("media_urls")

    if not content:
        return {"status": "failed", "error": "缺少发布内容"}

    # 获取账号信息（用于日志）
    account_info = get_account_info(config, account_id)
    username = account_info.get("username", "unknown") if account_info else "unknown"
    platform = account_info.get("platform", "twitter") if account_info else "twitter"

    logger.info(f"发布内容到 @{username} ({platform})")

    result = agent_executor.post_content(
        username=username,
        platform=platform,
        content=content,
        cloak_profile_id=profile_id,
        media_urls=media_urls,
    )

    return {
        "status": "completed",
        "result": {
            "post_url": result.get("post_url"),
            "post_id": result.get("post_id"),
            "platform": platform,
            "executed_at": datetime.now(timezone.utc).isoformat(),
        }
    }


def execute_login_task(task: Dict[str, Any], config: Dict[str, Any],
                        agent_executor) -> Dict[str, Any]:
    """执行登录任务"""
    account_id = task.get("account_id")
    params = task.get("params", {}) or {}

    # 获取账号详情
    account_info = get_account_info(config, account_id)
    if not account_info:
        return {"status": "failed", "error": f"账号不存在: {account_id}"}

    username = account_info.get("username")
    password = account_info.get("password")
    platform = account_info.get("platform", "twitter")
    proxy_url = params.get("proxy_url")

    if not username or not password:
        return {"status": "failed", "error": "账号缺少用户名或密码"}

    logger.info(f"登录账号 @{username} ({platform})")

    result = agent_executor.login_account(
        username=username,
        password=password,
        platform=platform,
        proxy_url=proxy_url,
        headless=False,  # 桌面端可见，方便调试
    )

    return {
        "status": "completed",
        "result": {
            "cloak_profile_id": result.get("cloak_profile_id"),
            "vnc_url": result.get("vnc_url"),
            "platform": platform,
            "executed_at": datetime.now(timezone.utc).isoformat(),
        }
    }


def execute_check_task(task: Dict[str, Any], config: Dict[str, Any],
                       agent_executor) -> Dict[str, Any]:
    """执行 IP 检测任务"""
    params = task.get("params", {}) or {}
    proxy_url = params.get("proxy_url")

    if not proxy_url:
        return {"status": "failed", "error": "缺少代理 URL"}

    logger.info(f"检测代理 IP: {proxy_url}")

    result = agent_executor.check_ip(proxy_url)

    return {
        "status": "completed",
        "result": {
            "reachable": result.get("reachable"),
            "exit_ip": result.get("exit_ip"),
            "latency_ms": result.get("latency_ms"),
            "executed_at": datetime.now(timezone.utc).isoformat(),
        }
    }


def get_account_info(config: Dict[str, Any], account_id: str) -> Optional[Dict[str, Any]]:
    """获取账号详情（含解密密码）"""
    try:
        return api_request("GET", f"/api/v1/agents/accounts/{account_id}",
                          config["api_base_url"], config["api_key"],
                          data={"decrypt": "true"})
    except AgentAPIError as e:
        logger.error(f"获取账号信息失败: {e}")
        return None


def find_logged_in_profile(config: Dict[str, Any], account_id: str) -> Optional[str]:
    """查找账号关联的已登录 BrowserProfile"""
    # 这里简化处理，实际应该查询后端获取 profile_id
    # 暂时通过查询账号详情中的 notes 字段获取
    account_info = get_account_info(config, account_id)
    if account_info and account_info.get("notes"):
        try:
            notes = json.loads(account_info["notes"])
            # notes 中可能包含 profile 信息
            return notes.get("cloak_profile_id")
        except json.JSONDecodeError:
            pass
    return None


# ── 主循环 ────────────────────────────────────────────────

class DesktopAgent:
    """桌面端代理"""

    def __init__(self, config: Dict[str, Any], run_once: bool = False):
        self.config = config
        self.run_once = run_once
        self.running = False
        self.worker_id = config.get("worker_id", "unknown")
        self.poll_interval = config.get("poll_interval", 30)

        # 注册信号处理器
        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)

    def _handle_shutdown(self, signum, frame):
        """处理优雅退出"""
        logger.info(f"收到信号 {signum}，准备关闭...")
        self.running = False

    def start(self):
        """启动代理"""
        logger.info("=" * 50)
        logger.info("蜂巢桌面代理启动")
        logger.info("=" * 50)
        logger.info(f"Worker ID: {self.worker_id}")
        logger.info(f"API URL: {self.config['api_base_url']}")
        logger.info(f"轮询间隔: {self.poll_interval}s")
        logger.info(f"日志文件: {LOG_FILE}")
        logger.info("=" * 50)

        # 连接后端
        try:
            self._connect()
        except Exception as e:
            logger.error(f"启动失败: {e}")
            sys.exit(1)

        self.running = True
        logger.info("✅ 代理运行中，按 Ctrl+C 退出")

        # 主循环
        while self.running:
            try:
                self._poll_and_execute()
            except AgentAPIError as e:
                logger.error(f"API 错误: {e}")
                logger.info(f"等待 {self.poll_interval}s 后重试...")
                time.sleep(self.poll_interval)
            except Exception as e:
                logger.error(f"未知错误: {e}")
                time.sleep(self.poll_interval)

            if self.run_once:
                logger.info("单次模式执行完成，退出")
                break

        logger.info("代理已停止")

    def _connect(self):
        """连接后端并注册"""
        logger.info("正在连接后端...")
        info = register_agent(self.config)
        self.backend_info = info

    def _poll_and_execute(self):
        """轮询并执行任务"""
        tasks = poll_pending_tasks(self.config)

        if not tasks:
            logger.debug(f"当前无待执行任务，等待 {self.poll_interval}s")
            time.sleep(self.poll_interval)
            return

        logger.info(f"发现 {len(tasks)} 个待执行任务")

        for task in tasks:
            if not self.running:
                break

            task_id = task.get("id")
            action = task.get("action", "unknown")

            logger.info(f"处理任务: [{task_id}] {action}")

            # 更新任务状态为 running
            report_task_result(self.config, task_id, "running")

            # 执行任务
            result = execute_task(task, self.config)

            # 上报结果
            status = result.get("status", "failed")
            task_result = result.get("result")
            error = result.get("error")

            if status == "completed":
                logger.info(f"✅ 任务完成 [{task_id}]: {task_result}")
                report_task_result(self.config, task_id, "completed", task_result)
            else:
                logger.error(f"❌ 任务失败 [{task_id}]: {error}")
                report_task_result(self.config, task_id, "failed",
                                   {"error": error})


# ── 命令行入口 ────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description="蜂巢桌面端后台代理",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例：
  python desktop_agent.py                          # 使用默认配置
  python desktop_agent.py --config /path/to/config.json
  python desktop_agent.py --api-base http://192.168.31.225:8000 --api-key bee_xxx
  python desktop_agent.py --poll-interval 60 --once   # 每60秒轮询，执行一次

配置文件 ~/.beehive/config.json：
  {
    "api_base_url": "http://192.168.31.225:8000",
    "api_key": "bee_xxx",
    "poll_interval": 30,
    "worker_id": "desktop-01"
  }
"""
    )
    parser.add_argument("--config", type=str,
                        help="配置文件路径 (默认: ~/.beehive/config.json)")
    parser.add_argument("--api-base", type=str,
                        help="API 基础 URL (覆盖配置文件)")
    parser.add_argument("--api-key", type=str,
                        help="API 密钥 (覆盖配置文件)")
    parser.add_argument("--poll-interval", type=int,
                        help="轮询间隔秒数 (覆盖配置文件)")
    parser.add_argument("--worker-id", type=str,
                        help="Worker ID (覆盖配置文件)")
    parser.add_argument("--once", action="store_true",
                        help="单次模式：轮询一次后退出")
    parser.add_argument("--debug", action="store_true",
                        help="启用调试日志")

    return parser.parse_args()


def main():
    args = parse_args()

    # 调试模式
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.setLevel(logging.DEBUG)

    # 加载配置
    try:
        config = load_config(args.config)
        config = merge_cli_config(config, args)
    except AgentConfigError as e:
        print(f"配置错误: {e}", file=sys.stderr)
        sys.exit(1)

    logger.info("配置加载完成")
    logger.info(f"  API URL: {config['api_base_url']}")
    logger.info(f"  Worker: {config['worker_id']}")
    logger.info(f"  轮询间隔: {config['poll_interval']}s")

    # 启动代理
    agent = DesktopAgent(config, run_once=args.once)
    agent.start()


if __name__ == "__main__":
    main()
