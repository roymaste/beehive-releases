#!/usr/bin/env python3
"""
种子数据脚本 - 初始化测试用户/账号/代理数据方便演示

运行: cd /home/joyandjoe/beehive-agent && python3 scripts/seed_data.py
"""
import sys
import os
import requests
import json

# 确保能导入项目模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# API 基础地址
BASE = "http://127.0.0.1:8000"

# 测试用户配置
TEST_EMAIL = "seed@demo.com"
TEST_PASSWORD = "seed123"
TEST_NAME = "Seed Demo User"
TEST_COMPANY = "Seed Demo Corp"

# 彩色输出
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def step_print(step_num, title, color=Colors.CYAN):
    """打印步骤标题"""
    print(f"\n{color}{'='*60}{Colors.ENDC}")
    print(f"{color}  STEP {step_num}: {title}{Colors.ENDC}")
    print(f"{color}{'='*60}{Colors.ENDC}")


def info_print(msg, color=Colors.BLUE):
    """打印信息"""
    print(f"{color}  → {msg}{Colors.ENDC}")


def success_print(msg):
    """打印成功信息"""
    print(f"{Colors.GREEN}  ✓ {msg}{Colors.ENDC}")


def warn_print(msg):
    """打印警告信息"""
    print(f"{Colors.YELLOW}  ⚠ {msg}{Colors.ENDC}")


def error_print(msg):
    """打印错误信息"""
    print(f"{Colors.RED}  ✗ {msg}{Colors.ENDC}")


def api_call(method, endpoint, data=None, headers=None, expected_status=None):
    """发送API请求并打印结果
    
    Returns:
        tuple: (response_data, error_type) where error_type is None on success
    """
    url = f"{BASE}{endpoint}"
    try:
        if method.upper() == "GET":
            resp = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == "POST":
            resp = requests.post(url, json=data, headers=headers, timeout=10)
        elif method.upper() == "PUT":
            resp = requests.put(url, json=data, headers=headers, timeout=10)
        elif method.upper() == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")

        # 打印响应
        print(f"    Status: {resp.status_code}")
        try:
            resp_data = resp.json()
            print(f"    Response: {json.dumps(resp_data, indent=4, ensure_ascii=False)}")
        except Exception:
            print(f"    Response: {resp.text[:200]}")
            resp_data = None
        if expected_status and resp.status_code != expected_status:
            if resp.status_code == 400 and resp_data and "already" in str(resp_data).lower():
                return None, "already_exists"
            error_print(f"Expected status {expected_status}, got {resp.status_code}")
            return resp_data, "error"

        # 2xx 是成功
        if resp.status_code >= 200 and resp.status_code < 300:
            return resp_data, None
        
        # 其他状态码视为错误
        return resp_data, "error"

    except requests.exceptions.ConnectionError:
        error_print(f"无法连接到 {url}，请确保后端服务正在运行")
        return None, "connection_error"
    except Exception as e:
        error_print(f"请求失败: {e}")
        return None, "error"


def main():
    print(f"\n{Colors.BOLD}{Colors.HEADER}{' '*15}种子数据初始化脚本{' '*20}{Colors.ENDC}")
    print(f"{Colors.HEADER}{'='*60}{Colors.ENDC}")
    info_print(f"后端地址: {BASE}")
    info_print(f"测试邮箱: {TEST_EMAIL}")

    # ── 检查后端状态 ──
    step_print(0, "检查后端服务状态")
    resp = requests.get(f"{BASE}/health", timeout=5)
    if resp.status_code == 200:
        success_print("后端服务运行正常")
    else:
        error_print("后端服务未正常运行")
        sys.exit(1)

    # ── Step 1: 发送验证码 ──
    step_print(1, "发送邮箱验证码")
    info_print(f"邮箱: {TEST_EMAIL}")
    resp_data, status = api_call(
        "POST",
        "/api/v1/auth/send-code",
        data={"email": TEST_EMAIL}
    )

    if status == "connection_error":
        sys.exit(1)

    if status == "error" and resp_data is None:
        # 可能已注册，尝试直接登录
        warn_print("发送验证码失败，尝试直接登录...")
    else:
        dev_code = resp_data.get("dev_code") if resp_data else None
        if dev_code:
            success_print(f"获取到验证码: {dev_code}")
        else:
            error_print("未获取到验证码")

    # ── Step 2: 注册用户 ──
    step_print(2, "注册测试用户")
    info_print(f"邮箱: {TEST_EMAIL}")
    info_print(f"密码: {TEST_PASSWORD}")

    # 先尝试登录看是否已注册
    resp_login, login_status = api_call(
        "POST",
        "/api/v1/auth/tenant-login",
        data={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )

    jwt_token = None
    api_key = None
    tenant_id = None

    if login_status is None and resp_login:
        # 用户已存在，直接登录成功 (login_status=None 表示成功)
        success_print("用户已存在，登录成功")
        jwt_token = resp_login.get("access_token")
        # login 返回的 api_keys 在 top level (不是数组)
        api_key = resp_login.get("api_key") or (resp_login.get("api_keys", [{}])[0].get("api_key") if resp_login.get("api_keys") else None)
        tenant_id = resp_login.get("tenant_id")
    else:
        # 需要注册
        info_print("用户不存在，需要注册...")

        # 如果没有验证码，重新获取
        if not dev_code:
            resp_data, _ = api_call("POST", "/api/v1/auth/send-code", data={"email": TEST_EMAIL})
            dev_code = resp_data.get("dev_code") if resp_data else None

        if dev_code:
            success_print(f"使用验证码: {dev_code}")
        else:
            # 开发模式下可能直接使用固定验证码
            dev_code = "123456"
            warn_print("使用默认验证码: 123456 (开发模式)")

        resp_data, status = api_call(
            "POST",
            "/api/v1/auth/register",
            data={
                "name": TEST_NAME,
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "verification_code": dev_code,
                "company": TEST_COMPANY,
                "agreed_to_terms": True
            },
            expected_status=201
        )

        if resp_data:
            success_print("注册成功!")
            jwt_token = resp_data.get("access_token")
            api_key = resp_data.get("api_key")
            tenant_id = resp_data.get("tenant_id")
        else:
            if status == "already_exists":
                warn_print("用户已注册，尝试登录...")
                resp_login, login_status = api_call(
                    "POST",
                    "/api/v1/auth/tenant-login",
                    data={"email": TEST_EMAIL, "password": TEST_PASSWORD}
                )
                if login_status is None and resp_login:
                    success_print("登录成功")
                    jwt_token = resp_login.get("access_token")
                    api_key = resp_login.get("api_key") or (resp_login.get("api_keys", [{}])[0].get("api_key") if resp_login.get("api_keys") else None)
                    tenant_id = resp_login.get("tenant_id")
                else:
                    error_print("登录失败")
                    sys.exit(1)

    # 验证获取到必要信息
    if not jwt_token:
        error_print("无法获取 JWT Token")
        sys.exit(1)

    success_print(f"JWT Token 获取成功: {jwt_token[:30]}...")
    if api_key:
        success_print(f"API Key: {api_key}")
    if tenant_id:
        success_print(f"Tenant ID: {tenant_id}")

    # 设置认证头
    auth_headers = {"Authorization": f"Bearer {jwt_token}"}
    if api_key:
        auth_headers["X-API-Key"] = api_key

    # ── Step 3: 获取 API Key ──
    step_print(3, "获取 API Key")
    resp_data, status = api_call(
        "GET",
        "/api/v1/agents/api-keys",
        headers=auth_headers
    )

    if resp_data and "api_keys" in resp_data:
        keys = resp_data["api_keys"]
        if not api_key and keys:
            # 注意: GET api-keys 只返回 key_prefix，不返回完整 key
            # 完整 key 只在注册时返回一次
            key_prefix = keys[0].get("key_prefix", "N/A")
            api_key_id = keys[0].get("id", "N/A")
            success_print(f"API Key ID: {api_key_id}")
            success_print(f"API Key Prefix: {key_prefix}")
            warn_print("完整 API Key 仅在首次注册时返回，请查看首次运行的输出")
        success_print(f"共 {len(keys)} 个 API Key")
    elif resp_data and "items" in resp_data:
        keys = resp_data["items"]
        if not api_key and keys:
            key_prefix = keys[0].get("key_prefix", "N/A")
            api_key_id = keys[0].get("id", "N/A")
            success_print(f"API Key ID: {api_key_id}")
            success_print(f"API Key Prefix: {key_prefix}")
            warn_print("完整 API Key 仅在首次注册时返回，请查看首次运行的输出")
        success_print(f"共 {len(keys)} 个 API Key")
    elif resp_data and "total" in resp_data:
        success_print(f"API Keys 总数: {resp_data['total']}")

    # ── Step 4: 添加测试 Twitter 账号 ──
    step_print(4, "添加测试 Twitter 账号")
    info_print("platform: twitter")
    info_print("username: @test_seed")

    resp_data, status = api_call(
        "POST",
        "/api/v1/accounts",
        headers=auth_headers,
        data={
            "platform": "twitter",
            "account_username": "@test_seed",
            "account_password": "seed_password_123",
            "account_email": "test_seed@demo.com",
            "notes": "Seed data - 测试账号"
        }
    )

    account_id = None
    if resp_data and "account" in resp_data:
        account_id = resp_data["account"].get("id")
        success_print(f"账号创建成功: {account_id}")
    elif resp_data:
        account_id = resp_data.get("id")
        if account_id:
            success_print(f"账号创建成功: {account_id}")
        else:
            warn_print(f"账号响应: {json.dumps(resp_data, ensure_ascii=False)}")

    # ── Step 5: 添加测试代理 IP ──
    step_print(5, "添加测试代理 IP")
    info_print("server: 127.0.0.1")
    info_print("port: 1080")
    info_print("protocol: socks5")

    resp_data, status = api_call(
        "POST",
        "/api/v1/proxies",
        headers=auth_headers,
        data={
            "type": "purchased",
            "provider": "miyaip",
            "protocol": "socks5",
            "server": "127.0.0.1",
            "port": "1080",
            "location": "US",
            "notes": "Seed data - 测试代理"
        }
    )

    proxy_id = None
    if resp_data and "proxy" in resp_data:
        proxy_id = resp_data["proxy"].get("id")
        success_print(f"代理创建成功: {proxy_id}")
    elif resp_data:
        proxy_id = resp_data.get("id")
        if proxy_id:
            success_print(f"代理创建成功: {proxy_id}")
        else:
            warn_print(f"代理响应: {json.dumps(resp_data, ensure_ascii=False)}")

    # ── Step 6: 验证账号列表 ──
    step_print(6, "验证账号列表")
    resp_data, status = api_call(
        "GET",
        "/api/v1/agents/accounts",
        headers=auth_headers
    )

    if resp_data and "accounts" in resp_data:
        accounts = resp_data["accounts"]
        success_print(f"账号列表: 共 {len(accounts)} 个账号")
        for acc in accounts:
            username = acc.get('username') or acc.get('account_username') or acc.get('account_email', 'N/A')
            info_print(f"  - {acc.get('platform', 'unknown')}: {username}")
    elif resp_data and "items" in resp_data:
        accounts = resp_data["items"]
        success_print(f"账号列表: 共 {len(accounts)} 个账号")
        for acc in accounts:
            username = acc.get('username') or acc.get('account_username') or acc.get('account_email', 'N/A')
            info_print(f"  - {acc.get('platform', 'unknown')}: {username}")

    # ── Step 7: 验证代理列表 ──
    step_print(7, "验证代理列表")
    resp_data, status = api_call(
        "GET",
        "/api/v1/agents/ips",
        headers=auth_headers
    )

    if resp_data and "proxies" in resp_data:
        proxies = resp_data["proxies"]
        success_print(f"代理列表: 共 {len(proxies)} 个代理")
        for pxy in proxies:
            info_print(f"  - {pxy.get('protocol')}://{pxy.get('server')}:{pxy.get('port')}")
    elif resp_data and "items" in resp_data:
        proxies = resp_data["items"]
        success_print(f"代理列表: 共 {len(proxies)} 个代理")
        for pxy in proxies:
            info_print(f"  - {pxy.get('protocol')}://{pxy.get('server')}:{pxy.get('port')}")

    # ── 完成 ──
    print(f"\n{Colors.GREEN}{'='*60}{Colors.ENDC}")
    print(f"{Colors.GREEN}{Colors.BOLD}  ✅ 种子数据初始化完成!{Colors.ENDC}")
    print(f"{Colors.GREEN}{'='*60}{Colors.ENDC}")
    print(f"\n{Colors.BOLD}测试账号信息:{Colors.ENDC}")
    info_print(f"邮箱: {TEST_EMAIL}")
    info_print(f"密码: {TEST_PASSWORD}")
    if api_key:
        info_print(f"API Key: {api_key}")
    if tenant_id:
        info_print(f"Tenant ID: {tenant_id}")
    print()

    # 保存到文件
    env_file = os.path.join(os.path.dirname(__file__), "seed_data.env")
    with open(env_file, "w") as f:
        f.write("# 种子数据环境变量\n")
        f.write(f"SEED_EMAIL={TEST_EMAIL}\n")
        f.write(f"SEED_PASSWORD={TEST_PASSWORD}\n")
        f.write(f"SEED_API_KEY={api_key or ''}\n")
        f.write(f"SEED_TENANT_ID={tenant_id or ''}\n")
        f.write(f"SEED_JWT_TOKEN={jwt_token}\n")
    success_print(f"账号信息已保存到: {env_file}")


if __name__ == "__main__":
    main()
